import { useEffect, useState } from 'react'
import {
  Archive,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  FileClock,
  Megaphone,
  Pencil,
  Plus,
  Send,
} from 'lucide-react'
import { AnnouncementFormDialog } from '@/components/announcements/AnnouncementFormDialog'
import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { Card, CardBody } from '@/components/common/Card'
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { TextField } from '@/components/common/TextField'
import {
  archiveAnnouncement,
  createAnnouncement,
  fetchAnnouncementHistory,
  fetchManagedAnnouncements,
  publishAnnouncement,
  updateAnnouncement,
} from '@/services/api/announcements'
import { useAuth } from '@/hooks/useAuth'
import type {
  Announcement,
  AnnouncementCategory,
  AnnouncementHistoryEntry,
  AnnouncementInput,
  AnnouncementOverview,
  AnnouncementPagination,
  AnnouncementStatus,
} from '@/types/announcement'
import { getApiErrorMessage } from '@/utils/apiError'

const emptyOverview: AnnouncementOverview = {
  total: 0,
  draft: 0,
  scheduled: 0,
  published: 0,
  expired: 0,
  archived: 0,
}
const emptyPagination: AnnouncementPagination = {
  current_page: 1,
  last_page: 1,
  per_page: 25,
  total: 0,
}
const statusOptions: Array<{ value: AnnouncementStatus | ''; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
]
const categoryOptions: Array<{ value: AnnouncementCategory | ''; label: string }> = [
  { value: '', label: 'All categories' },
  { value: 'general', label: 'General' },
  { value: 'academic', label: 'Academic' },
  { value: 'class_suspension', label: 'Class suspension' },
  { value: 'examination', label: 'Examination' },
  { value: 'department', label: 'Department' },
  { value: 'event', label: 'Event' },
  { value: 'advisory', label: 'Advisory' },
]

function formatLabel(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatDate(value: string | null): string {
  if (!value) return 'Not scheduled'

  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Manila',
  }).format(new Date(value))
}

function statusTone(value: Announcement['publication_state']): 'neutral' | 'warning' | 'success' | 'danger' {
  if (value === 'published') return 'success'
  if (value === 'scheduled') return 'warning'
  if (value === 'expired' || value === 'archived') return 'danger'
  return 'neutral'
}

