import { useEffect, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, DoorOpen, Plus } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { Card, CardBody } from '@/components/common/Card'
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { RoomDetailsDialog } from '@/components/rooms/RoomDetailsDialog'
import { RoomFormDialog } from '@/components/rooms/RoomFormDialog'
import { useAuth } from '@/hooks/useAuth'
import {
  createRoom,
  fetchRoom,
  fetchRooms,
  updateRoom,
  updateRoomStatus,
} from '@/services/api/rooms'
import type {
  Room,
  RoomDetail,
  RoomInput,
  RoomPagination,
  RoomStatus,
} from '@/types/room'
import { getApiErrorMessage, getApiFieldErrors } from '@/utils/apiError'

function formatRoomType(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase())
}

function roomLocation(room: Room): string {
  const floor = room.floor
    ? `${room.floor}${/^\d+$/.test(room.floor) ? ordinalSuffix(Number(room.floor)) : ''} Floor`
    : null

  return [room.code, floor, room.building]
    .filter(Boolean)
    .join(', ') || 'Location not specified'
}

function ordinalSuffix(value: number): string {
  const remainder = value % 100
  if (remainder >= 11 && remainder <= 13) return 'th'

  switch (value % 10) {
    case 1: return 'st'
    case 2: return 'nd'
    case 3: return 'rd'
    default: return 'th'
  }
}

function isCurrentOccupancy(room: Room): boolean {
  const occupancy = room.occupancy
  if (!occupancy || occupancy.checked_out_at || occupancy.class_date !== localDate()) return false

  const now = new Date()
  const start = occupancy.scheduled_start_at ? new Date(occupancy.scheduled_start_at) : null
  const end = occupancy.scheduled_end_at ? new Date(occupancy.scheduled_end_at) : null

  return start !== null && end !== null && now >= start && now < end
}

