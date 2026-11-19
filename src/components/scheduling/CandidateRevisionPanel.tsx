import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, History, RefreshCw, Save, Send, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { Card, CardBody, CardHeader } from '@/components/common/Card'
import { TextAreaField } from '@/components/common/TextAreaField'
import { CandidateTimetableGrid } from '@/components/scheduling/CandidateTimetableGrid'
import {
  REVIEW_WEEKDAYS,
  applyPlacementEdit,
  durationBetween,
  formatDuration,
} from '@/components/scheduling/candidateRevisionModel'
import type { PlacementEditField } from '@/components/scheduling/candidateRevisionModel'
import {
  createSchedulingCandidateRevision,
  fetchSchedulingCandidateRevision,
  fetchSchedulingCandidateRevisionEvents,
  transitionSchedulingCandidateRevision,
  updateSchedulingCandidateRevision,
  validateSchedulingCandidateRevision,
} from '@/services/api/scheduling'
import type {
  CandidateRevisionStatus,
  SchedulingCandidateDetail,
  SchedulingCandidateRevisionDetail,
  SchedulingCandidateRevisionSummary,
  SchedulingOptions,
} from '@/types/scheduling'
import { getApiErrorMessage } from '@/utils/apiError'
import { cn } from '@/utils/cn'

interface CandidateRevisionPanelProps {
  candidate: SchedulingCandidateDetail
  options: SchedulingOptions | null
  onCandidateChanged: () => Promise<void>
  onDirtyChange: (dirty: boolean) => void
}

const ACTIVE_STATUSES: CandidateRevisionStatus[] = ['draft', 'under_review', 'validated', 'needs_revision']
const EDITABLE_STATUSES: CandidateRevisionStatus[] = ['draft', 'needs_revision']
const VALIDATABLE_STATUSES: CandidateRevisionStatus[] = ['draft', 'under_review', 'needs_revision']

function isRevisionStaleError(error: unknown): boolean {
  const response = (error as { response?: { status?: number; data?: { code?: string } } }).response
  return response?.status === 409 || response?.data?.code === 'stale_candidate_revision'
}

function activeRevision(revisions: SchedulingCandidateRevisionSummary[]): SchedulingCandidateRevisionSummary | null {
  return revisions
    .filter((revision) => ACTIVE_STATUSES.includes(revision.status))
    .sort((left, right) => right.revision_number - left.revision_number)[0] ?? null
}

function revisionTone(status: CandidateRevisionStatus): 'neutral' | 'success' | 'warning' | 'info' | 'danger' {
  if (status === 'validated') return 'success'
  if (status === 'under_review') return 'info'
  if (status === 'needs_revision') return 'warning'
  if (status === 'draft') return 'neutral'
  return 'danger'
}

