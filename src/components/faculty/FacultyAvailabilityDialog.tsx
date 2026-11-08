import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/common/Button'
import { TextField } from '@/components/common/TextField'
import type {
  FacultyAvailabilityInput,
  FacultyAvailabilityRecord,
  FacultyTermOption,
} from '@/types/faculty'
import { getApiErrorMessage, getApiFieldErrors } from '@/utils/apiError'

interface FacultyAvailabilityDialogProps {
  availability: FacultyAvailabilityRecord | null
  terms: FacultyTermOption[]
  onCancel: () => void
  onSubmit: (input: FacultyAvailabilityInput) => Promise<void>
}

interface AvailabilityForm {
  academic_term_id: string
  day_of_week: string
  start_time: string
  end_time: string
  availability_type: FacultyAvailabilityInput['availability_type']
  notes: string
}

const days = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

export function FacultyAvailabilityDialog({
  availability,
  terms,
  onCancel,
  onSubmit,
}: FacultyAvailabilityDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [values, setValues] = useState<AvailabilityForm>(() => ({
    academic_term_id: availability ? String(availability.academic_term_id) : '',
    day_of_week: availability ? String(availability.day_of_week) : '1',
    start_time: availability?.start_time ?? '',
    end_time: availability?.end_time ?? '',
    availability_type: availability?.availability_type ?? 'available',
    notes: availability?.notes ?? '',
  }))
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError(null)
    setFieldErrors({})

    try {
      await onSubmit({
        academic_term_id: Number(values.academic_term_id),
        day_of_week: Number(values.day_of_week),
        start_time: values.start_time,
        end_time: values.end_time,
        availability_type: values.availability_type,
        notes: values.notes.trim() || null,
      })
    } catch (failure) {
      setError(getApiErrorMessage(failure, 'Unable to save availability.'))
      setFieldErrors(getApiFieldErrors(failure))
    } finally {
      setIsSaving(false)
    }
  }

  function update<K extends keyof AvailabilityForm>(field: K, value: AvailabilityForm[K]) {
    setValues((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => ({ ...current, [field]: [] }))
    setError(null)
  }

  const selectableTerms = terms.filter((term) => (
    ['active', 'planned'].includes(term.status) || term.id === availability?.academic_term_id
  ))

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault()
        onCancel()
      }}
      className="fixed inset-0 m-auto max-h-[92vh] w-[min(38rem,calc(100%-2rem))] overflow-y-auto rounded-2xl border border-line bg-white p-0 text-ink shadow-2xl backdrop:bg-brand-950/45"
      aria-labelledby="faculty-availability-title"
    >
      <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-7">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">
            Faculty availability
          </p>
          <h2 id="faculty-availability-title" className="mt-1 text-xl font-semibold">
            {availability ? 'Edit availability window' : 'Add availability window'}
          </h2>
        </div>

        {error ? (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="space-y-1.5">
          <label htmlFor="faculty-availability-term" className="block text-sm font-medium text-ink">
            Academic term
          </label>
          <select
            id="faculty-availability-term"
            required
            value={values.academic_term_id}
            onChange={(event) => update('academic_term_id', event.target.value)}
            className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="">Choose a term</option>
            {selectableTerms.map((term) => (
              <option key={term.id} value={term.id}>
                {term.academic_year} · {term.name}
              </option>
            ))}
          </select>
          {fieldErrors.academic_term_id?.[0] ? (
            <p className="text-xs font-medium text-red-600">{fieldErrors.academic_term_id[0]}</p>
          ) : null}
          {selectableTerms.length === 0 ? (
            <p className="text-xs text-ink-muted">There are no active or planned academic terms.</p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="faculty-availability-day" className="block text-sm font-medium text-ink">
              Day of week
            </label>
            <select
              id="faculty-availability-day"
              value={values.day_of_week}
              onChange={(event) => update('day_of_week', event.target.value)}
              className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              {days.map((day, index) => (
                <option key={day} value={index + 1}>{day}</option>
              ))}
            </select>
            {fieldErrors.day_of_week?.[0] ? (
              <p className="text-xs font-medium text-red-600">{fieldErrors.day_of_week[0]}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="faculty-availability-type" className="block text-sm font-medium text-ink">
              Availability type
            </label>
            <select
              id="faculty-availability-type"
              value={values.availability_type}
              onChange={(event) => update(
                'availability_type',
                event.target.value as FacultyAvailabilityInput['availability_type'],
              )}
              className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="available">Available</option>
              <option value="preferred">Preferred</option>
              <option value="unavailable">Unavailable</option>
            </select>
          </div>
          <TextField
            label="Starts at"
            type="time"
            required
            value={values.start_time}
            error={fieldErrors.start_time?.[0]}
            onChange={(event) => update('start_time', event.target.value)}
          />
          <TextField
            label="Ends at"
            type="time"
            required
            value={values.end_time}
            error={fieldErrors.end_time?.[0]}
            onChange={(event) => update('end_time', event.target.value)}
          />
        </div>

        <TextField
          label="Notes"
          maxLength={255}
          value={values.notes}
          error={fieldErrors.notes?.[0]}
          onChange={(event) => update('notes', event.target.value)}
        />

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button
            type="submit"
            isLoading={isSaving}
            disabled={!selectableTerms.length || !values.academic_term_id}
          >
            Save availability
          </Button>
        </div>
      </form>
    </dialog>
  )
}
