import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { TextField } from '@/components/common/TextField'
import type {
  FacultyAvailabilityBatchInput,
  FacultyAvailabilityInput,
  FacultyAvailabilityRecord,
  FacultyAvailabilityWindowInput,
  FacultyTermOption,
} from '@/types/faculty'
import { getApiErrorMessage, getApiFieldErrors } from '@/utils/apiError'

interface FacultyAvailabilityDialogProps {
  availability: FacultyAvailabilityRecord | null
  savedAvailability: FacultyAvailabilityRecord[]
  professorName: string
  terms: FacultyTermOption[]
  onCancel: () => void
  onSubmit: (input: FacultyAvailabilityInput | FacultyAvailabilityBatchInput) => Promise<void>
  onEditSaved: (availability: FacultyAvailabilityRecord) => void
  onDeleteSaved: (availability: FacultyAvailabilityRecord) => void
}

interface PeriodDraft {
  id: string
  start_time: string
  end_time: string
  availability_type: FacultyAvailabilityWindowInput['availability_type']
  notes: string
}

type PeriodDraftField = keyof Omit<PeriodDraft, 'id'>

const days = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

let periodDraftId = 0

function createPeriodDraft(values: Partial<PeriodDraft> = {}): PeriodDraft {
  return {
    id: `period-${++periodDraftId}`,
    start_time: values.start_time ?? '',
    end_time: values.end_time ?? '',
    availability_type: values.availability_type ?? 'available',
    notes: values.notes ?? '',
  }
}

function periodFromRecord(record: FacultyAvailabilityRecord): PeriodDraft {
  return createPeriodDraft({
    start_time: record.start_time.slice(0, 5),
    end_time: record.end_time.slice(0, 5),
    availability_type: record.availability_type,
    notes: record.notes ?? '',
  })
}

function overlaps(first: { start_time: string; end_time: string }, second: { start_time: string; end_time: string }) {
  return first.start_time < second.end_time && first.end_time > second.start_time
}

