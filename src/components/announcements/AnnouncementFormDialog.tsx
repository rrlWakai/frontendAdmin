import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/common/Button'
import { MultiSelectField } from '@/components/common/MultiSelectField'
import { SelectField } from '@/components/common/SelectField'
import { TextAreaField } from '@/components/common/TextAreaField'
import { TextField } from '@/components/common/TextField'
import {
  fetchAnnouncementTargetOptions,
  fetchAnnouncementTargetUsers,
} from '@/services/api/announcements'
import type {
  Announcement,
  AnnouncementCategory,
  AnnouncementInput,
  AnnouncementOption,
  AnnouncementPriority,
  AnnouncementTargetIds,
  AnnouncementTargetOptions,
} from '@/types/announcement'
import type { Activity } from '@/types/activity'
import { getApiErrorMessage, getApiFieldErrors } from '@/utils/apiError'

interface AnnouncementFormDialogProps {
  announcement: Announcement | null
  activities?: Activity[]
  initialActivityId?: number | null
  sourceActivity?: Activity | null
  submitLabel?: string
  onCancel: () => void
  onSubmit: (payload: AnnouncementInput) => Promise<void>
}

interface FormValues {
  title: string
  summary: string
  content: string
  category: AnnouncementCategory
  priority: AnnouncementPriority
  audience_scope: 'all' | 'custom'
  published_at: string
  expires_at: string
}

const categories: AnnouncementCategory[] = [
  'general',
  'academic',
  'class_suspension',
  'examination',
  'department',
  'event',
  'advisory',
]
const priorities: AnnouncementPriority[] = ['normal', 'important', 'urgent']
const emptyTargets: AnnouncementTargetIds = {
  role_ids: [],
  program_ids: [],
  year_level_ids: [],
  section_ids: [],
  user_ids: [],
}
const DISPLAY_TIMEZONE = 'Asia/Manila'
const EXPIRY_AFTER_PUBLICATION_MESSAGE =
  'Expiration date and time must be later than the scheduled publication date and time.'
const manilaDateTimeFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: DISPLAY_TIMEZONE,
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
    manilaDateTimeFormatter
      .formatToParts(date)
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

