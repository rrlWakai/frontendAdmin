import { useEffect, useRef } from 'react'
import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { RoomStatusBadge } from '@/components/rooms/RoomStatusBadge'
import type { RoomAllocationRecord, RoomDetail } from '@/types/room'

interface RoomDetailsDialogProps {
  room: RoomDetail | null
  isLoading: boolean
  error: string | null
  onClose: () => void
  onRetry: () => void
}

const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function formatRoomType(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase())
}

function formatTime(value: string): string {
  return value.slice(0, 5)
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Unknown'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date)
}

function allocationTone(allocation: RoomAllocationRecord): 'success' | 'neutral' {
  return allocation.status === 'active' && allocation.class_schedule?.status === 'published'
    ? 'success'
    : 'neutral'
}

export function RoomDetailsDialog({
  room,
  isLoading,
  error,
  onClose,
  onRetry,
}: RoomDetailsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      className="fixed inset-0 m-auto max-h-[92vh] w-[min(64rem,calc(100%-2rem))] overflow-y-auto rounded-2xl border border-line bg-white p-0 text-ink shadow-2xl backdrop:bg-brand-950/45"
      aria-labelledby="room-details-title"
    >
      <div className="space-y-6 p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">
              Room inventory
            </p>
            <h2 id="room-details-title" className="mt-1 text-xl font-semibold">
              {room?.name ?? 'Room details'}
            </h2>
            {room ? (
              <p className="mt-1 text-sm text-ink-muted">{room.code}</p>
            ) : null}
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>

        {error ? (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p>{error}</p>
            <Button className="mt-3" size="sm" variant="outline" onClick={onRetry}>
              Retry
            </Button>
          </div>
        ) : isLoading ? (
          <div role="status" className="py-12 text-center text-sm text-ink-muted">
            Loading room details…
          </div>
        ) : room ? (
          <>
            <section className="grid gap-4 rounded-xl border border-line bg-stone-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs font-medium text-ink-muted">Building</p>
                <p className="mt-1 text-sm font-semibold text-ink">{room.building || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-ink-muted">Floor</p>
                <p className="mt-1 text-sm font-semibold text-ink">{room.floor || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-ink-muted">Capacity</p>
                <p className="mt-1 text-sm font-semibold text-ink">{room.capacity} seats</p>
              </div>
              <div>
                <p className="text-xs font-medium text-ink-muted">Room type</p>
                <p className="mt-1 text-sm font-semibold text-ink">{formatRoomType(room.room_type)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-ink-muted">Status</p>
                <div className="mt-1">
                  <RoomStatusBadge status={room.status} />
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-ink-muted">Active allocations</p>
                <p className="mt-1 text-sm font-semibold text-ink">{room.active_allocations_count}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-ink-muted">Published allocations</p>
                <p className="mt-1 text-sm font-semibold text-ink">{room.published_allocations_count}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-ink-muted">Last updated</p>
                <p className="mt-1 text-sm font-semibold text-ink">{formatDate(room.updated_at ?? null)}</p>
              </div>
            </section>

            <section>
              <div className="mb-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">
                  Scheduling
                </p>
                <h3 className="mt-1 text-lg font-semibold">Active schedule allocations</h3>
                <p className="mt-1 text-sm text-ink-muted">
                  Published schedules currently assigned to this room.
                </p>
              </div>
              {room.room_allocations.length ? (
                <div className="overflow-x-auto rounded-lg border border-line">
                  <table className="w-full min-w-[700px] text-left text-sm">
                    <thead className="bg-stone-50 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                      <tr>
                        <th className="px-4 py-3">Subject</th>
                        <th className="px-4 py-3">Section</th>
                        <th className="px-4 py-3">Schedule</th>
                        <th className="px-4 py-3">Allocated</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {room.room_allocations.map((allocation) => {
                        const schedule = allocation.class_schedule
                        const subject = schedule?.subject_offering?.subject
                        const section = schedule?.subject_offering?.section

                        return (
                          <tr key={allocation.id}>
                            <td className="px-4 py-3">
                              <p className="font-medium">{subject?.title ?? 'Unknown subject'}</p>
                              <p className="mt-0.5 text-xs text-ink-muted">{subject?.code ?? '—'}</p>
                            </td>
                            <td className="px-4 py-3">
                              <p>{section?.code ?? '—'}</p>
                              <p className="mt-0.5 text-xs text-ink-muted">{section?.name ?? 'No section name'}</p>
                            </td>
                            <td className="px-4 py-3">
                              {schedule ? (
                                <>
                                  <p>{dayLabels[schedule.day_of_week - 1] ?? 'Unknown day'}</p>
                                  <p className="mt-0.5 text-xs text-ink-muted">
                                    {formatTime(schedule.start_time)}–{formatTime(schedule.end_time)}
                                  </p>
                                </>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="px-4 py-3 text-ink-muted">{formatDate(allocation.allocated_at)}</td>
                            <td className="px-4 py-3">
                              <Badge tone={allocationTone(allocation)}>
                                {allocation.class_schedule?.status ?? allocation.status}
                              </Badge>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-ink-muted">
                  No active schedule allocations are using this room.
                </p>
              )}
            </section>
          </>
        ) : null}
      </div>
    </dialog>
  )
}