export function FacultyAvailabilityDialog({
  availability,
  savedAvailability,
  professorName,
  terms,
  onCancel,
  onSubmit,
  onEditSaved,
  onDeleteSaved,
}: FacultyAvailabilityDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [academicTermId, setAcademicTermId] = useState(
    availability ? String(availability.academic_term_id) : '',
  )
  const [selectedDays, setSelectedDays] = useState<number[]>(
    availability ? [availability.day_of_week] : [],
  )
  const [mode, setMode] = useState<'shared' | 'individual'>('shared')
  const [sharedPeriods, setSharedPeriods] = useState<PeriodDraft[]>([createPeriodDraft()])
  const [dayPeriods, setDayPeriods] = useState<Record<number, PeriodDraft[]>>(
    availability ? { [availability.day_of_week]: [periodFromRecord(availability)] } : {},
  )
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])

  const selectableTerms = terms.filter((term) => (
    ['active', 'planned'].includes(term.status) || term.id === availability?.academic_term_id
  ))
  const existingForTerm = savedAvailability
    .filter((record) => record.academic_term_id === Number(academicTermId))
    .sort((first, second) => first.day_of_week - second.day_of_week
      || first.start_time.localeCompare(second.start_time))

  function clearErrors() {
    setError(null)
    setFieldErrors({})
  }

  function updatePeriod<K extends PeriodDraftField>(
    periodId: string,
    field: K,
    value: PeriodDraft[K],
    day?: number,
  ) {
    const update = (periods: PeriodDraft[]): PeriodDraft[] => periods.map((period) => (
      period.id === periodId ? { ...period, [field]: value } : period
    ))

    if (day === undefined) setSharedPeriods(update)
    else setDayPeriods((current) => ({ ...current, [day]: update(current[day] ?? []) }))
    clearErrors()
  }

  function addPeriod(day?: number) {
    if (day === undefined) setSharedPeriods((current) => [...current, createPeriodDraft()])
    else setDayPeriods((current) => ({
      ...current,
      [day]: [...(current[day] ?? []), createPeriodDraft()],
    }))
    clearErrors()
  }

  function removePeriod(periodId: string, day?: number) {
    if (day === undefined) {
      setSharedPeriods((current) => current.length > 1
        ? current.filter((period) => period.id !== periodId)
        : current)
    } else {
      setDayPeriods((current) => {
        const periods = current[day] ?? []
        return {
          ...current,
          [day]: periods.length > 1
            ? periods.filter((period) => period.id !== periodId)
            : periods,
        }
      })
    }
    clearErrors()
  }

  function toggleDay(day: number) {
    setSelectedDays((current) => {
      if (current.includes(day)) return current.filter((selected) => selected !== day)
      return [...current, day].sort((first, second) => first - second)
    })
    if (mode === 'individual') {
      setDayPeriods((current) => current[day]
        ? current
        : { ...current, [day]: [createPeriodDraft()] })
    }
    clearErrors()
  }

  function selectIndividualMode() {
    setDayPeriods((current) => {
      const next = { ...current }
      for (const day of selectedDays) {
        if (!next[day]) next[day] = sharedPeriods.map((period) => createPeriodDraft(period))
      }
      return next
    })
    setMode('individual')
    clearErrors()
  }

  function buildWindows(): FacultyAvailabilityWindowInput[] {
    if (availability) {
      const period = dayPeriods[availability.day_of_week]?.[0]
      return period ? [{
        day_of_week: availability.day_of_week,
        start_time: period.start_time,
        end_time: period.end_time,
        availability_type: period.availability_type,
        notes: period.notes.trim() || null,
      }] : []
    }

    const daysToSave = [...selectedDays].sort((first, second) => first - second)
    return daysToSave.flatMap((day) => {
      const periods = mode === 'shared' ? sharedPeriods : dayPeriods[day] ?? []
      return periods.map((period) => ({
        day_of_week: day,
        start_time: period.start_time,
        end_time: period.end_time,
        availability_type: period.availability_type,
        notes: period.notes.trim() || null,
      }))
    })
  }

  function validateWindows(windows: FacultyAvailabilityWindowInput[]): string | null {
    if (!academicTermId) return 'Choose an academic term.'
    if (!availability && selectedDays.length === 0) return 'Select at least one day.'
    if (windows.length === 0) return 'Add at least one availability period.'

    for (const [index, window] of windows.entries()) {
      if (!window.start_time || !window.end_time) {
        return `Complete the start and end times for period ${index + 1}.`
      }
      if (window.end_time <= window.start_time) {
        return `${days[window.day_of_week - 1]}: the end time must be later than the start time.`
      }
    }

    for (let index = 0; index < windows.length; index += 1) {
      for (let otherIndex = index + 1; otherIndex < windows.length; otherIndex += 1) {
        const current = windows[index]
        const other = windows[otherIndex]
        if (current.day_of_week === other.day_of_week && overlaps(current, other)) {
          return `${days[current.day_of_week - 1]}: configured periods must not overlap.`
        }
      }
    }

    const existing = savedAvailability.filter((record) => (
      record.academic_term_id === Number(academicTermId)
      && record.id !== availability?.id
    ))
    for (const window of windows) {
      const conflict = existing.find((record) => (
        record.day_of_week === window.day_of_week && overlaps(record, window)
      ))
      if (conflict) {
        return `${days[window.day_of_week - 1]}: this period overlaps a saved ${conflict.start_time.slice(0, 5)}–${conflict.end_time.slice(0, 5)} window.`
      }
    }

    return null
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    clearErrors()

    const windows = buildWindows()
    const validationError = validateWindows(windows)
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSaving(true)
    try {
      if (availability) {
        const window = windows[0]
        if (!window) {
          setError('Add an availability period before saving.')
          return
        }
        await onSubmit({
          academic_term_id: Number(academicTermId),
          ...window,
        })
      } else {
        await onSubmit({
          academic_term_id: Number(academicTermId),
          windows,
        })
      }
    } catch (failure) {
      setError(getApiErrorMessage(failure, 'Unable to save availability.'))
      setFieldErrors(getApiFieldErrors(failure))
    } finally {
      setIsSaving(false)
    }
  }

  const periodsForIndividualDays = selectedDays
    .slice()
    .sort((first, second) => first - second)

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault()
        if (!isSaving) onCancel()
      }}
      className="fixed inset-0 m-auto max-h-[92vh] w-[min(54rem,calc(100%-1rem))] overflow-y-auto rounded-2xl border border-line bg-white p-0 text-ink shadow-2xl backdrop:bg-brand-950/45 sm:w-[min(54rem,calc(100%-2rem))]"
      aria-labelledby="faculty-availability-title"
    >
      <form onSubmit={handleSubmit} className="space-y-5 p-4 sm:p-7">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">
            Faculty availability
          </p>
          <h2 id="faculty-availability-title" className="mt-1 text-xl font-semibold">
            {availability ? 'Edit availability window' : 'Set availability'}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            {professorName} · Configure availability for one academic term.
          </p>
        </div>

        {error ? (
          <div role="alert" className="space-y-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <p>{error}</p>
            {Object.entries(fieldErrors).flatMap(([field, messages]) => messages.map((message, index) => (
              <p key={`${field}-${index}`} className="text-xs">{message}</p>
            )))}
          </div>
        ) : null}

        <div className="space-y-1.5">
          <label htmlFor="faculty-availability-term" className="block text-sm font-medium text-ink">
            Academic term
          </label>
          <select
            id="faculty-availability-term"
            required
            disabled={isSaving}
            value={academicTermId}
            onChange={(event) => {
              setAcademicTermId(event.target.value)
              clearErrors()
            }}
            className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="">Choose a term</option>
            {selectableTerms.map((term) => (
              <option key={term.id} value={term.id}>
                {term.academic_year} · {term.name}
              </option>
            ))}
          </select>
          {selectableTerms.length === 0 ? (
            <p className="text-xs text-ink-muted">There are no active or planned academic terms.</p>
          ) : null}
        </div>

        {availability ? (
          <section className="space-y-3 rounded-xl border border-line p-4">
            <div>
              <h3 className="text-sm font-semibold">Day and time window</h3>
              <p className="mt-1 text-xs text-ink-muted">{days[availability.day_of_week - 1]}</p>
            </div>
            {(dayPeriods[availability.day_of_week] ?? []).map((period) => (
              <PeriodFields
                key={period.id}
                period={period}
                disabled={isSaving}
                onChange={(field, value) => updatePeriod(period.id, field, value, availability.day_of_week)}
              />
            ))}
          </section>
        ) : (
          <>
            <section className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold">Select days</h3>
                <p className="mt-1 text-xs text-ink-muted">Choose one or more days to configure.</p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {days.map((day, index) => {
                  const dayNumber = index + 1
                  const isSelected = selectedDays.includes(dayNumber)
                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={isSaving}
                      aria-pressed={isSelected}
                      onClick={() => toggleDay(dayNumber)}
                      className={`min-h-10 rounded-lg border px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 ${
                        isSelected
                          ? 'border-brand-600 bg-brand-50 text-brand-800'
                          : 'border-line bg-white text-ink-muted hover:bg-stone-50'
                      }`}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="space-y-4 rounded-xl border border-line p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Availability windows</h3>
                  <p className="mt-1 text-xs text-ink-muted">
                    Choose shared windows or customize each selected day.
                  </p>
                </div>
                <div className="flex gap-2" role="group" aria-label="Availability configuration mode">
                  <Button
                    type="button"
                    size="sm"
                    variant={mode === 'shared' ? 'secondary' : 'outline'}
                    disabled={isSaving}
                    aria-pressed={mode === 'shared'}
                    onClick={() => {
                      setMode('shared')
                      clearErrors()
                    }}
                  >
                    Shared hours
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={mode === 'individual' ? 'secondary' : 'outline'}
                    disabled={isSaving}
                    aria-pressed={mode === 'individual'}
                    onClick={selectIndividualMode}
                  >
                    Customize days
                  </Button>
                </div>
              </div>

              {mode === 'shared' ? (
                <div className="space-y-3">
                  {sharedPeriods.map((period, index) => (
                    <div key={period.id} className="rounded-lg bg-stone-50 p-3">
                      <PeriodFields
                        period={period}
                        periodNumber={index + 1}
                        disabled={isSaving}
                        onChange={(field, value) => updatePeriod(period.id, field, value)}
                        onRemove={() => removePeriod(period.id)}
                        canRemove={sharedPeriods.length > 1}
                      />
                    </div>
                  ))}
                  <Button type="button" size="sm" variant="outline" disabled={isSaving} leftIcon={<Plus className="size-4" />} onClick={() => addPeriod()}>
                    Add shared period
                  </Button>
                  <p className="text-xs text-ink-muted">
                    Each shared period is applied to every selected day.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {periodsForIndividualDays.length ? periodsForIndividualDays.map((day) => {
                    const periods = dayPeriods[day] ?? []
                    return (
                      <div key={day} className="space-y-3 rounded-lg bg-stone-50 p-3">
                        <h4 className="text-sm font-semibold">{days[day - 1]}</h4>
                        {periods.map((period, index) => (
                          <PeriodFields
                            key={period.id}
                            period={period}
                            periodNumber={index + 1}
                            disabled={isSaving}
                            onChange={(field, value) => updatePeriod(period.id, field, value, day)}
                            onRemove={() => removePeriod(period.id, day)}
                            canRemove={periods.length > 1}
                          />
                        ))}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isSaving}
                          leftIcon={<Plus className="size-4" />}
                          onClick={() => addPeriod(day)}
                        >
                          Add period to {days[day - 1]}
                        </Button>
                      </div>
                    )
                  }) : (
                    <p className="rounded-lg border border-dashed border-line px-3 py-6 text-center text-sm text-ink-muted">
                      Select a day above to customize its windows.
                    </p>
                  )}
                  <p className="text-xs text-ink-muted">
                    Switching modes keeps each mode’s entered windows.
                  </p>
                </div>
              )}
            </section>
          </>
        )}

        {!availability ? (
          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold">Saved windows for this term</h3>
              <p className="mt-1 text-xs text-ink-muted">
                Existing windows remain unchanged unless you edit or remove them.
              </p>
            </div>
            {existingForTerm.length ? (
              <div className="divide-y divide-line rounded-lg border border-line">
                {existingForTerm.map((record) => (
                  <div key={record.id} className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                      <span className="font-medium">{days[record.day_of_week - 1]}</span>
                      <span>{record.start_time.slice(0, 5)}–{record.end_time.slice(0, 5)}</span>
                      <span className="capitalize text-ink-muted">{record.availability_type}</span>
                      {record.notes ? <span className="text-xs text-ink-muted">{record.notes}</span> : null}
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" size="sm" variant="outline" disabled={isSaving} onClick={() => onEditSaved(record)}>
                        Edit
                      </Button>
                      <Button type="button" size="sm" variant="danger" disabled={isSaving} onClick={() => onDeleteSaved(record)}>
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-line px-3 py-4 text-sm text-ink-muted">
                No saved windows for this term. With no configured windows, availability is unrestricted.
              </p>
            )}
          </section>
        ) : null}

        <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={isSaving}
            disabled={!selectableTerms.length || !academicTermId}
          >
            {availability ? 'Save changes' : 'Save availability'}
          </Button>
        </div>
      </form>
    </dialog>
  )
}

interface PeriodFieldsProps {
  period: PeriodDraft
  periodNumber?: number
  disabled: boolean
  canRemove?: boolean
  onChange: <K extends PeriodDraftField>(field: K, value: PeriodDraft[K]) => void
  onRemove?: () => void
}

function PeriodFields({
  period,
  periodNumber,
  disabled,
  canRemove = false,
  onChange,
  onRemove,
}: PeriodFieldsProps) {
  const label = periodNumber ? `Period ${periodNumber}` : 'Availability window'

  return (
    <div className="space-y-3">
      {periodNumber ? <p className="text-xs font-semibold text-ink-muted">{label}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <TextField
          label="Starts at"
          type="time"
          required
          disabled={disabled}
          value={period.start_time}
          onChange={(event) => onChange('start_time', event.target.value)}
        />
        <TextField
          label="Ends at"
          type="time"
          required
          disabled={disabled}
          value={period.end_time}
          onChange={(event) => onChange('end_time', event.target.value)}
        />
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-ink">{label} type</label>
          <select
            value={period.availability_type}
            disabled={disabled}
            onChange={(event) => onChange(
              'availability_type',
              event.target.value as PeriodDraft['availability_type'],
            )}
            className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="available">Available</option>
            <option value="preferred">Preferred</option>
            <option value="unavailable">Unavailable</option>
          </select>
        </div>
        <TextField
          label="Notes"
          maxLength={255}
          value={period.notes}
          disabled={disabled}
          onChange={(event) => onChange('notes', event.target.value)}
        />
      </div>
      {canRemove && onRemove ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={disabled}
          leftIcon={<Trash2 className="size-4" />}
          onClick={onRemove}
        >
          Remove period
        </Button>
      ) : null}
    </div>
  )
}