export function AnnouncementFormDialog({
  announcement,
  activities = [],
  initialActivityId = null,
  sourceActivity = null,
  submitLabel = 'Save draft',
  onCancel,
  onSubmit,
}: AnnouncementFormDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const source = announcement ? null : sourceActivity
  const sourceTargets = source?.audience_scope === 'custom' ? source.targets : undefined
  const [selectedActivityId, setSelectedActivityId] = useState<number | null>(
    () => announcement?.activity_id ?? initialActivityId ?? sourceActivity?.id ?? null,
  )
  const [values, setValues] = useState<FormValues>(() => ({
    title: announcement?.title ?? source?.title ?? '',
    summary: announcement?.summary ?? source?.summary ?? '',
    content: announcement?.content ?? source?.description ?? '',
    category: announcement?.category ?? (source ? 'event' : 'general'),
    priority: announcement?.priority ?? 'normal',
    audience_scope: announcement?.audience_scope ?? source?.audience_scope ?? 'all',
    published_at: localDateTime(announcement?.published_at ?? source?.starts_at),
    expires_at: localDateTime(
      announcement?.expires_at
        ?? (source && source.ends_at > source.starts_at ? source.ends_at : null),
    ),
  }))
  const [targets, setTargets] = useState<AnnouncementTargetIds>(() => ({
    role_ids: announcement?.targets.roles.map((item) => item.id) ?? sourceTargets?.role_ids ?? [],
    program_ids: announcement?.targets.programs.map((item) => item.id) ?? sourceTargets?.program_ids ?? [],
    year_level_ids: announcement?.targets.year_levels.map((item) => item.id) ?? sourceTargets?.year_level_ids ?? [],
    section_ids: announcement?.targets.sections.map((item) => item.id) ?? sourceTargets?.section_ids ?? [],
    user_ids: announcement?.targets.users.map((item) => item.id) ?? sourceTargets?.user_ids ?? [],
  }))
  const [options, setOptions] = useState<AnnouncementTargetOptions | null>(null)
  const [targetUsers, setTargetUsers] = useState<AnnouncementOption[]>(
    announcement?.targets.users ?? [],
  )
  const [userSearch, setUserSearch] = useState('')
  const [isLoadingOptions, setIsLoadingOptions] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])

  useEffect(() => {
    let active = true
    void fetchAnnouncementTargetOptions()
      .then((result) => {
        if (active) setOptions(result)
      })
      .catch((failure: unknown) => {
        if (active) setError(getApiErrorMessage(failure, 'Unable to load audience options.'))
      })
      .finally(() => {
        if (active) setIsLoadingOptions(false)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const search = userSearch.trim()
    if (search.length < 2) return

    let active = true
    const timeout = window.setTimeout(() => {
      void fetchAnnouncementTargetUsers(search)
        .then((users) => {
          if (active) {
            setTargetUsers((current) => [
              ...current.filter((item) => targets.user_ids.includes(item.id)),
              ...users.filter((item) => !targets.user_ids.includes(item.id)),
            ])
          }
        })
        .catch((failure: unknown) => {
          if (active) setError(getApiErrorMessage(failure, 'Unable to search active users.'))
        })
    }, 250)

    return () => {
      active = false
      window.clearTimeout(timeout)
    }
  }, [targets.user_ids, userSearch])

  function update<K extends keyof FormValues>(field: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => ({ ...current, [field]: [] }))
    setError(null)
  }

  function updateTargets<K extends keyof AnnouncementTargetIds>(
    field: K,
    ids: AnnouncementTargetIds[K],
  ) {
    setTargets((current) => ({ ...current, [field]: ids }))
    setError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setFieldErrors({})

    const publishedAt = values.published_at || null
    const expiresAt = values.expires_at || null
    if (publishedAt && expiresAt && expiresAt <= publishedAt) {
      setFieldErrors({ expires_at: [EXPIRY_AFTER_PUBLICATION_MESSAGE] })
      setError(EXPIRY_AFTER_PUBLICATION_MESSAGE)
      return
    }

    setIsSaving(true)

    try {
      await onSubmit({
        ...values,
        activity_id: selectedActivityId,
        title: values.title.trim(),
        summary: values.summary.trim() || null,
        content: values.content.trim(),
        published_at: publishedAt,
        expires_at: expiresAt,
        targets: values.audience_scope === 'all' ? emptyTargets : targets,
      })
    } catch (failure) {
      const errors = getApiFieldErrors(failure)
      setFieldErrors(errors)
      setError(
        Object.values(errors).flat()[0] ??
          getApiErrorMessage(failure, 'Unable to save announcement.'),
      )
    } finally {
      setIsSaving(false)
    }
  }

  const activityChoices = sourceActivity
    ? [sourceActivity, ...activities.filter((activity) => activity.id !== sourceActivity.id)]
    : activities
  const sections = options?.sections.map((section) => ({
    id: section.id,
    name: `${section.code ?? section.id}${section.name ? ` · ${section.name}` : ''}`,
  })) ?? []
  const users = targetUsers.filter((item) => (
    targets.user_ids.includes(item.id)
    || item.name.toLowerCase().includes(userSearch.trim().toLowerCase())
  ))

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault()
        onCancel()
      }}
      className="fixed inset-0 m-auto max-h-[92vh] w-[min(48rem,calc(100%-2rem))] overflow-y-auto rounded-2xl border border-line bg-white p-0 text-ink shadow-2xl backdrop:bg-brand-950/45"
      aria-labelledby="announcement-form-title"
    >
      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5 p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">
              Announcement management
            </p>
            <h2 id="announcement-form-title" className="mt-1 text-xl font-semibold">
              {announcement
                ? 'Edit announcement'
                : source
                  ? 'Create activity announcement'
                  : 'Create announcement'}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              {source
                ? 'This announcement will reference the published activity. Publishing is a separate, intentional action.'
                : 'Save as a draft, then publish now or schedule it for later. Times use Philippine local time (Asia/Manila, UTC+08:00).'}
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
            label="Title"
            required
            maxLength={160}
            value={values.title}
            placeholder="Enter announcement title"
            error={fieldErrors.title?.[0]}
            onChange={(event) => update('title', event.target.value)}
          />
          <SelectField
            id="announcement-category"
            label="Category"
            value={values.category}
            options={categories.map((value) => ({ value, label: label(value) }))}
            placeholder="Select announcement category"
            error={fieldErrors.category?.[0]}
            onChange={(value) => update('category', value as AnnouncementCategory)}
          />
          <TextField
            label="Short summary"
            maxLength={300}
            value={values.summary}
            placeholder="Add a short summary"
            error={fieldErrors.summary?.[0]}
            onChange={(event) => update('summary', event.target.value)}
          />
          <SelectField
            id="announcement-priority"
            label="Priority"
            value={values.priority}
            options={priorities.map((value) => ({ value, label: label(value) }))}
            placeholder="Select priority"
            error={fieldErrors.priority?.[0]}
            onChange={(value) => update('priority', value as AnnouncementPriority)}
          />
          <TextAreaField
            id="announcement-content"
            label="Announcement"
            required
            maxLength={20_000}
            rows={6}
            value={values.content}
            placeholder="Write your announcement"
            error={fieldErrors.content?.[0]}
            onChange={(event) => update('content', event.target.value)}
            className="sm:col-span-2"
          />
          <TextField
            label="Publish at"
            type="datetime-local"
            value={values.published_at}
            placeholder="Select publication date and time"
            error={fieldErrors.published_at?.[0]}
            hint="Leave blank to choose a publication time when publishing."
            onChange={(event) => update('published_at', event.target.value)}
          />
          <TextField
            label="Expires at"
            type="datetime-local"
            value={values.expires_at}
            placeholder="Select expiration date and time"
            error={fieldErrors.expires_at?.[0]}
            hint="Must be later than the scheduled publication date and time."
            onChange={(event) => update('expires_at', event.target.value)}
          />
          <SelectField
            id="announcement-audience"
            label="Audience"
            value={values.audience_scope}
            options={[
              { value: 'all', label: 'All active users' },
              { value: 'custom', label: 'Custom audience' },
            ]}
            placeholder="Select audience"
            onChange={(value) => update('audience_scope', value as FormValues['audience_scope'])}
            className="sm:col-span-2"
          />
          {activityChoices.length ? (
            <SelectField
              id="announcement-activity"
              label="Associated activity"
              value={selectedActivityId ? String(selectedActivityId) : ''}
              options={[
                { value: '', label: 'No activity (general announcement)' },
                ...activityChoices.map((activity) => ({
                  value: String(activity.id),
                  label: activity.title,
                })),
              ]}
              placeholder="Choose an activity"
              searchable={activityChoices.length > 8}
              searchPlaceholder="Search activities"
              disabled={Boolean(sourceActivity)}
              error={fieldErrors.activity_id?.[0]}
              hint={sourceActivity
                ? 'Linked to the activity being published.'
                : 'Optional. Linking an activity does not send a notification by itself.'}
              onChange={(value) => setSelectedActivityId(value ? Number(value) : null)}
              className="sm:col-span-2"
            />
          ) : null}
        </div>

        {values.audience_scope === 'custom' ? (
          isLoadingOptions ? (
            <p className="text-sm text-ink-muted" role="status">Loading audience options…</p>
          ) : options ? (
            <div className="space-y-4 rounded-xl border border-line bg-slate-50 p-4">
              {options.roles.length ? (
                <MultiSelectField
                  id="announcement-roles"
                  label="Roles"
                  options={optionList(options.roles)}
                  values={targets.role_ids.map(String)}
                  placeholder="Select target roles"
                  searchable={options.roles.length > 8}
                  searchPlaceholder="Search roles"
                  onChange={(values) => updateTargets('role_ids', values.map(Number))}
                />
              ) : null}
              <MultiSelectField
                id="announcement-programs"
                label="Programs"
                options={optionList(options.programs)}
                values={targets.program_ids.map(String)}
                placeholder="Select target programs"
                searchable={options.programs.length > 8}
                searchPlaceholder="Search programs"
                hint="Department personnel must include at least one assigned program."
                onChange={(values) => updateTargets('program_ids', values.map(Number))}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <MultiSelectField
                  id="announcement-years"
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
                  id="announcement-sections"
                  label="Sections"
                  options={optionList(sections)}
                  values={targets.section_ids.map(String)}
                  placeholder="Select sections"
                  searchable={sections.length > 8}
                  searchPlaceholder="Search sections"
                  onChange={(values) => updateTargets('section_ids', values.map(Number))}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="announcement-user-search" className="block text-sm font-medium text-ink">
                  Individual users
                </label>
                <TextField
                  id="announcement-user-search"
                  label="Search active users"
                  value={userSearch}
                  placeholder="Search active users by name"
                  onChange={(event) => setUserSearch(event.target.value)}
                />
                {users.length ? (
                  <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-line bg-white p-2">
                    {users.map((user) => (
                      <label key={user.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={targets.user_ids.includes(user.id)}
                          onChange={(event) => updateTargets(
                            'user_ids',
                            event.target.checked
                              ? [...targets.user_ids, user.id]
                              : targets.user_ids.filter((id) => id !== user.id),
                          )}
                        />
                        {user.name}
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-ink-muted">
                    Selected users stay listed; search to add more.
                  </p>
                )}
              </div>
            </div>
          ) : null
        ) : null}

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit" isLoading={isSaving || (values.audience_scope === 'custom' && isLoadingOptions)}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </dialog>
  )
}
