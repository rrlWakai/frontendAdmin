import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/common/Button'
import { MultiSelectField } from '@/components/common/MultiSelectField'
import { SelectField } from '@/components/common/SelectField'
import { TextAreaField } from '@/components/common/TextAreaField'
import { TextField } from '@/components/common/TextField'
import { fetchActivityOptions } from '@/services/api/activities'
import type {
  Activity,
  ActivityCategory,
  ActivityInput,
  ActivityOptions,
  ActivityTargetIds,
} from '@/types/activity'
import { useAuth } from '@/hooks/useAuth'
import { getApiErrorMessage, getApiFieldErrors } from '@/utils/apiError'

interface ActivityFormDialogProps {
  activity: Activity | null
  onCancel: () => void
  onSubmit: (payload: ActivityInput) => Promise<void>
}

interface FormValues {
  title: string
  summary: string
  description: string
  category: ActivityCategory
  organizer_name: string
  room_id: string
  venue_name: string
  location_details: string
  audience_scope: 'all' | 'custom'
  starts_at: string
  ends_at: string
}

const categories: ActivityCategory[] = [
  'seminar',
  'workshop',
  'orientation',
  'meeting',
  'competition',
  'conference',
  'research',
  'celebration',
  'organization',
  'training',
  'other',
]
const emptyTargets: ActivityTargetIds = {
  role_ids: [],
  program_ids: [],
  year_level_ids: [],
  section_ids: [],
  user_ids: [],
}
const manilaFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Manila',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

function localDateTime(value: string | null | undefined): string {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const parts = Object.fromEntries(
    manilaFormatter.formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  ) as Record<string, string>
  const hour = parts.hour === '24' ? '00' : parts.hour

  return `${parts.year}-${parts.month}-${parts.day}T${hour}:${parts.minute}`
}

