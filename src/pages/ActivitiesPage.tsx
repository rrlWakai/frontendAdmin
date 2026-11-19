/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Archive,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileClock,
  Link2,
  MapPin,
  Megaphone,
  Pencil,
  Plus,
  Send,
  Sparkles,
} from 'lucide-react'
import { ActivityFormDialog } from '@/components/activities/ActivityFormDialog'
import { PublishActivityDialog } from '@/components/activities/PublishActivityDialog'
import { AnnouncementFormDialog } from '@/components/announcements/AnnouncementFormDialog'
import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { Card, CardBody } from '@/components/common/Card'
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { SelectField } from '@/components/common/SelectField'
import { TextField } from '@/components/common/TextField'
import {
  cancelActivity,
  completeActivity,
  createActivity,
  fetchActivity,
  fetchActivityHistory,
  fetchManagedActivities,
  publishActivity,
  updateActivity,
} from '@/services/api/activities'
import {
  archiveAnnouncement,
  createAnnouncement,
  fetchAnnouncement,
  fetchAnnouncementHistory,
  fetchManagedAnnouncements,
  publishAnnouncement,
  updateAnnouncement,
} from '@/services/api/announcements'
import { useAuth } from '@/hooks/useAuth'
import type {
  Activity,
  ActivityCategory,
  ActivityHistoryEntry,
  ActivityInput,
  ActivityPagination,
  ActivityStatus,
} from '@/types/activity'
import type {
  Announcement,
  AnnouncementCategory,
  AnnouncementHistoryEntry,
  AnnouncementInput,
  AnnouncementPagination,
  AnnouncementStatus,
} from '@/types/announcement'
import { getApiErrorMessage } from '@/utils/apiError'

type WorkspaceView = 'activities' | 'announcements' | 'all'
type LinkFilter = 'all' | 'linked' | 'general'

