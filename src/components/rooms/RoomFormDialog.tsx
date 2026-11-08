import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/common/Button'
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog'
import { TextField } from '@/components/common/TextField'
import type { Room, RoomInput, RoomStatus, RoomType } from '@/types/room'
import { getApiErrorMessage, getApiFieldErrors } from '@/utils/apiError'

interface RoomFormDialogProps {
  room: Room | null
  onCancel: () => void
  onSubmit: (payload: RoomInput) => Promise<void>
}

interface RoomFormValues {
  code: string
  name: string
  building: string
  floor: string
  capacity: string
  room_type: RoomType
  status: RoomStatus
}

const roomTypeOptions: Array<{ value: RoomType; label: string }> = [
  { value: 'lecture', label: 'Lecture' },
  { value: 'laboratory', label: 'Laboratory' },
  { value: 'seminar', label: 'Seminar' },
  { value: 'office', label: 'Office' },
  { value: 'other', label: 'Other' },
]

const roomStatusOptions: Array<{ value: RoomStatus; label: string }> = [
  { value: 'available', label: 'Available' },
  { value: 'unavailable', label: 'Unavailable' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'retired', label: 'Retired' },
]

export function RoomFormDialog({ room, onCancel, onSubmit }: RoomFormDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [values, setValues] = useState<RoomFormValues>(() => ({
    code: room?.code ?? '',
    name: room?.name ?? '',
    building: room?.building ?? '',
    floor: room?.floor ?? '',
    capacity: room ? String(room.capacity) : '',
    room_type: room?.room_type ?? 'lecture',
    status: room?.status ?? 'available',
  }))
  const [isSaving, setIsSaving] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string
    description: string
    confirmLabel: string
    cancelLabel: string
    onConfirm: () => void | Promise<void>
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])

  function update<K extends keyof RoomFormValues>(field: K, value: RoomFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => ({ ...current, [field]: [] }))
    setError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (room?.status === 'available' && values.status !== 'available') {
      setConfirmDialog({
        title: 'Change room status',
        description: `Change ${room.code} from available to ${values.status}? Active schedule allocations must be released before the room can be deactivated.`,
        confirmLabel: 'Change status',
        cancelLabel: 'Keep available',
        onConfirm: () => {
          setConfirmDialog(null)
          proceedWithSubmit()
        },
      })
      return
    }

    await proceedWithSubmit()
  }

  async function proceedWithSubmit() {
    setIsSaving(true)
    setError(null)
    setFieldErrors({})

    try {
      await onSubmit({
        code: values.code.trim().toUpperCase(),
        name: values.name.trim(),
        building: values.building.trim() || null,
        floor: values.floor.trim() || null,
        capacity: Number(values.capacity),
        room_type: values.room_type,
        status: values.status,
      })
    } catch (failure) {
      const errors = getApiFieldErrors(failure)
      setFieldErrors(errors)
      setError(
        Object.values(errors).flat()[0] ??
          getApiErrorMessage(failure, 'Unable to save room.'),
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <dialog
        ref={dialogRef}
        onCancel={(event) => {
          event.preventDefault()
          onCancel()
        }}
        className="fixed inset-0 m-auto max-h-[92vh] w-[min(40rem,calc(100%-2rem))] overflow-y-auto rounded-2xl border border-line bg-white p-0 text-ink shadow-2xl backdrop:bg-brand-950/45"
        aria-labelledby="room-form-title"
      >
        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5 p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">
                Room inventory
              </p>
              <h2 id="room-form-title" className="mt-1 text-xl font-semibold">
                {room ? `Edit ${room.code}` : 'Create room'}
              </h2>
              <p className="mt-1 text-sm text-ink-muted">
                Room codes are stored in uppercase and must be unique.
              </p>
            </div>
            <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
              Close
            </Button>
          </div>

          {error ? (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Room code"
            required
            maxLength={32}
            value={values.code}
            error={fieldErrors.code?.[0]}
            placeholder="e.g. CCS-LAB-1"
            onChange={(event) => update('code', event.target.value)}
          />
          <TextField
            label="Room name"
            required
            maxLength={120}
            value={values.name}
            error={fieldErrors.name?.[0]}
            placeholder="e.g. Computer Laboratory 1"
            onChange={(event) => update('name', event.target.value)}
          />
          <TextField
            label="Building"
            maxLength={100}
            value={values.building}
            error={fieldErrors.building?.[0]}
            placeholder="Optional"
            onChange={(event) => update('building', event.target.value)}
          />
          <TextField
            label="Floor"
            maxLength={16}
            value={values.floor}
            error={fieldErrors.floor?.[0]}
            placeholder="Optional"
            onChange={(event) => update('floor', event.target.value)}
          />
          <TextField
            label="Capacity"
            type="number"
            required
            min={1}
            max={65535}
            step={1}
            value={values.capacity}
            error={fieldErrors.capacity?.[0]}
            placeholder="Number of seats"
            onChange={(event) => update('capacity', event.target.value)}
          />
          <div className="space-y-1.5">
            <label htmlFor="room-type" className="block text-sm font-medium text-ink">
              Room type
            </label>
            <select
              id="room-type"
              required
              value={values.room_type}
              aria-invalid={Boolean(fieldErrors.room_type?.[0])}
              onChange={(event) => update('room_type', event.target.value as RoomType)}
              className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              {roomTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {fieldErrors.room_type?.[0] ? (
              <p className="text-xs font-medium text-red-600">{fieldErrors.room_type[0]}</p>
            ) : null}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="room-status" className="block text-sm font-medium text-ink">
              Status
            </label>
            <select
              id="room-status"
              required
              value={values.status}
              aria-invalid={Boolean(fieldErrors.status?.[0])}
              onChange={(event) => update('status', event.target.value as RoomStatus)}
              className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              {roomStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {fieldErrors.status?.[0] ? (
              <p className="text-xs font-medium text-red-600">{fieldErrors.status[0]}</p>
            ) : (
              <p className="text-xs text-ink-muted">
                Rooms used by active schedule allocations cannot be deactivated until those allocations are released.
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSaving}>
            {room ? 'Save changes' : 'Create room'}
          </Button>
        </div>
      </form>
    </dialog>

      {confirmDialog && (
        <ConfirmationDialog
          onClose={() => setConfirmDialog(null)}
          title={confirmDialog.title}
          description={confirmDialog.description}
          confirmLabel={confirmDialog.confirmLabel}
          cancelLabel={confirmDialog.cancelLabel}
          destructive={false}
          isLoading={isSaving}
          onConfirm={confirmDialog.onConfirm}
        />
      )}
    </>
  )
}
