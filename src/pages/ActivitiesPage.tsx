import { useEffect, useState } from 'react'
import {
  Archive,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileClock,
  MapPin,
  Pencil,
  Plus,
  Sparkles,
} from 'lucide-react'
import { ActivityFormDialog } from '@/components/activities/ActivityFormDialog'
import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { Card, CardBody } from '@/components/common/Card'
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { TextField } from '@/components/common/TextField'
import {
  cancelActivity,
  completeActivity,
  createActivity,
  fetchActivityHistory,
  fetchManagedActivities,
  publishActivity,
  updateActivity,
} from '@/services/api/activities'
import { useAuth } from '@/hooks/useAuth'
import type {
  Activity,
  ActivityCategory,
  ActivityHistoryEntry,
  ActivityInput,
  ActivityOverview,
  ActivityPagination,
  ActivityStatus,
} from '@/types/activity'
import { getApiErrorMessage } from '@/utils/apiError'

const emptyOverview: ActivityOverview = {
  total: 0,
  upcoming: 0,
  ongoing: 0,
  completed: 0,
  cancelled: 0,
  draft: 0,
}
const emptyPagination: ActivityPagination = {
  current_page: 1,
  last_page: 1,
  per_page: 25,
  total: 0,
}
const statuses: Array<{ value: ActivityStatus | ''; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'completed', label: 'Completed' },
]
const categories: Array<{ value: ActivityCategory | ''; label: string }> = [
  { value: '', label: 'All categories' },
  { value: 'seminar', label: 'Seminar' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'orientation', label: 'Orientation' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'competition', label: 'Competition' },
  { value: 'conference', label: 'Conference' },
  { value: 'research', label: 'Research' },
  { value: 'celebration', label: 'Celebration' },
  { value: 'organization', label: 'Organization' },
  { value: 'training', label: 'Training' },
  { value: 'other', label: 'Other' },
]

function formatLabel(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Manila',
  }).format(new Date(value))
}

function activityTone(state: Activity['activity_state']): 'neutral' | 'warning' | 'success' | 'danger' {
  if (state === 'ongoing') return 'success'
  if (state === 'upcoming' || state === 'published') return 'warning'
  if (state === 'cancelled') return 'danger'
  return 'neutral'
}