const emptyActivityPagination: ActivityPagination = {
  current_page: 1,
  last_page: 1,
  per_page: 25,
  total: 0,
}
const emptyAnnouncementPagination: AnnouncementPagination = {
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
const announcementStatusOptions: Array<{ value: AnnouncementStatus | ''; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
]
const announcementCategoryOptions: Array<{ value: AnnouncementCategory | ''; label: string }> = [
  { value: '', label: 'All categories' },
  { value: 'general', label: 'General' },
  { value: 'academic', label: 'Academic' },
  { value: 'class_suspension', label: 'Class suspension' },
  { value: 'examination', label: 'Examination' },
  { value: 'department', label: 'Department' },
  { value: 'event', label: 'Event' },
  { value: 'advisory', label: 'Advisory' },
]
const audienceFilterOptions: Array<{ value: 'all' | 'custom' | ''; label: string }> = [
  { value: '', label: 'All audiences' },
  { value: 'all', label: 'All active users' },
  { value: 'custom', label: 'Custom audience' },
]
const linkFilterOptions: Array<{ value: LinkFilter; label: string }> = [
  { value: 'all', label: 'All announcements' },
  { value: 'linked', label: 'Activity-linked' },
  { value: 'general', label: 'General' },
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

function announcementTone(state: Announcement['publication_state']): 'neutral' | 'warning' | 'success' | 'danger' {
  if (state === 'published') return 'success'
  if (state === 'scheduled') return 'warning'
  if (state === 'expired' || state === 'archived') return 'danger'
  return 'neutral'
}

function parseFocusId(value: string | null): number | null {
  if (!value) return null
  const id = Number(value)
  return Number.isSafeInteger(id) && id >= 1 ? id : null
}

function CreateChoiceDialog({
  onClose,
  onCreateActivity,
  onCreateAnnouncement,
}: {
  onClose: () => void
  onCreateActivity: () => void
  onCreateAnnouncement: () => void
}) {
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
      aria-labelledby="create-choice-title"
      className="fixed inset-0 m-auto max-h-[92vh] w-[min(28rem,calc(100%-2rem))] overflow-y-auto rounded-2xl border border-line bg-white p-0 text-ink shadow-2xl backdrop:bg-brand-950/45"
    >
      <div className="space-y-5 p-5 sm:p-7">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">
            Campus
          </p>
          <h2 id="create-choice-title" className="mt-1 text-xl font-semibold">
            Create a record
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Activities are the campus record. Announcements communicate them or stand on their own.
          </p>
        </div>
        <div className="space-y-2 border-t border-line pt-4">
          <Button
            type="button"
            leftIcon={<Sparkles className="size-4" aria-hidden="true" />}
            className="w-full justify-center"
            onClick={onCreateActivity}
          >
            Create activity
          </Button>
          <Button
            type="button"
            variant="outline"
            leftIcon={<Megaphone className="size-4" aria-hidden="true" />}
            className="w-full justify-center"
            onClick={onCreateAnnouncement}
          >
            Create announcement
          </Button>
          <Button type="button" variant="ghost" className="w-full justify-center" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </dialog>
  )
}

function ActivityHistoryDialog({ activity, onClose }: { activity: Activity; onClose: () => void }) {
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

function AnnouncementHistoryDialog({
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
        {loading ? <p role="status" className="py-8 text-sm text-ink-muted">Loading history…</p> : null}
        {error ? <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
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

type LinkedPublicationStatus = 'activity_published' | 'draft_created' | 'publish_failed' | 'published'

interface LinkedAnnouncementWorkflow {
  activityId: number
  activityTitle: string
  status: LinkedPublicationStatus
  draft: Announcement | null
  failure: string | null
  creationAttempted?: boolean
}

interface AnnouncementDialogState {
  announcement: Announcement | null
  activity: Activity | null
  initialActivityId?: number | null
  linkedWorkflow?: boolean
}

const LINKED_WORKFLOW_STORAGE_KEY = 'ccsync.linked-announcement-workflow'

function readLinkedWorkflow(): LinkedAnnouncementWorkflow | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(LINKED_WORKFLOW_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as LinkedAnnouncementWorkflow
    return typeof parsed.activityId === 'number' && typeof parsed.activityTitle === 'string'
      ? parsed
      : null
  } catch {
    return null
  }
}

function LinkedPublicationPanel({
  workflow,
  busy,
  onFindDraft,
  onCreateDraft,
  onEditDraft,
  onContinue,
  onOpenDraft,
  onDismiss,
}: {
  workflow: LinkedAnnouncementWorkflow
  busy: boolean
  onFindDraft: () => void
  onCreateDraft: () => void
  onEditDraft: () => void
  onContinue: () => void
  onOpenDraft: () => void
  onDismiss: () => void
}) {
  const draftLabel = workflow.draft
    ? `Created · ${workflow.draft.title} (#${workflow.draft.id})`
    : workflow.creationAttempted
      ? 'Creation not confirmed · Retry will check for an existing draft'
      : 'Not created yet'
  const publicationLabel = workflow.status === 'published'
    ? 'Published or scheduled'
    : workflow.status === 'publish_failed'
      ? 'Failed'
      : 'Pending'

  return (
    <Card className="mb-5 border-brand-200 bg-brand-50/40">
      <CardBody>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">
              Linked publication
            </p>
            <h2 className="mt-1 text-base font-semibold text-ink">{workflow.activityTitle}</h2>
          </div>
          <Badge tone={workflow.status === 'published' ? 'success' : workflow.status === 'publish_failed' ? 'danger' : 'warning'}>
            {formatLabel(workflow.status)}
          </Badge>
        </div>

        <ol className="mt-4 space-y-2">
          <li className="rounded-lg border border-line bg-white px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">1 · Activity publication</p>
            <p className="mt-0.5 text-sm text-ink">Published · {workflow.activityTitle}</p>
          </li>
          <li className="rounded-lg border border-line bg-white px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">2 · Announcement draft</p>
            <p className="mt-0.5 text-sm text-ink">{draftLabel}</p>
          </li>
          <li className="rounded-lg border border-line bg-white px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">3 · Announcement publication</p>
            <p className={`mt-0.5 text-sm ${workflow.status === 'publish_failed' ? 'font-medium text-red-700' : 'text-ink'}`}>
              {publicationLabel}
            </p>
          </li>
        </ol>

        {workflow.failure ? (
          <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            Publication failed: {workflow.failure}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
          {workflow.draft && workflow.status !== 'published' ? (
            <>
              <Button type="button" size="sm" leftIcon={<Send className="size-3.5" aria-hidden="true" />} isLoading={busy} onClick={onContinue}>
                Continue publication
              </Button>
              <Button type="button" size="sm" variant="outline" leftIcon={<Pencil className="size-3.5" aria-hidden="true" />} disabled={busy} onClick={onEditDraft}>
                Edit draft
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={onOpenDraft}>
                View draft
              </Button>
            </>
          ) : null}
          {!workflow.draft ? (
            <>
              <Button type="button" size="sm" variant="outline" leftIcon={<Link2 className="size-3.5" aria-hidden="true" />} isLoading={busy} onClick={onFindDraft}>
                Find existing draft
              </Button>
              <Button type="button" size="sm" leftIcon={<Megaphone className="size-3.5" aria-hidden="true" />} disabled={busy} onClick={onCreateDraft}>
                Create linked announcement
              </Button>
            </>
          ) : null}
          {workflow.status === 'published' && workflow.draft ? (
            <Button type="button" size="sm" variant="outline" onClick={onOpenDraft}>
              View announcement
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={onDismiss}>
            Dismiss
          </Button>
        </div>
      </CardBody>
    </Card>
  )
}

export function ActivitiesPage() {
  const { user } = useAuth()
  const canManage = user?.role === 'administrator' || user?.role === 'department_personnel'
  const [searchParams, setSearchParams] = useSearchParams()
  const viewParam = searchParams.get('view')
  const view: WorkspaceView = viewParam === 'announcements' || viewParam === 'all' ? viewParam : 'activities'
  const focusedActivityId = parseFocusId(searchParams.get('activity'))
  const focusedAnnouncementId = parseFocusId(searchParams.get('announcement'))

  const [activities, setActivities] = useState<Activity[]>([])
  const [activityChoices, setActivityChoices] = useState<Activity[]>([])
  const [activityPagination, setActivityPagination] = useState(emptyActivityPagination)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<ActivityCategory | ''>('')
  const [status, setStatus] = useState<ActivityStatus | ''>('')
  const [audience, setAudience] = useState<'all' | 'custom' | ''>('')
  const [organizer, setOrganizer] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)
  const [activityRefresh, setActivityRefresh] = useState(0)
  const [activityLoading, setActivityLoading] = useState(true)

  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [announcementPagination, setAnnouncementPagination] = useState(emptyAnnouncementPagination)
  const [announcementStatus, setAnnouncementStatus] = useState<AnnouncementStatus | ''>('')
  const [announcementCategory, setAnnouncementCategory] = useState<AnnouncementCategory | ''>('')
  const [linkFilter, setLinkFilter] = useState<LinkFilter>('all')
  const [announcementSearchInput, setAnnouncementSearchInput] = useState('')
  const [announcementSearch, setAnnouncementSearch] = useState('')
  const [announcementPage, setAnnouncementPage] = useState(1)
  const [announcementRefresh, setAnnouncementRefresh] = useState(0)
  const [announcementLoading, setAnnouncementLoading] = useState(true)

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [linkedWorkflow, setLinkedWorkflow] = useState<LinkedAnnouncementWorkflow | null>(readLinkedWorkflow)
  const [workflowBusy, setWorkflowBusy] = useState(false)
  const [createChoiceOpen, setCreateChoiceOpen] = useState(false)
  const [dialogActivity, setDialogActivity] = useState<Activity | null | undefined>(undefined)
  const [announcementDialog, setAnnouncementDialog] = useState<AnnouncementDialogState | undefined>(undefined)
  const [publishActivityDialog, setPublishActivityDialog] = useState<Activity | null>(null)
  const [historyActivity, setHistoryActivity] = useState<Activity | null>(null)
  const [historyAnnouncement, setHistoryAnnouncement] = useState<Announcement | null>(null)
  const [expandedAnnouncementId, setExpandedAnnouncementId] = useState<number | null>(null)
  const [focusedActivity, setFocusedActivity] = useState<Activity | null>(null)
  const [focusedAnnouncement, setFocusedAnnouncement] = useState<Announcement | null>(null)
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
    if (typeof window === 'undefined') return
    if (linkedWorkflow) {
      window.sessionStorage.setItem(LINKED_WORKFLOW_STORAGE_KEY, JSON.stringify(linkedWorkflow))
    } else {
      window.sessionStorage.removeItem(LINKED_WORKFLOW_STORAGE_KEY)
    }
  }, [linkedWorkflow])

  useEffect(() => {
    let active = true
    void Promise.resolve().then(async () => {
      setActivityLoading(true)
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
          setActivityPagination(result.pagination)
        }
      } catch (failure) {
        if (active) setError(getApiErrorMessage(failure, 'Unable to load activities.'))
      } finally {
        if (active) setActivityLoading(false)
      }
    })

    return () => {
      active = false
    }
  }, [audience, category, fromDate, organizer, page, activityRefresh, search, status, toDate])

  useEffect(() => {
    let active = true
    void fetchManagedActivities({ per_page: 100 })
      .then((result) => {
        if (active) setActivityChoices(result.activities)
      })
      .catch(() => {
        if (active) setActivityChoices([])
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    void Promise.resolve().then(async () => {
      setAnnouncementLoading(true)
      setError(null)
      try {
        const result = await fetchManagedAnnouncements({
          search: announcementSearch || undefined,
          status: announcementStatus || undefined,
          category: announcementCategory || undefined,
          link_type: linkFilter === 'all' ? undefined : linkFilter,
          page: announcementPage,
          per_page: 25,
        })
        if (active) {
          setAnnouncements(result.announcements)
          setAnnouncementPagination(result.pagination)
        }
      } catch (failure) {
        if (active) setError(getApiErrorMessage(failure, 'Unable to load announcements.'))
      } finally {
        if (active) setAnnouncementLoading(false)
      }
    })

    return () => {
      active = false
    }
  }, [announcementCategory, announcementPage, announcementRefresh, announcementSearch, announcementStatus, linkFilter])

  useEffect(() => {
    if (!focusedActivityId) {
      setFocusedActivity(null)
      return
    }

    let active = true
    setFocusedActivity(null)
    void fetchActivity(focusedActivityId)
      .then((activity) => {
        if (active) setFocusedActivity(activity)
      })
      .catch((failure: unknown) => {
        if (active) setError(getApiErrorMessage(failure, 'Unable to load that activity.'))
      })

    return () => {
      active = false
    }
  }, [focusedActivityId])

  useEffect(() => {
    if (!focusedAnnouncementId) {
      setFocusedAnnouncement(null)
      setExpandedAnnouncementId(null)
      return
    }

    let active = true
    setFocusedAnnouncement(null)
    setExpandedAnnouncementId(focusedAnnouncementId)
    void fetchAnnouncement(focusedAnnouncementId)
      .then((announcement) => {
        if (active) setFocusedAnnouncement(announcement)
      })
      .catch((failure: unknown) => {
        if (active) setError(getApiErrorMessage(failure, 'Unable to load that announcement.'))
      })

    return () => {
      active = false
    }
  }, [focusedAnnouncementId])

  function updateView(next: WorkspaceView, focus: { activity?: number; announcement?: number } = {}) {
    const params = new URLSearchParams()
    params.set('view', next)
    if (focus.activity) params.set('activity', String(focus.activity))
    if (focus.announcement) params.set('announcement', String(focus.announcement))
    setSearchParams(params)
  }

  function openActivity(id: number) {
    updateView('activities', { activity: id })
  }

  function openAnnouncement(id: number) {
    updateView('announcements', { announcement: id })
  }

  async function handleActivitySave(payload: ActivityInput) {
    if (dialogActivity) {
      await updateActivity(dialogActivity.id, payload)
      setSuccess('Activity changes saved.')
    } else {
      await createActivity(payload)
      setSuccess('Activity draft created.')
      setPage(1)
    }
    setDialogActivity(undefined)
    setActivityRefresh((version) => version + 1)
  }

  async function handlePublishActivity(activity: Activity, withAnnouncement: boolean) {
    setPublishActivityDialog(null)
    setBusyId(activity.id)
    setError(null)
    setSuccess(null)
    try {
      await publishActivity(activity.id)
      setActivityRefresh((version) => version + 1)
      if (withAnnouncement) {
        setLinkedWorkflow({
          activityId: activity.id,
          activityTitle: activity.title,
          status: 'activity_published',
          draft: null,
          failure: null,
          creationAttempted: false,
        })
        setSuccess('Activity published. Create the linked announcement below.')
        setAnnouncementDialog({
          announcement: null,
          activity,
          initialActivityId: activity.id,
          linkedWorkflow: true,
        })
      } else {
        setSuccess('Activity published.')
      }
    } catch (failure) {
      setError(getApiErrorMessage(failure, 'Unable to publish the activity.'))
    } finally {
      setBusyId(null)
    }
  }

  async function handleActivityAction(activity: Activity, action: 'cancel' | 'complete') {
    setConfirmDialog({
      title: action === 'cancel' ? 'Cancel activity' : 'Mark as completed',
      description: action === 'cancel'
        ? `Cancel "${activity.title}"? It will remain visible and be marked as cancelled.`
        : `Mark "${activity.title}" as completed?`,
      confirmLabel: action === 'cancel' ? 'Cancel activity' : 'Mark completed',
      cancelLabel: 'Keep as is',
      destructive: action === 'cancel',
      inputLabel: action === 'cancel' ? 'Cancellation reason' : undefined,
      inputPlaceholder: action === 'cancel' ? 'Why is this activity being cancelled?' : undefined,
      onConfirm: async (reason) => {
        setConfirmDialog(null)
        if (action === 'cancel' && (!reason || reason.trim().length < 3)) {
          setError('Please provide a cancellation reason of at least three characters.')
          return
        }
        setBusyId(activity.id)
        setError(null)
        setSuccess(null)
        try {
          if (action === 'cancel') {
            await cancelActivity(activity.id, reason.trim())
            setSuccess('Activity cancelled.')
          } else {
            await completeActivity(activity.id)
            setSuccess('Activity marked completed.')
          }
          setActivityRefresh((version) => version + 1)
        } catch (failure) {
          setError(getApiErrorMessage(failure, `Unable to ${action} activity.`))
        } finally {
          setBusyId(null)
        }
      },
    })
  }

  async function findExistingDraft(activityId: number): Promise<Announcement | null> {
    const result = await fetchManagedAnnouncements({
      activity_id: activityId,
      status: 'draft',
      per_page: 25,
    })
    return result.announcements[0] ?? null
  }

  function openLinkedAnnouncementForm(draft: Announcement | null) {
    if (!linkedWorkflow) return
    const activity = draft
      ? null
      : activities.find((item) => item.id === linkedWorkflow.activityId)
        ?? activityChoices.find((item) => item.id === linkedWorkflow.activityId)
        ?? null
    setError(null)
    setSuccess(null)
    setAnnouncementDialog({
      announcement: draft,
      activity,
      initialActivityId: linkedWorkflow.activityId,
      linkedWorkflow: true,
    })
  }

  async function handleFindExistingDraft() {
    if (!linkedWorkflow) return
    setWorkflowBusy(true)
    setError(null)
    setSuccess(null)
    try {
      const draft = await findExistingDraft(linkedWorkflow.activityId)
      if (draft) {
        setLinkedWorkflow({ ...linkedWorkflow, status: 'draft_created', draft, failure: null })
        setAnnouncementRefresh((version) => version + 1)
        setSuccess('Existing announcement draft found. You can continue publication.')
      } else {
        setSuccess('No announcement draft found for this activity. You can create one.')
      }
    } catch (failure) {
      setError(getApiErrorMessage(failure, 'Unable to check for an existing announcement draft.'))
    } finally {
      setWorkflowBusy(false)
    }
  }

  async function publishTrackedDraft(
    draft: Announcement,
    base: LinkedAnnouncementWorkflow,
  ): Promise<void> {
    try {
      const published = await publishAnnouncement(draft.id)
      setLinkedWorkflow({ ...base, status: 'published', draft: published, failure: null })
      setAnnouncementRefresh((version) => version + 1)
      setSuccess('Activity published. Linked announcement published.')
    } catch (failure) {
      let confirmed: Announcement | null = null
      try {
        const current = await fetchAnnouncement(draft.id)
        if (current.status !== 'draft') confirmed = current
      } catch {
        confirmed = null
      }
      if (confirmed) {
        setLinkedWorkflow({ ...base, status: 'published', draft: confirmed, failure: null })
        setAnnouncementRefresh((version) => version + 1)
        setSuccess('Activity published. Linked announcement published.')
      } else {
        const message = getApiErrorMessage(failure, 'Unable to publish the linked announcement.')
        setLinkedWorkflow({ ...base, status: 'publish_failed', draft, failure: message })
        setSuccess('Activity published. Announcement draft saved; publication failed. Use Continue publication to retry.')
      }
    }
  }

  async function handleContinuePublication(draft: Announcement) {
    if (!linkedWorkflow) return
    setWorkflowBusy(true)
    setError(null)
    setSuccess(null)
    try {
      await publishTrackedDraft(draft, linkedWorkflow)
    } finally {
      setWorkflowBusy(false)
    }
  }

  async function handleAnnouncementSave(payload: AnnouncementInput) {
    const context = announcementDialog
    if (!context) return

    setError(null)
    setSuccess(null)

    if (context.announcement) {
      const updated = await updateAnnouncement(context.announcement.id, payload)
      if (context.linkedWorkflow && linkedWorkflow?.activityId === updated.activity_id) {
        setLinkedWorkflow({ ...linkedWorkflow, status: 'draft_created', draft: updated, failure: null })
        setSuccess('Linked announcement draft updated. Continue publication when ready.')
      } else {
        setSuccess('Announcement changes saved.')
      }
    } else if (context.linkedWorkflow && linkedWorkflow) {
      const activityId = context.activity?.id ?? linkedWorkflow.activityId
      setLinkedWorkflow({ ...linkedWorkflow, activityId, creationAttempted: true })
      const existing = linkedWorkflow.creationAttempted
        ? await findExistingDraft(activityId)
        : null
      const draft = existing
        ? await updateAnnouncement(existing.id, payload)
        : await createAnnouncement(payload)
      setAnnouncementPage(1)
      const base: LinkedAnnouncementWorkflow = {
        activityId,
        activityTitle: linkedWorkflow.activityTitle,
        status: 'draft_created',
        draft,
        failure: null,
        creationAttempted: true,
      }
      setLinkedWorkflow(base)
      await publishTrackedDraft(draft, base)
    } else {
      await createAnnouncement(payload)
      setSuccess('Draft created. Publish it when ready.')
    }

    setAnnouncementDialog(undefined)
    setAnnouncementRefresh((version) => version + 1)
  }

  async function handleAnnouncementAction(announcement: Announcement, action: 'publish' | 'archive') {
    setConfirmDialog({
      title: action === 'publish' ? 'Publish announcement' : 'Archive announcement',
      description: action === 'publish'
        ? `Publish "${announcement.title}"? A future publication date will keep it scheduled.`
        : `Archive "${announcement.title}"? Its linked activity stays available. Archived announcements cannot be edited or published.`,
      confirmLabel: action === 'publish' ? 'Publish announcement' : 'Archive announcement',
      cancelLabel: 'Cancel',
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
          setAnnouncementRefresh((version) => version + 1)
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
        eyebrow="Campus"
        title="Activities"
        description="Manage campus activities and the announcements that communicate them."
        actions={canManage ? (
          <Button leftIcon={<Plus className="size-4" aria-hidden="true" />} onClick={() => setCreateChoiceOpen(true)}>
            Create activity or announcement
          </Button>
        ) : null}
      />

      {createChoiceOpen ? (
        <CreateChoiceDialog
          onClose={() => setCreateChoiceOpen(false)}
          onCreateActivity={() => {
            setCreateChoiceOpen(false)
            setDialogActivity(null)
          }}
          onCreateAnnouncement={() => {
            setCreateChoiceOpen(false)
            setAnnouncementDialog({ announcement: null, activity: null, initialActivityId: null })
          }}
        />
      ) : null}

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

      {linkedWorkflow ? (
        <LinkedPublicationPanel
          workflow={linkedWorkflow}
          busy={workflowBusy}
          onFindDraft={() => void handleFindExistingDraft()}
          onCreateDraft={() => openLinkedAnnouncementForm(null)}
          onEditDraft={() => openLinkedAnnouncementForm(linkedWorkflow.draft)}
          onContinue={() => {
            if (linkedWorkflow.draft) void handleContinuePublication(linkedWorkflow.draft)
          }}
          onOpenDraft={() => {
            if (linkedWorkflow.draft) openAnnouncement(linkedWorkflow.draft.id)
          }}
          onDismiss={() => setLinkedWorkflow(null)}
        />
      ) : null}

      <div role="tablist" aria-label="Activities workspace" className="mb-5 flex flex-wrap gap-2 border-b border-line">
        {([
          ['activities', 'Activities'],
          ['announcements', 'Announcements'],
          ['all', 'All'],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            id={`campus-${value}-tab`}
            aria-selected={view === value}
            aria-controls={`campus-${value}-panel`}
            onClick={() => updateView(value)}
            className={`border-b-2 px-3 py-2.5 text-sm font-medium transition ${
              view === value
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <section
        role="tabpanel"
        id="campus-activities-panel"
        aria-labelledby="campus-activities-tab"
        hidden={view !== 'activities'}
      >
        {focusedActivityId ? (
          <Card className="mb-5">
            <CardBody>
              {focusedActivity ? (
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">Activity detail</p>
                    <h2 className="mt-1 text-lg font-semibold text-ink">{focusedActivity.title}</h2>
                    <p className="mt-1 text-sm text-ink-muted">
                      {formatDate(focusedActivity.starts_at)} – {formatDate(focusedActivity.ends_at)} · {focusedActivity.audience_summary}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink">{focusedActivity.description}</p>
                    {(focusedActivity.announcements?.length ?? 0) > 0 ? (
                      <div className="mt-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">Related announcements</p>
                        <ul className="mt-2 space-y-2">
                          {focusedActivity.announcements?.map((item) => (
                            <li key={item.id} className="flex flex-wrap items-center gap-2 text-sm">
                              <span>{item.title}</span>
                              <Badge>{formatLabel(item.publication_state)}</Badge>
                              <Button type="button" size="sm" variant="ghost" onClick={() => openAnnouncement(item.id)}>
                                Open announcement
                              </Button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="mt-3 text-xs text-ink-muted">No related announcements.</p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" leftIcon={<Pencil className="size-3.5" aria-hidden="true" />} onClick={() => setDialogActivity(focusedActivity)}>
                      Edit
                    </Button>
                    <Button type="button" size="sm" variant="ghost" leftIcon={<FileClock className="size-3.5" aria-hidden="true" />} onClick={() => setHistoryActivity(focusedActivity)}>
                      History
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => updateView('activities')}>Close</Button>
                  </div>
                </div>
              ) : (
                <p role="status" className="py-4 text-sm text-ink-muted">Loading activity…</p>
              )}
            </CardBody>
          </Card>
        ) : null}

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
                placeholder="Search activities..."
                onChange={(event) => setSearchInput(event.target.value)}
              />
              <SelectField
                id="activity-category-filter"
                label="Category"
                value={category}
                options={categories}
                placeholder="Select activity type"
                onChange={(value) => { setPage(1); setCategory(value as ActivityCategory | '') }}
              />
              <SelectField
                id="activity-status-filter"
                label="Status"
                value={status}
                options={statuses}
                placeholder="Select activity status"
                onChange={(value) => { setPage(1); setStatus(value as ActivityStatus | '') }}
              />
              <SelectField
                id="activity-audience-filter"
                label="Audience"
                value={audience}
                options={audienceFilterOptions}
                placeholder="Select audience"
                onChange={(value) => { setPage(1); setAudience(value as 'all' | 'custom' | '') }}
              />
              <TextField
                label="Organizer"
                value={organizer}
                placeholder="Search organizer or department"
                onChange={(event) => { setPage(1); setOrganizer(event.target.value) }}
              />
              <TextField
                label="From date"
                type="date"
                value={fromDate}
                placeholder="Select start date"
                onChange={(event) => { setPage(1); setFromDate(event.target.value) }}
              />
              <TextField
                label="To date"
                type="date"
                value={toDate}
                placeholder="Select end date"
                onChange={(event) => { setPage(1); setToDate(event.target.value) }}
              />
              <div className="flex items-end">
                <Button type="submit" variant="outline" className="w-full xl:w-auto">Search</Button>
              </div>
            </form>
          </CardBody>
        </Card>

        <div className="mt-5">
          {activityLoading ? (
            <Card><CardBody><p role="status" className="py-8 text-center text-sm text-ink-muted">Loading activities…</p></CardBody></Card>
          ) : activities.length ? (
            <div className="space-y-3">
              {activities.map((activity) => (
                <Card key={activity.id}>
                  <CardBody>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-ink">{activity.title}</h3>
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
                        <details className="mt-4 rounded-lg border border-line bg-slate-50 p-3" open={focusedActivityId === activity.id}>
                          <summary className="cursor-pointer text-sm font-semibold text-brand-700">Activity details</summary>
                          <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink">{activity.description}</div>
                          {activity.status === 'cancelled' ? (
                            <p className="mt-3 text-sm text-red-700">Cancelled: {activity.cancellation_reason}</p>
                          ) : null}
                          {activity.announcements && activity.announcements.length ? (
                            <div className="mt-4 border-t border-line pt-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">Related announcements</p>
                              <ul className="mt-2 space-y-2">
                                {activity.announcements.map((item) => (
                                  <li key={item.id} className="flex flex-wrap items-center gap-2 text-sm">
                                    <span>{item.title}</span>
                                    <Badge>{formatLabel(item.publication_state)}</Badge>
                                    <span className="text-xs text-ink-muted">{formatDate(item.published_at)}</span>
<Button type="button" size="sm" variant="ghost" onClick={() => openAnnouncement(item.id)}>Open announcement</Button>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : (
                            <p className="mt-3 text-xs text-ink-muted">No related announcements.</p>
                          )}
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
                              <Button type="button" size="sm" leftIcon={<Sparkles className="size-3.5" aria-hidden="true" />} isLoading={busyId === activity.id} onClick={() => setPublishActivityDialog(activity)}>
                                Publish
                              </Button>
                            ) : (
                              <>
                                <Button type="button" size="sm" variant="danger" leftIcon={<Archive className="size-3.5" aria-hidden="true" />} isLoading={busyId === activity.id} onClick={() => void handleActivityAction(activity, 'cancel')}>
                                  Cancel
                                </Button>
                                {activity.activity_state === 'completed' ? (
                                  <Button type="button" size="sm" variant="secondary" isLoading={busyId === activity.id} onClick={() => void handleActivityAction(activity, 'complete')}>
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
                <span className="text-ink-muted">{activityPagination.total} activities · Page {activityPagination.current_page} of {activityPagination.last_page}</span>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" aria-label="Previous activity page" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                    <ChevronLeft className="size-4" aria-hidden="true" />
                  </Button>
                  <Button type="button" size="sm" variant="outline" aria-label="Next activity page" disabled={page >= activityPagination.last_page} onClick={() => setPage((current) => Math.min(activityPagination.last_page, current + 1))}>
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
      </section>

      <section
        role="tabpanel"
        id="campus-announcements-panel"
        aria-labelledby="campus-announcements-tab"
        hidden={view !== 'announcements'}
      >
        {focusedAnnouncementId ? (
          <Card className="mb-5">
            <CardBody>
              {focusedAnnouncement ? (
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">Announcement detail</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-ink">{focusedAnnouncement.title}</h2>
                      <Badge tone={announcementTone(focusedAnnouncement.publication_state)}>
                        {formatLabel(focusedAnnouncement.publication_state)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-ink-muted">
                      {formatLabel(focusedAnnouncement.category)} · By {focusedAnnouncement.author.name} · {formatDate(focusedAnnouncement.published_at)}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink">
                      {focusedAnnouncement.summary || focusedAnnouncement.content}
                    </p>
                    {focusedAnnouncement.activity ? (
                      <Button type="button" size="sm" variant="ghost" className="mt-2" leftIcon={<Link2 className="size-3.5" aria-hidden="true" />} onClick={() => openActivity(focusedAnnouncement.activity?.id ?? 0)}>
                        Open activity: {focusedAnnouncement.activity.title}
                      </Button>
                    ) : (
                      <p className="mt-2 text-xs text-ink-muted">General announcement · No linked activity</p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" leftIcon={<Pencil className="size-3.5" aria-hidden="true" />} onClick={() => setAnnouncementDialog({ announcement: focusedAnnouncement, activity: null })}>
                      Edit
                    </Button>
                    <Button type="button" size="sm" variant="ghost" leftIcon={<FileClock className="size-3.5" aria-hidden="true" />} onClick={() => setHistoryAnnouncement(focusedAnnouncement)}>
                      History
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => updateView('announcements')}>Close</Button>
                  </div>
                </div>
              ) : (
                <p role="status" className="py-4 text-sm text-ink-muted">Loading announcement…</p>
              )}
            </CardBody>
          </Card>
        ) : null}

        <Card>
          <CardBody>
            <form
              className="grid gap-3 md:grid-cols-[minmax(14rem,1fr)_12rem_12rem_12rem_auto]"
              onSubmit={(event) => {
                event.preventDefault()
                setAnnouncementPage(1)
                setAnnouncementSearch(announcementSearchInput.trim())
              }}
            >
              <TextField
                label="Search"
                value={announcementSearchInput}
                placeholder="Search announcements..."
                onChange={(event) => setAnnouncementSearchInput(event.target.value)}
              />
              <SelectField
                id="announcement-status-filter"
                label="Status"
                value={announcementStatus}
                options={announcementStatusOptions}
                placeholder="Select publication status"
                onChange={(value) => { setAnnouncementPage(1); setAnnouncementStatus(value as AnnouncementStatus | '') }}
              />
              <SelectField
                id="announcement-category-filter"
                label="Category"
                value={announcementCategory}
                options={announcementCategoryOptions}
                placeholder="Select announcement category"
                onChange={(value) => { setAnnouncementPage(1); setAnnouncementCategory(value as AnnouncementCategory | '') }}
              />
              <SelectField
                id="announcement-link-filter"
                label="Association"
                value={linkFilter}
                options={linkFilterOptions}
                placeholder="Select association"
                onChange={(value) => { setAnnouncementPage(1); setLinkFilter(value as LinkFilter) }}
              />
              <div className="flex items-end">
                <Button type="submit" variant="outline" className="w-full md:w-auto">Search</Button>
              </div>
            </form>
          </CardBody>
        </Card>

        <div className="mt-5">
          {announcementLoading ? (
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
                          <Badge tone={announcementTone(announcement.publication_state)}>
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
                          <span>{announcement.status === 'draft' ? 'Draft' : formatDate(announcement.published_at)}</span>
                          {announcement.expires_at ? <span>Expires {formatDate(announcement.expires_at)}</span> : null}
                        </p>
                        {announcement.activity ? (
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                            <Link2 className="size-3.5" aria-hidden="true" />
                            Linked activity: {announcement.activity.title}
                            <Button type="button" size="sm" variant="ghost" onClick={() => openActivity(announcement.activity?.id ?? 0)}>
                              Open activity
                            </Button>
                          </div>
                        ) : (
                          <p className="mt-2 text-xs text-ink-muted">General announcement · No linked activity</p>
                        )}
                        {expandedAnnouncementId === announcement.id ? (
                          <div className="mt-4 rounded-lg bg-slate-50 p-4">
                            {announcement.summary ? (
                              <p className="mb-2 text-sm font-medium leading-6 text-ink">{announcement.summary}</p>
                            ) : null}
                            <p className="whitespace-pre-wrap text-sm leading-6 text-ink">{announcement.content}</p>
                          </div>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        {announcement.status !== 'archived' ? (
                          <>
                            <Button type="button" size="sm" variant="outline" leftIcon={<Pencil className="size-3.5" aria-hidden="true" />} onClick={() => setAnnouncementDialog({ announcement, activity: null })}>
                              Edit
                            </Button>
                            {announcement.status === 'draft' ? (
                              <Button type="button" size="sm" leftIcon={<Send className="size-3.5" aria-hidden="true" />} isLoading={busyId === announcement.id} onClick={() => void handleAnnouncementAction(announcement, 'publish')}>
                                Publish
                              </Button>
                            ) : (
                              <Button type="button" size="sm" variant="danger" leftIcon={<Archive className="size-3.5" aria-hidden="true" />} isLoading={busyId === announcement.id} onClick={() => void handleAnnouncementAction(announcement, 'archive')}>
                                Archive
                              </Button>
                            )}
                          </>
                        ) : null}
                        <Button type="button" size="sm" variant="ghost" leftIcon={<FileClock className="size-3.5" aria-hidden="true" />} onClick={() => setHistoryAnnouncement(announcement)}>
                          History
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          aria-expanded={expandedAnnouncementId === announcement.id}
                          aria-label={`${expandedAnnouncementId === announcement.id ? 'Hide' : 'View'} ${announcement.title}`}
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
                  {announcementPagination.total} announcements · Page {announcementPagination.current_page} of {announcementPagination.last_page}
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    aria-label="Previous announcement page"
                    disabled={announcementPage <= 1}
                    onClick={() => setAnnouncementPage((current) => Math.max(1, current - 1))}
                  >
                    <ChevronLeft className="size-4" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    aria-label="Next announcement page"
                    disabled={announcementPage >= announcementPagination.last_page}
                    onClick={() => setAnnouncementPage((current) => Math.min(announcementPagination.last_page, current + 1))}
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
                description="Create a general announcement or publish one from an activity, or adjust the current filters."
                action={canManage ? (
                  <Button leftIcon={<Plus className="size-4" aria-hidden="true" />} onClick={() => setAnnouncementDialog({ announcement: null, activity: null, initialActivityId: null })}>
                    Create announcement
                  </Button>
                ) : null}
              />
            </Card>
          )}
        </div>
      </section>

      <section
        role="tabpanel"
        id="campus-all-panel"
        aria-labelledby="campus-all-tab"
        hidden={view !== 'all'}
      >
        <div className="space-y-5">
          <Card>
            <CardBody>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">Campus records</p>
                  <h2 className="mt-1 text-lg font-semibold text-ink">Recent activities</h2>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={() => updateView('activities')}>
                  View all activities
                </Button>
              </div>
              {activityLoading ? (
                <p role="status" className="py-6 text-sm text-ink-muted">Loading activities…</p>
              ) : activities.length ? (
                <ul className="mt-4 divide-y divide-line">
                  {activities.slice(0, 5).map((activity) => (
                    <li key={activity.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink">{activity.title}</p>
                        <p className="mt-0.5 text-xs text-ink-muted">Activity · {formatDate(activity.starts_at)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone={activityTone(activity.activity_state)}>{formatLabel(activity.activity_state)}</Badge>
                        <Button type="button" size="sm" variant="ghost" onClick={() => openActivity(activity.id)}>Open</Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-6 text-sm text-ink-muted">No activities found.</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">Campus communication</p>
                  <h2 className="mt-1 text-lg font-semibold text-ink">Recent announcements</h2>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={() => updateView('announcements')}>
                  View all announcements
                </Button>
              </div>
              {announcementLoading ? (
                <p role="status" className="py-6 text-sm text-ink-muted">Loading announcements…</p>
              ) : announcements.length ? (
                <ul className="mt-4 divide-y divide-line">
                  {announcements.slice(0, 5).map((announcement) => (
                    <li key={announcement.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink">{announcement.title}</p>
                        <p className="mt-0.5 text-xs text-ink-muted">
                          Announcement · {announcement.activity ? 'Activity-linked' : 'General'} · {formatDate(announcement.published_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone={announcementTone(announcement.publication_state)}>{formatLabel(announcement.publication_state)}</Badge>
                        <Button type="button" size="sm" variant="ghost" onClick={() => openAnnouncement(announcement.id)}>Open</Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-6 text-sm text-ink-muted">No announcements found.</p>
              )}
            </CardBody>
          </Card>
        </div>
      </section>

      {dialogActivity !== undefined ? (
        <ActivityFormDialog
          key={dialogActivity?.id ?? 'new'}
          activity={dialogActivity}
          onCancel={() => setDialogActivity(undefined)}
          onSubmit={handleActivitySave}
        />
      ) : null}
      {announcementDialog ? (
        <AnnouncementFormDialog
          key={announcementDialog.announcement?.id ?? `new-${announcementDialog.activity?.id ?? announcementDialog.initialActivityId ?? 'general'}`}
          announcement={announcementDialog.announcement}
          activities={activityChoices}
          initialActivityId={announcementDialog.initialActivityId ?? null}
          sourceActivity={announcementDialog.activity}
          submitLabel={announcementDialog.linkedWorkflow && !announcementDialog.announcement
            ? 'Save and publish announcement'
            : undefined}
          onCancel={() => setAnnouncementDialog(undefined)}
          onSubmit={handleAnnouncementSave}
        />
      ) : null}
      {publishActivityDialog ? (
        <PublishActivityDialog
          key={publishActivityDialog.id}
          activity={publishActivityDialog}
          onCancel={() => setPublishActivityDialog(null)}
          onPublishOnly={() => handlePublishActivity(publishActivityDialog, false)}
          onPublishWithAnnouncement={() => handlePublishActivity(publishActivityDialog, true)}
        />
      ) : null}
      {historyActivity ? <ActivityHistoryDialog activity={historyActivity} onClose={() => setHistoryActivity(null)} /> : null}
      {historyAnnouncement ? (
        <AnnouncementHistoryDialog announcement={historyAnnouncement} onClose={() => setHistoryAnnouncement(null)} />
      ) : null}

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
