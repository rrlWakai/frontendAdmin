import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/common/Button'
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
import { getApiErrorMessage, getApiFieldErrors } from '@/utils/apiError'

interface AnnouncementFormDialogProps {
  announcement: Announcement | null
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

function selectedIds(event: React.ChangeEvent<HTMLSelectElement>): number[] {
  return Array.from(event.currentTarget.selectedOptions, (option) => Number(option.value))
}

function MultiSelect({
  id,
  label: fieldLabel,
  options,
  values,
  onChange,
  hint,
}: {
  id: string
  label: string
  options: AnnouncementOption[]
  values: number[]
  onChange: (values: number[]) => void
  hint?: string
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {fieldLabel}
      </label>
      <select
        id={id}
        multiple
        value={values.map(String)}
        onChange={(event) => onChange(selectedIds(event))}
        className="min-h-28 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
      <p className="text-xs text-ink-muted">{hint ?? 'Use Ctrl/Cmd to select multiple values.'}</p>
    </div>
  )
}

export function AnnouncementFormDialog({
  announcement,
  onCancel,
  onSubmit,
}: AnnouncementFormDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [values, setValues] = useState<FormValues>(() => ({
    title: announcement?.title ?? '',
    summary: announcement?.summary ?? '',
    content: announcement?.content ?? '',
    category: announcement?.category ?? 'general',
    priority: announcement?.priority ?? 'normal',
    audience_scope: announcement?.audience_scope ?? 'all',
    published_at: localDateTime(announcement?.published_at),
    expires_at: localDateTime(announcement?.expires_at),
  }))
  const [targets, setTargets] = useState<AnnouncementTargetIds>(() => ({
    role_ids: announcement?.targets.roles.map((item) => item.id) ?? [],
    program_ids: announcement?.targets.programs.map((item) => item.id) ?? [],
    year_level_ids: announcement?.targets.year_levels.map((item) => item.id) ?? [],
    section_ids: announcement?.targets.sections.map((item) => item.id) ?? [],
    user_ids: announcement?.targets.users.map((item) => item.id) ?? [],
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
              {announcement ? 'Edit announcement' : 'Create announcement'}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Save as a draft, then publish now or schedule it for later. Times use Philippine local time (Asia/Manila, UTC+08:00).
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
            error={fieldErrors.title?.[0]}
            onChange={(event) => update('title', event.target.value)}
          />
          <div className="space-y-1.5">
            <label htmlFor="announcement-category" className="block text-sm font-medium text-ink">
              Category
            </label>
            <select
              id="announcement-category"
              value={values.category}
              onChange={(event) => update('category', event.target.value as AnnouncementCategory)}
              className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              {categories.map((category) => <option key={category} value={category}>{label(category)}</option>)}
            </select>
          </div>
          <TextField
            label="Short summary"
            maxLength={300}
            value={values.summary}
            error={fieldErrors.summary?.[0]}
            onChange={(event) => update('summary', event.target.value)}
          />
          <div className="space-y-1.5">
            <label htmlFor="announcement-priority" className="block text-sm font-medium text-ink">
              Priority
            </label>
            <select
              id="announcement-priority"
              value={values.priority}
              onChange={(event) => update('priority', event.target.value as AnnouncementPriority)}
              className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              {priorities.map((priority) => <option key={priority} value={priority}>{label(priority)}</option>)}
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="announcement-content" className="block text-sm font-medium text-ink">
              Announcement
            </label>
            <textarea
              id="announcement-content"
              required
              maxLength={20_000}
              rows={6}
              value={values.content}
              aria-invalid={Boolean(fieldErrors.content?.[0])}
              onChange={(event) => update('content', event.target.value)}
              className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
            {fieldErrors.content?.[0] ? <p className="text-xs font-medium text-red-600">{fieldErrors.content[0]}</p> : null}
          </div>
          <TextField
            label="Publish at"
            type="datetime-local"
            value={values.published_at}
            error={fieldErrors.published_at?.[0]}
            hint="Leave blank to choose a publication time when publishing."
            onChange={(event) => update('published_at', event.target.value)}
          />
          <TextField
            label="Expires at"
            type="datetime-local"
            value={values.expires_at}
            error={fieldErrors.expires_at?.[0]}
            hint="Must be later than the scheduled publication date and time."
            onChange={(event) => update('expires_at', event.target.value)}
          />
          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="announcement-audience" className="block text-sm font-medium text-ink">
              Audience
            </label>
            <select
              id="announcement-audience"
              value={values.audience_scope}
              onChange={(event) => update('audience_scope', event.target.value as FormValues['audience_scope'])}
              className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="all">All active users</option>
              <option value="custom">Custom audience</option>
            </select>
          </div>
        </div>

        {values.audience_scope === 'custom' ? (
          isLoadingOptions ? (
            <p className="text-sm text-ink-muted" role="status">Loading audience options…</p>
          ) : options ? (
            <div className="space-y-4 rounded-xl border border-line bg-slate-50 p-4">
              {options.roles.length ? (
                <MultiSelect
                  id="announcement-roles"
                  label="Roles"
                  options={options.roles}
                  values={targets.role_ids}
                  onChange={(ids) => updateTargets('role_ids', ids)}
                />
              ) : null}
              <MultiSelect
                id="announcement-programs"
                label="Programs"
                options={options.programs}
                values={targets.program_ids}
                onChange={(ids) => updateTargets('program_ids', ids)}
                hint="Department personnel must include at least one assigned program."
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <MultiSelect
                  id="announcement-years"
                  label="Year levels"
                  options={options.year_levels.map((item) => ({ ...item, name: item.name || `Year ${item.level}` }))}
                  values={targets.year_level_ids}
                  onChange={(ids) => updateTargets('year_level_ids', ids)}
                />
                <MultiSelect
                  id="announcement-sections"
                  label="Sections"
                  options={sections}
                  values={targets.section_ids}
                  onChange={(ids) => updateTargets('section_ids', ids)}
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
                  placeholder="Type at least two characters"
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
            Save draft
          </Button>
        </div>
      </form>
    </dialog>
  )
}