function HistoryDialog({ activity, onClose }: { activity: Activity; onClose: () => void }) {
  const [history, setHistory] = useState<ActivityHistoryEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    void fetchActivityHistory(activity.id)
      .then((result) => {
        if (active) setHistory(result.history)
      })
      .catch((failure: unknown) => {
        if (active) setError(getApiErrorMessage(failure, 'Unable to load activity history.'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [activity.id])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/45 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="activity-history-title"
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-line bg-white p-5 shadow-2xl sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">
              Audit trail
            </p>
            <h2 id="activity-history-title" className="mt-1 text-xl font-semibold text-ink">
              {activity.title}
            </h2>
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={onClose}>Close</Button>
        </div>
        {loading ? <p role="status" className="py-8 text-sm text-ink-muted">Loading history…</p> : null}
        {error ? <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        {!loading && !error ? (
          <ol className="mt-5 space-y-3">
            {history.map((item) => (
              <li key={item.id} className="rounded-xl border border-line p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge>{formatLabel(item.action)}</Badge>
                  <time className="text-xs text-ink-muted">{formatDate(item.created_at)}</time>
                </div>
                <p className="mt-2 text-sm text-ink">
                  {item.acted_by?.name ?? 'System'}
                  {item.previous_status && item.new_status
                    ? ` · ${formatLabel(item.previous_status)} → ${formatLabel(item.new_status)}`
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

export function ActivitiesPage() {
  const { user } = useAuth()
  const canManage = user?.role === 'administrator' || user?.role === 'department_personnel'
  const [activities, setActivities] = useState<Activity[]>([])
  const [overview, setOverview] = useState(emptyOverview)
  const [pagination, setPagination] = useState(emptyPagination)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<ActivityCategory | ''>('')
  const [status, setStatus] = useState<ActivityStatus | ''>('')
  const [audience, setAudience] = useState<'all' | 'custom' | ''>('')
  const [organizer, setOrganizer] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [dialogActivity, setDialogActivity] = useState<Activity | null | undefined>(undefined)
  const [historyActivity, setHistoryActivity] = useState<Activity | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string
    description?: string
    confirmLabel: string
    cancelLabel: string
    destructive: boolean
    inputLabel?: string
    inputPlaceholder?: string
    onConfirm: (value: string) => void | Promise<void>
  } | null>(null)

  useEffect(() => {
    let active = true
    void Promise.resolve().then(async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await fetchManagedActivities({
          search: search || undefined,
          category: category || undefined,
          status: status || undefined,
          audience_scope: audience || undefined,
          organizer: organizer.trim() || undefined,
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
          page,
          per_page: 25,
        })
        if (active) {
          setActivities(result.activities)
          setOverview(result.overview)
          setPagination(result.pagination)
        }
      } catch (failure) {
        if (active) setError(getApiErrorMessage(failure, 'Unable to load activities.'))
      } finally {
        if (active) setLoading(false)
      }
    })

    return () => {
      active = false
    }
  }, [audience, category, fromDate, organizer, page, refreshVersion, search, status, toDate])

  async function handleSave(payload: ActivityInput) {
    if (dialogActivity) {
      await updateActivity(dialogActivity.id, payload)
      setSuccess('Activity changes saved.')
    } else {
      await createActivity(payload)
      setSuccess('Activity draft created.')
      setPage(1)
    }
    setDialogActivity(undefined)
    setRefreshVersion((version) => version + 1)
  }

  async function handleAction(activity: Activity, action: 'publish' | 'cancel' | 'complete') {
    if (action === 'cancel') {
      setConfirmDialog({
        title: 'Cancel activity',
        description: `Cancel "${activity.title}"? It will remain visible and be marked as cancelled.`,
        confirmLabel: 'Cancel activity',
        cancelLabel: 'Keep as is',
        destructive: true,
        inputLabel: 'Cancellation reason',
        inputPlaceholder: 'Why is this activity being cancelled?',
        onConfirm: async (reason) => {
          setConfirmDialog(null)
          if (!reason || reason.trim().length < 3) {
            setError('Please provide a cancellation reason of at least three characters.')
            return
          }
          setBusyId(activity.id)
          setError(null)
          setSuccess(null)
          try {
            await cancelActivity(activity.id, reason.trim())
            setSuccess('Activity cancelled.')
            setRefreshVersion((version) => version + 1)
          } catch (failure) {
            setError(getApiErrorMessage(failure, `Unable to cancel activity.`))
          } finally {
            setBusyId(null)
          }
        },
      })
      return
    }

    const message = action === 'publish'
      ? `Publish "${activity.title}" for its intended audience?`
      : `Mark "${activity.title}" as completed?`

    setConfirmDialog({
      title: action === 'publish' ? 'Publish activity' : 'Mark as completed',
      description: message,
      confirmLabel: action === 'publish' ? 'Publish' : 'Mark completed',
      cancelLabel: 'Keep as is',
      destructive: false,
      onConfirm: async () => {
        setConfirmDialog(null)
        setBusyId(activity.id)
        setError(null)
        setSuccess(null)
        try {
          if (action === 'publish') {
            await publishActivity(activity.id)
            setSuccess('Activity published.')
          } else {
            await completeActivity(activity.id)
            setSuccess('Activity marked completed.')
          }
          setRefreshVersion((version) => version + 1)
        } catch (failure) {
          setError(getApiErrorMessage(failure, `Unable to ${action} activity.`))
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
        title="Activities"
        description="Plan CCS events, manage their audiences and venues, and keep a clear record of every lifecycle change."
        actions={canManage ? (
          <Button leftIcon={<Plus className="size-4" aria-hidden="true" />} onClick={() => setDialogActivity(null)}>
            New activity
          </Button>
        ) : null}
      />

      {success ? (
        <div role="status" className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
          {success}
          <button type="button" className="ml-3 text-xs font-semibold underline" onClick={() => setSuccess(null)}>Dismiss</button>
        </div>
      ) : null}
      {error ? (
        <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          {error}
          <button type="button" className="ml-3 text-xs font-semibold underline" onClick={() => setError(null)}>Dismiss</button>
        </div>
      ) : null}

      <div className="mb-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {([
          ['Total', overview.total],
          ['Upcoming', overview.upcoming],
          ['Ongoing', overview.ongoing],
          ['Completed', overview.completed],
          ['Cancelled', overview.cancelled],
          ['Drafts', overview.draft],
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
            className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
            onSubmit={(event) => {
              event.preventDefault()
              setPage(1)
              setSearch(searchInput.trim())
            }}
          >
            <TextField
              label="Search"
              value={searchInput}
              placeholder="Title, description, organizer"
              onChange={(event) => setSearchInput(event.target.value)}
            />
            <div className="space-y-1.5">
              <label htmlFor="activity-category-filter" className="block text-sm font-medium text-ink">Category</label>
              <select id="activity-category-filter" value={category} onChange={(event) => { setPage(1); setCategory(event.target.value as ActivityCategory | '') }} className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm">
                {categories.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="activity-status-filter" className="block text-sm font-medium text-ink">Status</label>
              <select id="activity-status-filter" value={status} onChange={(event) => { setPage(1); setStatus(event.target.value as ActivityStatus | '') }} className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm">
                {statuses.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="activity-audience-filter" className="block text-sm font-medium text-ink">Audience</label>
              <select id="activity-audience-filter" value={audience} onChange={(event) => { setPage(1); setAudience(event.target.value as 'all' | 'custom' | '') }} className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm">
                <option value="">All audiences</option>
                <option value="all">All active users</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <TextField label="Organizer" value={organizer} onChange={(event) => { setPage(1); setOrganizer(event.target.value) }} />
            <TextField label="From date" type="date" value={fromDate} onChange={(event) => { setPage(1); setFromDate(event.target.value) }} />
            <TextField label="To date" type="date" value={toDate} onChange={(event) => { setPage(1); setToDate(event.target.value) }} />
            <div className="flex items-end">
              <Button type="submit" variant="outline" className="w-full xl:w-auto">Search</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <div className="mt-5">
        {loading ? (
          <Card><CardBody><p role="status" className="py-8 text-center text-sm text-ink-muted">Loading activities…</p></CardBody></Card>
        ) : activities.length ? (
          <div className="space-y-3">
            {activities.map((activity) => (
              <Card key={activity.id}>
                <CardBody>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold text-ink">{activity.title}</h2>
                        <Badge tone={activityTone(activity.activity_state)}>{formatLabel(activity.activity_state)}</Badge>
                        <Badge>{formatLabel(activity.category)}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-ink-muted">
                        {activity.organizer_name} · {activity.audience_summary}
                      </p>
                      <p className="mt-3 line-clamp-2 whitespace-pre-wrap text-sm leading-6 text-ink">
                        {activity.summary || activity.description}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="size-3.5" aria-hidden="true" />
                          {formatDate(activity.starts_at)} – {formatDate(activity.ends_at)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3.5" aria-hidden="true" />
                          {activity.room
                            ? `${activity.room.code} · ${activity.room.name}`
                            : activity.venue_name || 'Venue not set'}
                          {activity.location_details ? ` · ${activity.location_details}` : ''}
                        </span>
                      </div>
                      <details className="mt-4 rounded-lg border border-line bg-slate-50 p-3">
                        <summary className="cursor-pointer text-sm font-semibold text-brand-700">Activity details</summary>
                        <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink">{activity.description}</div>
                        {activity.status === 'cancelled' ? (
                          <p className="mt-3 text-sm text-red-700">
                            Cancelled: {activity.cancellation_reason}
                          </p>
                        ) : null}
                        <p className="mt-3 text-xs text-ink-muted">
                          Created by {activity.created_by?.name ?? 'Former user'} · Updated {formatDate(activity.updated_at)}
                        </p>
                      </details>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {!['cancelled', 'completed'].includes(activity.status) ? (
                        <>
                          <Button type="button" size="sm" variant="outline" leftIcon={<Pencil className="size-3.5" aria-hidden="true" />} onClick={() => setDialogActivity(activity)}>
                            Edit
                          </Button>
                          {activity.status === 'draft' ? (
                            <Button type="button" size="sm" leftIcon={<Sparkles className="size-3.5" aria-hidden="true" />} isLoading={busyId === activity.id} onClick={() => void handleAction(activity, 'publish')}>
                              Publish
                            </Button>
                          ) : (
                            <>
                              <Button type="button" size="sm" variant="danger" leftIcon={<Archive className="size-3.5" aria-hidden="true" />} isLoading={busyId === activity.id} onClick={() => void handleAction(activity, 'cancel')}>
                                Cancel
                              </Button>
                              {activity.activity_state === 'completed' ? (
                                <Button type="button" size="sm" variant="secondary" isLoading={busyId === activity.id} onClick={() => void handleAction(activity, 'complete')}>
                                  Mark completed
                                </Button>
                              ) : null}
                            </>
                          )}
                        </>
                      ) : null}
                      <Button type="button" size="sm" variant="ghost" leftIcon={<FileClock className="size-3.5" aria-hidden="true" />} onClick={() => setHistoryActivity(activity)}>
                        History
                      </Button>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
            <div className="flex items-center justify-between rounded-xl border border-line bg-white px-4 py-3 text-sm">
              <span className="text-ink-muted">{pagination.total} activities · Page {pagination.current_page} of {pagination.last_page}</span>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                  <ChevronLeft className="size-4" aria-hidden="true" />
                </Button>
                <Button type="button" size="sm" variant="outline" aria-label="Next page" disabled={page >= pagination.last_page} onClick={() => setPage((current) => Math.min(pagination.last_page, current + 1))}>
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <Card>
            <EmptyState
              icon={Sparkles}
              title="No activities found"
              description="Create an activity draft or adjust the current filters."
              action={canManage ? <Button leftIcon={<Plus className="size-4" aria-hidden="true" />} onClick={() => setDialogActivity(null)}>Create activity</Button> : null}
            />
          </Card>
        )}
      </div>

      {dialogActivity !== undefined ? (
        <ActivityFormDialog
          key={dialogActivity?.id ?? 'new'}
          activity={dialogActivity}
          onCancel={() => setDialogActivity(undefined)}
          onSubmit={handleSave}
        />
      ) : null}
      {historyActivity ? <HistoryDialog activity={historyActivity} onClose={() => setHistoryActivity(null)} /> : null}

      {confirmDialog && (
        <ConfirmationDialog
          onClose={() => setConfirmDialog(null)}
          variant={confirmDialog.inputLabel ? 'prompt' : 'confirm'}
          title={confirmDialog.title}
          description={confirmDialog.description}
          confirmLabel={confirmDialog.confirmLabel}
          cancelLabel={confirmDialog.cancelLabel}
          destructive={confirmDialog.destructive}
          inputLabel={confirmDialog.inputLabel}
          inputPlaceholder={confirmDialog.inputPlaceholder}
          isLoading={Boolean(busyId)}
          onConfirm={confirmDialog.onConfirm}
        />
      )}
    </>
  )
}