function localDate(): string {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function RoomsPage() {
  const { user } = useAuth()
  const canManage = user?.role === 'administrator' || user?.role === 'department_personnel'
  const canManageQr = user?.role === 'administrator'
  const [rooms, setRooms] = useState<Room[]>([])
  const [pagination, setPagination] = useState<RoomPagination>({
    current_page: 1,
    last_page: 1,
    per_page: 25,
    total: 0,
  })
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [dialogRoom, setDialogRoom] = useState<Room | null | undefined>(undefined)
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null)
  const [detailsRoom, setDetailsRoom] = useState<RoomDetail | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [busyRoomId, setBusyRoomId] = useState<number | null>(null)
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [detailVersion, setDetailVersion] = useState(0)
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string
    description?: string
    confirmLabel: string
    cancelLabel: string
    destructive: boolean
    onConfirm: () => void | Promise<void>
  } | null>(null)

  useEffect(() => {
    let active = true
    void Promise.resolve().then(async () => {
      setIsLoading(true)
      setError(null)
      try {
        const result = await fetchRooms({
          page,
          per_page: 25,
        })
        if (active) {
          setRooms(result.rooms)
          setPagination(result.pagination)
        }
      } catch (failure) {
        if (active) setError(getApiErrorMessage(failure, 'Unable to load rooms.'))
      } finally {
        if (active) setIsLoading(false)
      }
    })
    return () => {
      active = false
    }
  }, [page, refreshVersion])

  useEffect(() => {
    if (selectedRoomId === null) return

    let active = true
    void Promise.resolve().then(async () => {
      try {
        const result = await fetchRoom(selectedRoomId)
        if (active) {
          setDetailsRoom(result)
          setDetailError(null)
        }
      } catch (failure) {
        if (active) setDetailError(getApiErrorMessage(failure, 'Unable to load room details.'))
      } finally {
        if (active) setIsDetailLoading(false)
      }
    })
    return () => {
      active = false
    }
  }, [detailVersion, selectedRoomId])

  function refreshDetails() {
    setIsDetailLoading(true)
    setDetailVersion((version) => version + 1)
  }

  function openDetails(room: Room) {
    setDetailsRoom(null)
    setDetailError(null)
    setIsDetailLoading(true)
    setSelectedRoomId(room.id)
  }

  function closeDetails() {
    setSelectedRoomId(null)
    setDetailsRoom(null)
    setDetailError(null)
    setIsDetailLoading(false)
  }

  async function handleSave(payload: RoomInput) {
    if (dialogRoom) {
      await updateRoom(dialogRoom.id, payload)
      setSuccess('Room changes saved.')
    } else {
      await createRoom(payload)
      setSuccess('Room created.')
      setPage(1)
    }

    setDialogRoom(undefined)
    setRefreshVersion((version) => version + 1)
    if (selectedRoomId !== null) refreshDetails()
  }

  async function handleStatusChange(room: Room) {
    const nextStatus: RoomStatus = room.status === 'available' ? 'unavailable' : 'available'
    const action = nextStatus === 'available' ? 'activate' : 'deactivate'
    const message = nextStatus === 'available'
      ? `Activate ${room.code}? It will become available for new schedule allocations.`
      : `Deactivate ${room.code}? It will no longer be available for new schedules, and active allocations must be released first.`

    setConfirmDialog({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} room`,
      description: message,
      confirmLabel: `${action.charAt(0).toUpperCase() + action.slice(1)} room`,
      cancelLabel: 'Cancel',
      destructive: nextStatus === 'unavailable',
      onConfirm: async () => {
        setConfirmDialog(null)
        setBusyRoomId(room.id)
        setError(null)
        setDetailError(null)
        setSuccess(null)

        try {
          await updateRoomStatus(room.id, nextStatus)
          setSuccess(`${room.code} was ${action}d.`)
          setRefreshVersion((version) => version + 1)
          if (selectedRoomId === room.id) refreshDetails()
        } catch (failure) {
      const message = getApiFieldErrors(failure).status?.[0]
        ?? getApiErrorMessage(failure, 'Unable to update room status.')
      if (selectedRoomId === room.id) setDetailError(message)
      else setError(message)
    } finally {
      setBusyRoomId(null)
    }
  },
})
}

  return (
    <>
      <PageHeader
        eyebrow="Academic structure"
        title="Room inventory"
        description="Track classrooms, laboratories, capacity, and availability for the College of Computer Studies."
        actions={canManage ? (
          <Button leftIcon={<Plus className="size-4" aria-hidden="true" />} onClick={() => setDialogRoom(null)}>
            Add room
          </Button>
        ) : null}
      />

      {success ? (
        <div role="status" className="mb-5 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
          <Check className="size-4" aria-hidden="true" />
          {success}
          <button type="button" className="ml-auto text-xs font-semibold underline" onClick={() => setSuccess(null)}>
            Dismiss
          </button>
        </div>
      ) : null}

      <Card>
        <CardBody>
          {error ? (
            <div role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p>{error}</p>
              <Button className="mt-3" size="sm" variant="outline" onClick={() => setRefreshVersion((version) => version + 1)}>
                Retry
              </Button>
            </div>
          ) : isLoading ? (
            <div className="py-16 text-center text-sm text-ink-muted" role="status">
              Loading rooms…
            </div>
          ) : rooms.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                icon={DoorOpen}
                title="No rooms found"
                description="Create the first room to start building the schedule inventory."
              />
            </div>
          ) : (
            <>
              <div className="mt-5 overflow-x-auto rounded-lg border border-line">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-stone-50 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    <tr>
                      <th className="px-3 py-3 sm:px-4">Room</th>
                      <th className="px-3 py-3 sm:px-4">Location</th>
                      <th className="px-3 py-3 sm:px-4">Capacity</th>
                      <th className="px-3 py-3 sm:px-4">Type</th>
                      <th className="px-3 py-3 sm:px-4">Current Schedule</th>
                      <th className="px-3 py-3 text-right sm:px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {rooms.map((room) => (
                      <tr key={room.id} className="align-top">
                        <td className="px-3 py-3 sm:px-4 sm:py-4">
                          <p className="font-semibold text-ink">{room.name}</p>
                          <p className="mt-0.5 text-xs text-ink-muted">{room.code}</p>
                        </td>
                        <td className="px-3 py-3 text-ink-muted sm:px-4 sm:py-4">{roomLocation(room)}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-ink-muted sm:px-4 sm:py-4">{room.capacity} seats</td>
                        <td className="px-3 py-3 text-ink-muted sm:px-4 sm:py-4">{formatRoomType(room.room_type)}</td>
                        <td className="px-3 py-3 text-xs text-ink-muted sm:px-4 sm:py-4">
                          {isCurrentOccupancy(room) && room.occupancy ? (
                            <>
                              <p className="font-semibold text-ink">{room.occupancy.subject?.code ?? 'Class'} · {room.occupancy.section?.code ?? 'Section'}</p>
                              <p>{room.occupancy.professor.name ?? 'Professor'} · checked in {room.occupancy.checked_in_at ? new Date(room.occupancy.checked_in_at).toLocaleTimeString() : '—'}</p>
                              <p>Scheduled until {room.occupancy.scheduled_end_at ? new Date(room.occupancy.scheduled_end_at).toLocaleTimeString() : '—'}</p>
                            </>
                          ) : room.availability_status === 'reserved' && room.scheduled ? (
                            <>
                              <p className="font-semibold text-ink">{room.scheduled.subject?.code ?? 'Class'} · {room.scheduled.section?.code ?? 'Section'}</p>
                              <p>{room.scheduled.professor ?? 'Professor'} · {room.scheduled.starts_at?.slice(0, 5) ?? '—'}–{room.scheduled.ends_at?.slice(0, 5) ?? '—'}</p>
                            </>
                          ) : <p>No current class</p>}
                        </td>
                        <td className="px-3 py-3 sm:px-4 sm:py-4">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => openDetails(room)}>
                              View
                            </Button>
                            {canManage ? (
                              <>
                                <Button size="sm" variant="outline" onClick={() => setDialogRoom(room)}>
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant={room.status === 'available' ? 'outline' : 'secondary'}
                                  isLoading={busyRoomId === room.id}
                                  onClick={() => void handleStatusChange(room)}
                                >
                                  {room.status === 'available' ? 'Deactivate' : 'Activate'}
                                </Button>
                              </>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-ink-muted">
                  {pagination.total} room{pagination.total === 1 ? '' : 's'} · Page {page} of {pagination.last_page}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    <ChevronLeft className="size-4" aria-hidden="true" />
                    Previous
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={page >= pagination.last_page}
                    onClick={() => setPage((current) => Math.min(pagination.last_page, current + 1))}
                  >
                    Next
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardBody>
      </Card>

      {dialogRoom !== undefined ? (
        <RoomFormDialog
          key={dialogRoom?.id ?? 'new'}
          room={dialogRoom}
          onCancel={() => setDialogRoom(undefined)}
          onSubmit={handleSave}
        />
      ) : null}

      {selectedRoomId !== null ? (
        <RoomDetailsDialog
          room={detailsRoom}
          isLoading={isDetailLoading}
          error={detailError}
          onClose={closeDetails}
          onRetry={refreshDetails}
          canManageQr={canManageQr}
          canResolveDiscrepancies={user?.role === 'administrator'}
        />
      ) : null}

      {confirmDialog && (
        <ConfirmationDialog
          onClose={() => setConfirmDialog(null)}
          title={confirmDialog.title}
          description={confirmDialog.description}
          confirmLabel={confirmDialog.confirmLabel}
          cancelLabel={confirmDialog.cancelLabel}
          destructive={confirmDialog.destructive}
          isLoading={Boolean(busyRoomId)}
          onConfirm={confirmDialog.onConfirm}
        />
      )}
    </>
  )
}