function label(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function optionList(options: Array<{ id: number; name: string }>) {
  return options.map((option) => ({ value: String(option.id), label: option.name }))
}

export function ActivityFormDialog({ activity, onCancel, onSubmit }: ActivityFormDialogProps) {
  const { user } = useAuth()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const canChooseAll = user?.role === 'administrator'
  const [values, setValues] = useState<FormValues>(() => ({
    title: activity?.title ?? '',
    summary: activity?.summary ?? '',
    description: activity?.description ?? '',
    category: activity?.category ?? 'seminar',
    organizer_name: activity?.organizer_name ?? '',
    room_id: activity?.room ? String(activity.room.id) : '',
    venue_name: activity?.venue_name ?? '',
    location_details: activity?.location_details ?? '',
    audience_scope: activity?.audience_scope ?? (canChooseAll ? 'all' : 'custom'),
    starts_at: localDateTime(activity?.starts_at),
    ends_at: localDateTime(activity?.ends_at),
  }))
  const [targets, setTargets] = useState<ActivityTargetIds>({
    ...emptyTargets,
    ...activity?.targets,
  })
  const [options, setOptions] = useState<ActivityOptions | null>(null)
  const [userSearch, setUserSearch] = useState('')
  const [optionError, setOptionError] = useState<string | null>(null)
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])

  useEffect(() => {
    let active = true
    void fetchActivityOptions()
      .then((result) => {
        if (active) setOptions(result)
      })
      .catch((failure: unknown) => {
        if (active) setOptionError(getApiErrorMessage(failure, 'Unable to load activity options.'))
      })
      .finally(() => {
        if (active) setLoadingOptions(false)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const search = userSearch.trim()
    if (search.length < 2) return

    let active = true
    const timer = window.setTimeout(() => {
      void fetchActivityOptions(search)
        .then((result) => {
          if (active) {
            setOptions((current) => current ? { ...current, users: result.users } : result)
            setOptionError(null)
          }
        })
        .catch((failure: unknown) => {
          if (active) setOptionError(getApiErrorMessage(failure, 'Unable to search target users.'))
        })
    }, 250)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [userSearch])

  function update<K extends keyof FormValues>(field: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => ({ ...current, [field]: [] }))
    setError(null)
  }

  function updateTargets<K extends keyof ActivityTargetIds>(
    field: K,
    ids: ActivityTargetIds[K],
  ) {
    setTargets((current) => ({ ...current, [field]: ids }))
    setError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setFieldErrors({})

    try {
      await onSubmit({
        ...values,
        title: values.title.trim(),
        summary: values.summary.trim() || null,
        description: values.description.trim(),
        organizer_name: values.organizer_name.trim(),
        room_id: values.room_id ? Number(values.room_id) : null,
        venue_name: values.venue_name.trim() || null,
        location_details: values.location_details.trim() || null,
        targets: values.audience_scope === 'all' ? emptyTargets : targets,
      })
    } catch (failure) {
      const errors = getApiFieldErrors(failure)
      setFieldErrors(errors)
      setError(
        Object.values(errors).flat()[0]
          ?? getApiErrorMessage(failure, 'Unable to save activity.'),
      )
    } finally {
      setSaving(false)
    }
  }

  const visibleUsers = options?.users.filter((option) => (
    targets.user_ids.includes(option.id)
    || option.name.toLowerCase().includes(userSearch.trim().toLowerCase())
  )) ?? []

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault()
        onCancel()
      }}
      className="fixed inset-0 m-auto max-h-[92vh] w-[min(52rem,calc(100%-2rem))] overflow-y-auto rounded-2xl border border-line bg-white p-0 text-ink shadow-2xl backdrop:bg-brand-950/45"
      aria-labelledby="activity-form-title"
    >
      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5 p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">
              Activities management
            </p>
            <h2 id="activity-form-title" className="mt-1 text-xl font-semibold">
              {activity ? 'Edit activity' : 'Create activity'}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Save as a draft, then publish when ready. Times use Asia/Manila.
            </p>
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Close</Button>
        </div>

        {error ? (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        {optionError ? (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {optionError}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Activity title"
            required
            maxLength={160}
            value={values.title}
            placeholder="Enter activity title"
            error={fieldErrors.title?.[0]}
            onChange={(event) => update('title', event.target.value)}
          />
          <SelectField
            id="activity-category"
            label="Category"
            value={values.category}
            options={categories.map((value) => ({ value, label: label(value) }))}
            placeholder="Select activity type"
            error={fieldErrors.category?.[0]}
            onChange={(value) => update('category', value as ActivityCategory)}
          />
          <TextField
            label="Organizer / department"
            required
            maxLength={160}
            value={values.organizer_name}
            placeholder="Enter organizer or department"
            error={fieldErrors.organizer_name?.[0]}
            onChange={(event) => update('organizer_name', event.target.value)}
          />
          <TextField
            label="Short description"
            maxLength={300}
            value={values.summary}
            placeholder="Add a short summary"
            error={fieldErrors.summary?.[0]}
            onChange={(event) => update('summary', event.target.value)}
          />
          <TextAreaField
            id="activity-description"
            label="Full description"
            required
            maxLength={20_000}
            rows={5}
            value={values.description}
            placeholder="Describe the activity"
            error={fieldErrors.description?.[0]}
            onChange={(event) => update('description', event.target.value)}
            className="sm:col-span-2"
          />
          <TextField
            label="Starts at (Philippine time)"
            type="datetime-local"
            required
            value={values.starts_at}
            placeholder="Select start date"
            error={fieldErrors.starts_at?.[0]}
            onChange={(event) => update('starts_at', event.target.value)}
          />
          <TextField
            label="Ends at (Philippine time)"
            type="datetime-local"
            required
            value={values.ends_at}
            placeholder="Select end date"
            error={fieldErrors.ends_at?.[0]}
            onChange={(event) => update('ends_at', event.target.value)}
          />
          <SelectField
            id="activity-room"
            label="CCS room"
            value={values.room_id}
            options={[
              { value: '', label: 'Use an external venue' },
              ...(options?.rooms
                .filter((room) => room.status === 'available' || values.room_id === String(room.id))
                .map((room) => ({
                  value: String(room.id),
                  label: `${room.code} · ${room.name}${room.building ? ` (${room.building})` : ''}${room.status !== 'available' ? ` · ${label(room.status ?? '')}` : ''}`,
                })) ?? []),
            ]}
            placeholder="Select a CCS room"
            error={fieldErrors.room_id?.[0]}
            onChange={(value) => update('room_id', value)}
          />
          <TextField
            label="External venue"
            required={!values.room_id}
            maxLength={160}
            value={values.venue_name}
            placeholder="Enter venue or location"
            error={fieldErrors.venue_name?.[0]}
            onChange={(event) => update('venue_name', event.target.value)}
          />
          <TextField
            label="Building / location details"
            maxLength={255}
            value={values.location_details}
            placeholder="Add building or location details"
            error={fieldErrors.location_details?.[0]}
            onChange={(event) => update('location_details', event.target.value)}
          />
          <SelectField
            id="activity-audience"
            label="Audience"
            value={values.audience_scope}
            options={[
              ...(canChooseAll ? [{ value: 'all', label: 'All active users' }] : []),
              { value: 'custom', label: 'Custom audience' },
            ]}
            placeholder="Select audience"
            disabled={!canChooseAll}
            onChange={(value) => update('audience_scope', value as FormValues['audience_scope'])}
          />
        </div>

        {values.audience_scope === 'custom' ? (
          loadingOptions ? (
            <p role="status" className="text-sm text-ink-muted">Loading audience options…</p>
          ) : options ? (
            <div className="space-y-4 rounded-xl border border-line bg-slate-50 p-4">
              <MultiSelectField
                id="activity-roles"
                label="Roles"
                options={optionList(options.roles)}
                values={targets.role_ids.map(String)}
                placeholder="Select target roles"
                searchable={options.roles.length > 8}
                searchPlaceholder="Search roles"
                onChange={(values) => updateTargets('role_ids', values.map(Number))}
              />
              <MultiSelectField
                id="activity-programs"
                label="Programs"
                options={optionList(options.programs)}
                values={targets.program_ids.map(String)}
                placeholder="Select target programs"
                searchable={options.programs.length > 8}
                searchPlaceholder="Search programs"
                hint="Department Personnel must include at least one assigned program."
                onChange={(values) => updateTargets('program_ids', values.map(Number))}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <MultiSelectField
                  id="activity-years"
                  label="Year levels"
                  options={optionList(options.year_levels.map((item) => ({
                    ...item,
                    name: item.name || `Year ${item.level}`,
                  })))}
                  values={targets.year_level_ids.map(String)}
                  placeholder="Select year levels"
                  onChange={(values) => updateTargets('year_level_ids', values.map(Number))}
                />
                <MultiSelectField
                  id="activity-sections"
                  label="Sections"
                  options={optionList(options.sections)}
                  values={targets.section_ids.map(String)}
                  placeholder="Select sections"
                  searchable={options.sections.length > 8}
                  searchPlaceholder="Search sections"
                  onChange={(values) => updateTargets('section_ids', values.map(Number))}
                />
              </div>
              <div className="space-y-2">
                <TextField
                  label="Find individual users"
                  value={userSearch}
                  placeholder="Search active users by name"
                  onChange={(event) => setUserSearch(event.target.value)}
                />
                {visibleUsers.length ? (
                  <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-line bg-white p-2">
                    {visibleUsers.map((targetUser) => (
                      <label key={targetUser.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={targets.user_ids.includes(targetUser.id)}
                          onChange={(event) => updateTargets(
                            'user_ids',
                            event.target.checked
                              ? [...targets.user_ids, targetUser.id]
                              : targets.user_ids.filter((id) => id !== targetUser.id),
                          )}
                        />
                        {targetUser.name} <span className="text-xs text-ink-muted">({label(targetUser.role)})</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-ink-muted">No matching users. Enter at least two characters to search.</p>
                )}
              </div>
            </div>
          ) : null
        ) : null}

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit" isLoading={saving || loadingOptions}>
            Save draft
          </Button>
        </div>
      </form>
    </dialog>
  )
}