function formatTimestamp(value: string | null): string {
  if (!value) return 'Not recorded'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function revisionSelectionKey(revisions: SchedulingCandidateRevisionSummary[]): string {
  return revisions.map((revision) => `${revision.uuid}:${revision.status}:${revision.version}`).join('|')
}

export function CandidateRevisionPanel({
  candidate,
  options,
  onCandidateChanged,
  onDirtyChange,
}: CandidateRevisionPanelProps) {
  const active = useMemo(() => activeRevision(candidate.revisions), [candidate.revisions])
  const currentSelectionKey = revisionSelectionKey(candidate.revisions)
  const [selectionSourceKey, setSelectionSourceKey] = useState(currentSelectionKey)
  const [selectedUuid, setSelectedUuid] = useState<string | null>(
    () => (activeRevision(candidate.revisions) ?? candidate.revisions[0])?.uuid ?? null,
  )
  if (currentSelectionKey !== selectionSourceKey) {
    setSelectionSourceKey(currentSelectionKey)
    setSelectedUuid((previous) => {
      if (previous && candidate.revisions.some((revision) => revision.uuid === previous)) return previous
      return (activeRevision(candidate.revisions) ?? candidate.revisions[0])?.uuid ?? null
    })
  }
  const [detail, setDetail] = useState<SchedulingCandidateRevisionDetail | null>(null)
  const [parentDetail, setParentDetail] = useState<SchedulingCandidateRevisionDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [reloadVersion, setReloadVersion] = useState(0)
  const [draftAssignments, setDraftAssignments] = useState<SchedulingCandidateRevisionDetail['content']['assignments']>([])
  const [changeSummary, setChangeSummary] = useState('')
  const [actionReason, setActionReason] = useState('')
  const [newRevisionSummary, setNewRevisionSummary] = useState('')
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionNotice, setActionNotice] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const loadKey = `${selectedUuid ?? ''}:${reloadVersion}`
  const [loadedKey, setLoadedKey] = useState('')
  if (loadedKey !== loadKey) {
    setLoadedKey(loadKey)
    setDetail(null)
    setParentDetail(null)
    setDetailLoading(Boolean(selectedUuid))
    setDetailError(null)
  }

  useEffect(() => {
    if (!selectedUuid) return
    let current = true

    void (async () => {
      try {
        const result = await fetchSchedulingCandidateRevision(selectedUuid)
        if (!current) return
        setDetail(result)
        setDraftAssignments(result.content.assignments)
        setChangeSummary('')
        setActionReason('')
        setValidationErrors([])
        setSelectedMeetingId(result.content.assignments[0]?.meeting_instance_id ?? null)

        const parent = result.revision.parent_revision_id === null
          ? null
          : candidate.revisions.find((revision) => revision.revision_number === result.revision.revision_number - 1)
        if (parent) {
          try {
            const parentResult = await fetchSchedulingCandidateRevision(parent.uuid)
            if (current) setParentDetail(parentResult)
          } catch {
            if (current) setParentDetail(null)
          }
        } else if (current) {
          setParentDetail(null)
        }
      } catch (failure) {
        if (current) {
          setDetail(null)
          setDetailError(getApiErrorMessage(failure, 'Unable to load this candidate revision.'))
        }
      } finally {
        if (current) setDetailLoading(false)
      }
    })()

    return () => { current = false }
  }, [candidate.revisions, reloadVersion, selectedUuid])

  const originalAssignments = detail?.content.assignments ?? []
  const dirty = Boolean(changeSummary.trim())
    || JSON.stringify(draftAssignments) !== JSON.stringify(originalAssignments)

  useEffect(() => {
    onDirtyChange(dirty)
  }, [dirty, onDirtyChange])

  useEffect(() => () => onDirtyChange(false), [onDirtyChange])

  const isEditable = Boolean(
    detail
    && active
    && detail.revision.uuid === active.uuid
    && EDITABLE_STATUSES.includes(detail.revision.status),
  )

  const canValidate = Boolean(
    detail
    && active
    && detail.revision.uuid === active.uuid
    && VALIDATABLE_STATUSES.includes(detail.revision.status),
  )

  const canCreateRevision = !active || (active !== null && !EDITABLE_STATUSES.includes(active.status))

  const issueError = useCallback((error: unknown, fallback: string) => {
    if (isRevisionStaleError(error)) {
      setActionError(`This revision changed in another session. Your edits are preserved. Reload the latest revision before retrying. ${getApiErrorMessage(error, fallback)}`)
      return
    }
    setActionError(getApiErrorMessage(error, fallback))
  }, [])

  function handlePlacementChange(meetingInstanceId: string, field: PlacementEditField, value: string) {
    setDraftAssignments((current) => current.map((assignment) => (
      assignment.meeting_instance_id === meetingInstanceId
        ? applyPlacementEdit(assignment, field, value)
        : assignment
    )))
  }

  function validateDraft(): string | null {
    if (!changeSummary.trim()) return 'Enter a change summary before saving.'
    if (!dirty) return 'Change a placement or enter a change summary before saving.'

    for (const assignment of draftAssignments) {
      if (!Number.isInteger(assignment.day_of_week) || assignment.day_of_week < 1 || assignment.day_of_week > 5) {
        return `${assignment.meeting_instance_id}: choose Monday through Friday.`
      }
      if (!/^\d{2}:\d{2}$/.test(assignment.start_time) || !/^\d{2}:\d{2}$/.test(assignment.end_time)) {
        return `${assignment.meeting_instance_id}: times must use HH:MM.`
      }
      if (durationBetween(assignment.start_time, assignment.end_time) <= 0) {
        return `${assignment.meeting_instance_id}: end time must be after start time.`
      }
    }

    return null
  }

  async function handleSave() {
    if (!detail) return
    const error = validateDraft()
    if (error) {
      setActionError(error)
      return
    }

    setBusy(true)
    setActionError(null)
    setActionNotice(null)
    try {
      await updateSchedulingCandidateRevision(detail.revision.uuid, {
        expected_version: detail.revision.version,
        change_summary: changeSummary.trim(),
        changes: { assignments: draftAssignments },
      })
      setActionNotice('Revision changes saved and recorded in the event history.')
      setNewRevisionSummary('')
      setReloadVersion((value) => value + 1)
      await onCandidateChanged()
    } catch (failure) {
      issueError(failure, 'Unable to save revision changes.')
    } finally {
      setBusy(false)
    }
  }

  async function handleCreateRevision() {
    if (!newRevisionSummary.trim()) {
      setActionError('Enter a change summary for the new revision.')
      return
    }
    if (dirty && !window.confirm('Create a new revision? Unsaved edits in the current revision will be discarded.')) return

    setBusy(true)
    setActionError(null)
    setActionNotice(null)
    try {
      const revision = await createSchedulingCandidateRevision(candidate.candidate.uuid, active
        ? {
            change_summary: newRevisionSummary.trim(),
            parent_revision_uuid: active.uuid,
            expected_version: active.version,
          }
        : { change_summary: newRevisionSummary.trim() })
      setSelectedUuid(revision.uuid)
      setNewRevisionSummary('')
      setActionNotice(`Revision #${revision.revision_number} created as a draft.`)
      setReloadVersion((value) => value + 1)
      await onCandidateChanged()
    } catch (failure) {
      issueError(failure, 'Unable to create a candidate revision.')
    } finally {
      setBusy(false)
    }
  }

  async function handleRevisionAction(kind: 'validate' | 'transition', toStatus?: CandidateRevisionStatus) {
    if (!detail) return
    if (dirty) {
      setActionError('Save or discard your edits before changing the revision status.')
      return
    }
    if (!actionReason.trim()) {
      setActionError(kind === 'validate' ? 'Enter a validation reason.' : 'Enter a transition reason.')
      return
    }

    setBusy(true)
    setActionError(null)
    setActionNotice(null)
    setValidationErrors([])
    try {
      if (kind === 'validate') {
        const result = await validateSchedulingCandidateRevision(detail.revision.uuid, {
          expected_version: detail.revision.version,
          reason: actionReason.trim(),
        })
        setValidationErrors(result.errors)
        setActionNotice(result.errors.length
          ? 'Validation found errors. Review the diagnostics below.'
          : 'Validation passed.')
      } else {
        await transitionSchedulingCandidateRevision(detail.revision.uuid, {
          expected_version: detail.revision.version,
          to_status: toStatus as CandidateRevisionStatus,
          reason: actionReason.trim(),
        })
        setActionNotice(`Revision moved to ${(toStatus ?? '').replaceAll('_', ' ')}.`)
      }
      setActionReason('')
      setReloadVersion((value) => value + 1)
      await onCandidateChanged()
    } catch (failure) {
      issueError(failure, kind === 'validate' ? 'Unable to validate this revision.' : 'Unable to change the revision status.')
    } finally {
      setBusy(false)
    }
  }

  async function handleRefreshEvents() {
    if (!detail) return
    setBusy(true)
    setActionError(null)
    try {
      const events = await fetchSchedulingCandidateRevisionEvents(detail.revision.uuid)
      setDetail({ ...detail, status_events: events })
    } catch (failure) {
      issueError(failure, 'Unable to refresh the revision event history.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="py-4">
          <h2 className="text-sm font-semibold text-ink">Revision history</h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            The original generated snapshot and every review revision remain available. Only the active revision can be edited.
          </p>
        </CardHeader>
        <div className="divide-y divide-line">
          {candidate.revisions.length ? candidate.revisions.map((revision) => {
            const isActive = active?.uuid === revision.uuid
            const selected = detail?.revision.uuid === revision.uuid
            return (
              <button
                key={revision.uuid}
                type="button"
                onClick={() => setSelectedUuid(revision.uuid)}
                aria-pressed={selected}
                className={cn(
                  'flex w-full flex-wrap items-start justify-between gap-2 px-5 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-maroon-600',
                  selected ? 'bg-maroon-50/70' : 'hover:bg-surface-soft',
                )}
              >
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-ink">Revision #{revision.revision_number}</span>
                    <Badge tone={revisionTone(revision.status)}>{revision.status.replaceAll('_', ' ')}</Badge>
                    {isActive ? <Badge tone="info">Active</Badge> : null}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-ink-muted">{revision.change_summary}</span>
                  <span className="mt-0.5 block text-[11px] text-ink-muted">
                    Version {revision.version} · {revision.validation_status.replaceAll('_', ' ')} · {formatTimestamp(revision.created_at)}
                  </span>
                </span>
              </button>
            )
          }) : (
            <p className="px-5 py-4 text-xs text-ink-muted">
              No revisions have been created for this candidate yet.
            </p>
          )}
        </div>
      </Card>

      {detailError ? (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-5 text-red-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>{detailError}</p>
        </div>
      ) : null}

      {detailLoading ? (
        <div role="status" className="flex items-center gap-2 rounded-xl border border-line bg-white px-5 py-8 text-sm text-ink-muted">
          <RefreshCw className="size-4 animate-spin" aria-hidden="true" />
          Loading revision content…
        </div>
      ) : detail ? (
        <>
          <Card>
            <CardHeader className="flex flex-wrap items-start justify-between gap-3 py-4">
              <div>
                <h2 className="text-sm font-semibold text-ink">Revision #{detail.revision.revision_number}</h2>
                <p className="mt-0.5 text-xs leading-5 text-ink-muted">
                  {detail.revision.parent_revision_id === null
                    ? 'Original generated snapshot'
                    : `Review revision based on the parent snapshot`}
                  · Version {detail.revision.version}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={revisionTone(detail.revision.status)}>{detail.revision.status.replaceAll('_', ' ')}</Badge>
                <Badge tone={detail.revision.validation_status === 'valid' ? 'success' : detail.revision.validation_status === 'invalid' ? 'danger' : 'neutral'}>
                  {detail.revision.validation_status.replaceAll('_', ' ')}
                </Badge>
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              {canCreateRevision ? (
                <div className="rounded-lg border border-line bg-surface-soft p-3">
                  <TextAreaField
                    label="Change summary for new revision"
                    rows={2}
                    maxLength={1000}
                    value={newRevisionSummary}
                    onChange={(event) => setNewRevisionSummary(event.target.value)}
                    placeholder="Describe what this revision will change"
                  />
                  <div className="mt-3 flex justify-end">
                    <Button type="button" size="sm" isLoading={busy} disabled={!newRevisionSummary.trim()} onClick={() => void handleCreateRevision()}>
                      {active ? 'Create revision from active' : 'Create first review revision'}
                    </Button>
                  </div>
                </div>
              ) : null}

              {isEditable ? (
                <div className="rounded-lg border border-line bg-surface-soft p-3">
                  <TextAreaField
                    label="Change summary"
                    rows={2}
                    maxLength={1000}
                    value={changeSummary}
                    onChange={(event) => setChangeSummary(event.target.value)}
                    placeholder="Describe the placement changes"
                    error={actionError?.includes('change summary') ? actionError : undefined}
                  />
                  <p className="mt-2 text-[11px] leading-4 text-ink-muted">
                    Editable fields: day, start time, end time, and room. Other assignment data is preserved from the original contract payload.
                  </p>
                </div>
              ) : null}

              {actionNotice ? <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{actionNotice}</p> : null}
              {actionError ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-800">{actionError}</p> : null}
              {validationErrors.length ? (
                <div className="rounded-lg border border-red-200 bg-white p-3">
                  <p className="text-xs font-semibold text-red-900">Validation errors</p>
                  <ul className="mt-1.5 space-y-1 text-xs leading-5 text-red-800">
                    {validationErrors.map((error) => <li key={error}>{error}</li>)}
                  </ul>
                </div>
              ) : null}

              <CandidateTimetableGrid
                assignments={draftAssignments}
                parentAssignments={parentDetail?.content.assignments ?? null}
                options={options}
                diagnostics={[]}
                validationErrors={detail.content.validation_summary.validation_errors}
                selectedId={selectedMeetingId}
                onSelect={setSelectedMeetingId}
              />

              {isEditable && selectedMeetingId ? (
                <div className="rounded-lg border border-line p-3">
                  <p className="text-xs font-semibold text-ink">Edit selected placement</p>
                  {draftAssignments.filter((assignment) => assignment.meeting_instance_id === selectedMeetingId).map((assignment) => {
                    const roomId = assignment.room_id ?? ''
                    const knownRooms = options?.rooms ?? []
                    const roomOptions = roomId && !knownRooms.some((room) => String(room.id) === roomId)
                      ? [{ id: Number(roomId), code: roomId, name: roomId, building: null, capacity: 0, room_type: '', status: '' }]
                      : knownRooms
                    const fieldClass = 'h-9 rounded-lg border border-line bg-white px-2 text-xs text-ink focus-visible:outline-2 focus-visible:outline-maroon-600'

                    return (
                      <div key={assignment.meeting_instance_id} className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <label className="text-xs font-medium text-ink-muted">
                          Day
                          <select
                            value={assignment.day_of_week}
                            onChange={(event) => handlePlacementChange(assignment.meeting_instance_id, 'day_of_week', event.target.value)}
                            className={`${fieldClass} mt-1 w-full`}
                          >
                            {REVIEW_WEEKDAYS.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}
                          </select>
                        </label>
                        <label className="text-xs font-medium text-ink-muted">
                          Start time
                          <input
                            type="time"
                            value={assignment.start_time}
                            onChange={(event) => handlePlacementChange(assignment.meeting_instance_id, 'start_time', event.target.value)}
                            className={`${fieldClass} mt-1 w-full`}
                          />
                        </label>
                        <label className="text-xs font-medium text-ink-muted">
                          End time
                          <input
                            type="time"
                            value={assignment.end_time}
                            onChange={(event) => handlePlacementChange(assignment.meeting_instance_id, 'end_time', event.target.value)}
                            className={`${fieldClass} mt-1 w-full`}
                          />
                        </label>
                        <label className="text-xs font-medium text-ink-muted">
                          Room
                          <select
                            value={roomId}
                            onChange={(event) => handlePlacementChange(assignment.meeting_instance_id, 'room_id', event.target.value)}
                            className={`${fieldClass} mt-1 w-full`}
                          >
                            <option value="">No room</option>
                            {roomOptions.map((room) => (
                              <option key={room.id} value={room.id}>{room.code}{room.building ? ` · ${room.building}` : ''}</option>
                            ))}
                          </select>
                        </label>
                        <p className="text-[11px] text-ink-muted sm:col-span-2 lg:col-span-4">
                          Duration follows the edited times: {formatDuration(durationBetween(assignment.start_time, assignment.end_time))}. Backend validation checks meeting duration, room, professor, and overlap rules.
                        </p>
                      </div>
                    )
                  })}
                </div>
              ) : null}

              {isEditable ? (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                  <span className="text-xs text-ink-muted">
                    {dirty ? 'Unsaved edits are kept if the request fails.' : 'No unsaved placement edits.'}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!dirty || busy}
                      onClick={() => {
                        setDraftAssignments(originalAssignments)
                        setChangeSummary('')
                        setActionError(null)
                      }}
                    >
                      Discard edits
                    </Button>
                    <Button type="button" size="sm" isLoading={busy} disabled={!dirty} onClick={() => void handleSave()} leftIcon={<Save className="size-4" aria-hidden="true" />}>
                      Save revision
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="py-4">
              <h2 className="text-sm font-semibold text-ink">Validation and review actions</h2>
              <p className="mt-0.5 text-xs text-ink-muted">
                Available actions follow the backend transition rules. Approval and publication are not part of this workflow.
              </p>
            </CardHeader>
            <CardBody className="space-y-4">
              {canValidate || detail.revision.status === 'validated' ? (
                <TextAreaField
                  label="Reason"
                  rows={2}
                  maxLength={1000}
                  value={actionReason}
                  onChange={(event) => setActionReason(event.target.value)}
                  placeholder="Reason for validation or status change"
                  disabled={busy}
                />
              ) : null}
              <div className="flex flex-wrap gap-2">
                {canValidate ? (
                  <Button type="button" size="sm" variant="outline" disabled={busy || dirty} isLoading={busy} onClick={() => void handleRevisionAction('validate')} leftIcon={<ShieldCheck className="size-4" aria-hidden="true" />}>
                    Validate revision
                  </Button>
                ) : null}
                {detail.revision.status === 'draft' ? (
                  <Button type="button" size="sm" disabled={busy || dirty || detail.revision.validation_status !== 'valid'} onClick={() => void handleRevisionAction('transition', 'under_review')} leftIcon={<Send className="size-4" aria-hidden="true" />}>
                    Submit for review
                  </Button>
                ) : null}
                {detail.revision.status === 'under_review' ? (
                  <Button type="button" size="sm" disabled={busy || dirty || detail.revision.validation_status !== 'valid'} onClick={() => void handleRevisionAction('transition', 'validated')}>
                    Mark validated
                  </Button>
                ) : null}
                {detail.revision.status === 'under_review' || detail.revision.status === 'validated' ? (
                  <Button type="button" size="sm" variant="outline" disabled={busy || dirty} onClick={() => void handleRevisionAction('transition', 'needs_revision')}>
                    Request changes
                  </Button>
                ) : null}
                {detail.revision.status === 'needs_revision' ? (
                  <Button type="button" size="sm" variant="outline" disabled={busy || dirty} onClick={() => void handleRevisionAction('transition', 'draft')}>
                    Return to draft
                  </Button>
                ) : null}
              </div>
              {detail.revision.status === 'draft' && detail.revision.validation_status !== 'valid' ? (
                <p className="text-[11px] leading-4 text-ink-muted">
                  Validate successfully before submitting this draft for review.
                </p>
              ) : null}
              {dirty ? (
                <p className="text-[11px] leading-4 text-amber-800">
                  Save or discard your edits before running validation or changing status.
                </p>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="flex flex-wrap items-center justify-between gap-2 py-4">
              <div className="flex items-center gap-2">
                <History className="size-4 text-maroon-700" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-ink">Event history</h2>
              </div>
              <Button type="button" size="sm" variant="ghost" isLoading={busy} onClick={() => void handleRefreshEvents()}>
                Refresh
              </Button>
            </CardHeader>
            <ol className="divide-y divide-line">
              {detail.status_events.length ? [...detail.status_events].reverse().map((event) => (
                <li key={event.id} className="px-5 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={event.event_type === 'validation' ? 'info' : event.event_type === 'content_update' ? 'warning' : 'neutral'}>
                        {event.event_type.replaceAll('_', ' ')}
                      </Badge>
                      {event.is_status_transition && event.from_status ? (
                        <span className="text-xs font-medium text-ink">
                          {event.from_status.replaceAll('_', ' ')} → {event.to_status.replaceAll('_', ' ')}
                        </span>
                      ) : null}
                    </div>
                    <span className="text-[11px] text-ink-muted">{formatTimestamp(event.created_at)}</span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-ink-muted">
                    {event.reason || 'No reason recorded'}
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink-muted">
                    Actor: {event.actor_user_id === null ? 'System' : `User #${event.actor_user_id}`} · Version {event.expected_version ?? '—'} → {event.observed_version}
                  </p>
                </li>
              )) : (
                <li className="px-5 py-4 text-xs text-ink-muted">No events are recorded for this revision.</li>
              )}
            </ol>
          </Card>
        </>
      ) : null}
    </div>
  )
}