function HistoryDialog({
  announcement,
  onClose,
}: {
  announcement: Announcement
  onClose: () => void
}) {
  const [history, setHistory] = useState<AnnouncementHistoryEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    void fetchAnnouncementHistory(announcement.id)
      .then((result) => {
        if (active) setHistory(result.history)
      })
      .catch((failure: unknown) => {
        if (active) setError(getApiErrorMessage(failure, 'Unable to load announcement history.'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [announcement.id])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/45 p-4" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="announcement-history-title"
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-line bg-white p-5 shadow-2xl sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">
              Audit trail
            </p>
            <h2 id="announcement-history-title" className="mt-1 text-xl font-semibold text-ink">
              {announcement.title}
            </h2>
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={onClose}>Close</Button>
        </div>
        {loading ? <p className="py-8 text-sm text-ink-muted" role="status">Loading history…</p> : null}
        {error ? <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p> : null}
        {!loading && !error ? (
          <ol className="mt-5 space-y-3">
            {history.map((entry) => (
              <li key={entry.id} className="rounded-xl border border-line p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge>{formatLabel(entry.action)}</Badge>
                  <time className="text-xs text-ink-muted">{formatDate(entry.created_at)}</time>
                </div>
                <p className="mt-2 text-sm text-ink">
                  {entry.acted_by?.name ?? 'System'}
                  {entry.previous_status && entry.new_status
                    ? ` · ${formatLabel(entry.previous_status)} → ${formatLabel(entry.new_status)}`
                    : ''}
                </p>
              </li>
            ))}
            {!history.length ? <li className="py-8 text-center text-sm text-ink-muted">No history recorded.</li> : null}
          </ol>
        ) : null}
      </section>
    </div>
  )
}

export function AnnouncementsPage() {
  const { user } = useAuth()
  const canManage = user?.role === 'administrator' || user?.role === 'department_personnel'
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [overview, setOverview] = useState(emptyOverview)
  const [pagination, setPagination] = useState(emptyPagination)
  const [statusFilter, setStatusFilter] = useState<AnnouncementStatus | ''>('')
  const [categoryFilter, setCategoryFilter] = useState<AnnouncementCategory | ''>('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [dialogAnnouncement, setDialogAnnouncement] = useState<Announcement | null | undefined>()
  const [historyAnnouncement, setHistoryAnnouncement] = useState<Announcement | null>(null)
  const [expandedAnnouncementId, setExpandedAnnouncementId] = useState<number | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
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
        const result = await fetchManagedAnnouncements({
          search: search || undefined,
          status: statusFilter || undefined,
          category: categoryFilter || undefined,
          page,
          per_page: 25,
        })
        if (active) {
          setAnnouncements(result.announcements)
          setOverview(result.overview)
          setPagination(result.pagination)
        }
      } catch (failure) {
        if (active) setError(getApiErrorMessage(failure, 'Unable to load announcements.'))
      } finally {
        if (active) setIsLoading(false)
      }
    })

    return () => {
      active = false
    }
  }, [categoryFilter, page, refreshVersion, search, statusFilter])

  async function handleSave(payload: AnnouncementInput) {
    if (dialogAnnouncement) {
      await updateAnnouncement(dialogAnnouncement.id, payload)
      setSuccess('Announcement changes saved.')
    } else {
      await createAnnouncement(payload)
      setSuccess('Draft created. Publish it when ready.')
      setPage(1)
    }
    setDialogAnnouncement(undefined)
    setRefreshVersion((version) => version + 1)
  }

  async function handleLifecycleAction(
    announcement: Announcement,
    action: 'publish' | 'archive',
  ) {
    const title = action === 'publish' ? 'Publish announcement' : 'Archive announcement'
    const description = action === 'publish'
      ? `Publish "${announcement.title}"? A future publication date will keep it scheduled.`
      : `Archive "${announcement.title}"? Archived announcements can no longer be edited or published.`

    setConfirmDialog({
      title,
      description,
      confirmLabel: action === 'publish' ? 'Publish' : 'Archive',
      cancelLabel: 'Keep as is',
      destructive: action === 'archive',
      onConfirm: async () => {
        setConfirmDialog(null)
        setBusyId(announcement.id)
        setError(null)
        setSuccess(null)
        try {
          if (action === 'publish') {
            await publishAnnouncement(announcement.id)
            setSuccess('Announcement published or scheduled.')
          } else {
            await archiveAnnouncement(announcement.id)
            setSuccess('Announcement archived.')
          }
          setRefreshVersion((version) => version + 1)
        } catch (failure) {
          setError(getApiErrorMessage(failure, `Unable to ${action} announcement.`))
        } finally {
          setBusyId(null)
        }
      },
    })
  }

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Announcements"
        description="Draft and publish official notices, target the right college community, and review each announcement’s audit history."
        actions={canManage ? (
          <Button leftIcon={<Plus className="size-4" aria-hidden="true" />} onClick={() => setDialogAnnouncement(null)}>
            New announcement
          </Button>
        ) : null}
      />

      {success ? (
        <div role="status" className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
          {success}
          <button type="button" className="ml-3 text-xs font-semibold underline" onClick={() => setSuccess(null)}>
            Dismiss
          </button>
        </div>
      ) : null}
      {error ? (
        <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          {error}
          <button type="button" className="ml-3 text-xs font-semibold underline" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="mb-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {([
          ['Total', overview.total],
          ['Drafts', overview.draft],
          ['Scheduled', overview.scheduled],
          ['Published', overview.published],
          ['Expired', overview.expired],
          ['Archived', overview.archived],
        ] as const).map(([label, count]) => (
          <Card key={label}>
            <CardBody>
              <p className="text-xs font-medium text-ink-muted">{label}</p>
              <p className="mt-1 font-display text-2xl font-semibold text-ink">{count}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card>
        <CardBody>
          <form
            className="grid gap-3 md:grid-cols-[minmax(14rem,1fr)_12rem_12rem_auto]"
            onSubmit={(event) => {
              event.preventDefault()
              setPage(1)
              setSearch(searchInput.trim())
            }}
          >
            <TextField
              label="Search announcements"
              value={searchInput}
              placeholder="Title, summary, or content"
              onChange={(event) => setSearchInput(event.target.value)}
            />
            <div className="space-y-1.5">
              <label htmlFor="announcement-status-filter" className="block text-sm font-medium text-ink">
                Status
              </label>
              <select
                id="announcement-status-filter"
                value={statusFilter}
                onChange={(event) => {
                  setPage(1)
                  setStatusFilter(event.target.value as AnnouncementStatus | '')
                }}
                className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm"
              >
                {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="announcement-category-filter" className="block text-sm font-medium text-ink">
                Category
              </label>
              <select
                id="announcement-category-filter"
                value={categoryFilter}
                onChange={(event) => {
                  setPage(1)
                  setCategoryFilter(event.target.value as AnnouncementCategory | '')
                }}
                className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm"
              >
                {categoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <Button type="submit" variant="outline" className="w-full md:w-auto">Search</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <div className="mt-5">
        {isLoading ? (
          <Card><CardBody><p role="status" className="py-8 text-center text-sm text-ink-muted">Loading announcements…</p></CardBody></Card>
        ) : announcements.length ? (
          <div className="space-y-3">
            {announcements.map((announcement) => (
              <Card key={announcement.id}>
                <CardBody>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-ink">{announcement.title}</h3>
                        <Badge tone={statusTone(announcement.publication_state)}>
                          {formatLabel(announcement.publication_state)}
                        </Badge>
                        <Badge>{formatLabel(announcement.priority)}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-ink-muted">
                        {formatLabel(announcement.category)} · {announcement.audience_summary}
                      </p>
                      <p className="mt-3 line-clamp-2 whitespace-pre-wrap text-sm leading-6 text-ink">
                        {announcement.summary || announcement.content}
                      </p>
                      <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
                        <span>By {announcement.author.name}</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="size-3.5" aria-hidden="true" />
                          {announcement.status === 'draft' ? 'Draft' : formatDate(announcement.published_at)}
                        </span>
                        {announcement.expires_at ? <span>Expires {formatDate(announcement.expires_at)}</span> : null}
                      </p>
                      {expandedAnnouncementId === announcement.id ? (
                        <div className="mt-4 rounded-lg bg-slate-50 p-4">
                          {announcement.summary ? (
                            <p className="mb-2 text-sm font-medium leading-6 text-ink">
                              {announcement.summary}
                            </p>
                          ) : null}
                          <p className="whitespace-pre-wrap text-sm leading-6 text-ink">
                            {announcement.content}
                          </p>
                        </div>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {announcement.status !== 'archived' ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            leftIcon={<Pencil className="size-3.5" aria-hidden="true" />}
                            onClick={() => setDialogAnnouncement(announcement)}
                          >
                            Edit
                          </Button>
                          {announcement.status === 'draft' ? (
                            <Button
                              type="button"
                              size="sm"
                              leftIcon={<Send className="size-3.5" aria-hidden="true" />}
                              isLoading={busyId === announcement.id}
                              onClick={() => void handleLifecycleAction(announcement, 'publish')}
                            >
                              Publish
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="danger"
                              leftIcon={<Archive className="size-3.5" aria-hidden="true" />}
                              isLoading={busyId === announcement.id}
                              onClick={() => void handleLifecycleAction(announcement, 'archive')}
                            >
                              Archive
                            </Button>
                          )}
                        </>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        leftIcon={<FileClock className="size-3.5" aria-hidden="true" />}
                        onClick={() => setHistoryAnnouncement(announcement)}
                      >
                        History
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        aria-expanded={expandedAnnouncementId === announcement.id}
                        aria-label={`${expandedAnnouncementId === announcement.id ? 'Hide' : 'View'} ${announcement.title}`}
                        leftIcon={<Eye className="size-3.5" aria-hidden="true" />}
                        onClick={() => setExpandedAnnouncementId(
                          expandedAnnouncementId === announcement.id ? null : announcement.id,
                        )}
                      >
                        {expandedAnnouncementId === announcement.id ? 'Hide' : 'View'}
                      </Button>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
            <div className="flex items-center justify-between rounded-xl border border-line bg-white px-4 py-3 text-sm">
              <span className="text-ink-muted">
                {pagination.total} announcements · Page {pagination.current_page} of {pagination.last_page}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  aria-label="Previous page"
                  disabled={pagination.current_page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  <ChevronLeft className="size-4" aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  aria-label="Next page"
                  disabled={pagination.current_page >= pagination.last_page}
                  onClick={() => setPage((current) => Math.min(pagination.last_page, current + 1))}
                >
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <Card>
            <EmptyState
              icon={Megaphone}
              title="No announcements found"
              description="Create a draft to start publishing official updates, or adjust the current filters."
              action={canManage ? (
                <Button leftIcon={<Plus className="size-4" aria-hidden="true" />} onClick={() => setDialogAnnouncement(null)}>
                  Create announcement
                </Button>
              ) : null}
            />
          </Card>
        )}
      </div>

      {dialogAnnouncement !== undefined ? (
        <AnnouncementFormDialog
          key={dialogAnnouncement?.id ?? 'new'}
          announcement={dialogAnnouncement}
          onCancel={() => setDialogAnnouncement(undefined)}
          onSubmit={handleSave}
        />
      ) : null}
      {historyAnnouncement ? (
        <HistoryDialog
          announcement={historyAnnouncement}
          onClose={() => setHistoryAnnouncement(null)}
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
          isLoading={Boolean(busyId)}
          onConfirm={confirmDialog.onConfirm}
        />
      )}
    </>
  )
}
