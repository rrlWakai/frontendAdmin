import { useMemo } from 'react'
import { Badge } from '@/components/common/Badge'
import { Card, CardBody, CardHeader } from '@/components/common/Card'
import {
  REVIEW_WEEKDAYS,
  assignmentLabels,
  compareAssignments,
  diagnosticsForAssignment,
  durationBetween,
  formatDuration,
  formatTime,
  timeToMinutes,
} from '@/components/scheduling/candidateRevisionModel'
import type { PlacementChange } from '@/components/scheduling/candidateRevisionModel'
import type { SchedulerAssignment, SchedulerDiagnostic, SchedulingOptions } from '@/types/scheduling'
import { cn } from '@/utils/cn'

interface CandidateTimetableGridProps {
  assignments: SchedulerAssignment[]
  parentAssignments: SchedulerAssignment[] | null
  options: SchedulingOptions | null
  diagnostics: SchedulerDiagnostic[]
  validationErrors: string[]
  selectedId: string | null
  onSelect: (meetingInstanceId: string) => void
}

function changeTone(change: PlacementChange): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (change === 'changed') return 'warning'
  if (change === 'new') return 'success'
  if (change === 'removed') return 'danger'
  if (change === 'generated') return 'info'
  return 'neutral'
}

function changeLabel(change: PlacementChange): string {
  if (change === 'changed') return 'Changed'
  if (change === 'new') return 'New'
  if (change === 'removed') return 'Removed'
  if (change === 'generated') return 'Generated'
  return 'Unchanged'
}

function placementClasses(change: PlacementChange, hasIssue = false): string {
  if (hasIssue) return 'border-red-300 bg-red-50 text-red-950'
  if (change === 'changed') return 'border-amber-300 bg-amber-50 text-amber-950'
  if (change === 'new') return 'border-emerald-300 bg-emerald-50 text-emerald-950'
  if (change === 'generated') return 'border-maroon-200 bg-maroon-50 text-maroon-950'
  return 'border-line bg-white text-ink'
}

export function CandidateTimetableGrid({
  assignments,
  parentAssignments,
  options,
  diagnostics,
  validationErrors,
  selectedId,
  onSelect,
}: CandidateTimetableGridProps) {
  const { changes, removed } = useMemo(
    () => compareAssignments(assignments, parentAssignments),
    [assignments, parentAssignments],
  )

  const selected = assignments.find((assignment) => assignment.meeting_instance_id === selectedId) ?? null
  const selectedIssues = selected
    ? diagnosticsForAssignment(diagnostics, validationErrors, selected)
    : { diagnostics: [], errors: [] }
  const hasAnyIssue = assignments.some((assignment) => {
    const issues = diagnosticsForAssignment(diagnostics, validationErrors, assignment)
    return issues.diagnostics.length > 0 || issues.errors.length > 0
  })

  const starts = assignments.map((assignment) => timeToMinutes(assignment.start_time)).filter(Number.isFinite)
  const ends = assignments.map((assignment) => timeToMinutes(assignment.end_time)).filter(Number.isFinite)
  const firstMeeting = starts.length ? Math.min(...starts) : 8 * 60
  const lastMeeting = ends.length ? Math.max(...ends) : 17 * 60
  const startBoundary = Math.floor(firstMeeting / 60) * 60
  const endBoundary = Math.max(Math.ceil(lastMeeting / 60) * 60, startBoundary + 60)
  const pixelsPerMinute = 1.15
  const timelineHeight = (endBoundary - startBoundary) * pixelsPerMinute
  const hourMarks = Array.from(
    { length: Math.floor((endBoundary - startBoundary) / 60) + 1 },
    (_, index) => startBoundary + index * 60,
  )

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-wrap items-start justify-between gap-3 py-4">
        <div>
          <h2 className="text-sm font-semibold text-ink">Monday–Friday timetable</h2>
          <p className="mt-0.5 text-xs leading-5 text-ink-muted">
            Placements come from the persisted candidate revision. Select a meeting to inspect its details.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {hasAnyIssue ? <Badge tone="danger">Issues</Badge> : null}
          {parentAssignments ? (
            <>
              <Badge tone="warning">Changed</Badge>
              <Badge tone="success">New</Badge>
              <Badge tone="danger">Removed</Badge>
              <Badge tone="neutral">Unchanged</Badge>
            </>
          ) : (
            <Badge tone="info">Generated snapshot</Badge>
          )}
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        {assignments.length ? (
          <div className="overflow-x-auto rounded-lg border border-line">
            <div className="min-w-[820px]">
              <div
                className="grid border-b border-line bg-surface-soft"
                style={{ gridTemplateColumns: '58px repeat(5, minmax(150px, 1fr))' }}
              >
                <div className="border-r border-line px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Time</div>
                {REVIEW_WEEKDAYS.map((day) => (
                  <div key={day.value} className="border-r border-line px-2 py-2.5 text-xs font-semibold text-ink last:border-r-0">
                    {day.label}
                  </div>
                ))}
              </div>
              <div className="grid" style={{ gridTemplateColumns: '58px repeat(5, minmax(150px, 1fr))' }}>
                <div className="relative border-r border-line" style={{ height: timelineHeight }}>
                  {hourMarks.map((time) => (
                    <span
                      key={time}
                      className="absolute right-1 z-10 -translate-y-1/2 bg-white px-0.5 text-[10px] tabular-nums text-ink-muted"
                      style={{ top: (time - startBoundary) * pixelsPerMinute }}
                    >
                      {formatTime(`${String(Math.floor(time / 60)).padStart(2, '0')}:00`)}
                    </span>
                  ))}
                </div>
                {REVIEW_WEEKDAYS.map((day) => (
                  <div key={day.value} className="relative border-r border-line last:border-r-0" style={{ height: timelineHeight }}>
                    {hourMarks.map((time) => (
                      <div
                        key={time}
                        className="pointer-events-none absolute inset-x-0 border-t border-dashed border-line"
                        style={{ top: (time - startBoundary) * pixelsPerMinute }}
                        aria-hidden="true"
                      />
                    ))}
                    {assignments.filter((assignment) => assignment.day_of_week === day.value).map((assignment) => {
                      const start = timeToMinutes(assignment.start_time)
                      const end = timeToMinutes(assignment.end_time)
                      const change = changes.get(assignment.meeting_instance_id) ?? 'unchanged'
                      const issues = diagnosticsForAssignment(diagnostics, validationErrors, assignment)
                      const hasIssue = issues.diagnostics.length > 0 || issues.errors.length > 0
                      const labels = assignmentLabels(assignment, options)
                      const height = Math.max((end - start) * pixelsPerMinute - 4, 28)
                      const ariaLabel = `${labels.subject}, ${labels.section}, ${formatTime(assignment.start_time)} to ${formatTime(assignment.end_time)}, ${labels.professor}, ${labels.room}, ${labels.modality}, ${changeLabel(change)}${hasIssue ? ', validation issue' : ''}`

                      return (
                        <button
                          key={assignment.meeting_instance_id}
                          type="button"
                          onClick={() => onSelect(assignment.meeting_instance_id)}
                          aria-label={ariaLabel}
                          aria-pressed={selectedId === assignment.meeting_instance_id}
                          className={cn(
                            'absolute inset-x-1 z-10 overflow-hidden rounded-md border p-1.5 text-left text-[10px] leading-tight shadow-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-maroon-700',
                            placementClasses(change, hasIssue),
                            selectedId === assignment.meeting_instance_id && 'ring-2 ring-maroon-500 ring-offset-1',
                          )}
                          style={{ top: (start - startBoundary) * pixelsPerMinute + 2, height }}
                        >
                          <span className="block truncate font-bold">{labels.subject}</span>
                          <span className="block truncate">{formatTime(assignment.start_time)}–{formatTime(assignment.end_time)}</span>
                          <span className="hidden truncate sm:block">{labels.modality} · {labels.room} · {labels.professor}</span>
                          {parentAssignments && change !== 'unchanged' ? (
                            <span className="mt-0.5 block truncate font-semibold">{changeLabel(change)}</span>
                          ) : null}
                          {hasIssue ? <span className="absolute right-1 top-1 size-2 rounded-full bg-red-600" aria-label="Validation issue" /> : null}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p role="status" className="rounded-lg border border-line bg-surface-soft px-4 py-8 text-center text-sm text-ink-muted">
            This revision has no timetable placements.
          </p>
        )}

        {removed.length ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-xs font-semibold text-red-900">Removed from parent revision</p>
            <ul className="mt-2 space-y-1.5">
              {removed.map((assignment) => {
                const labels = assignmentLabels(assignment, options)
                return (
                  <li key={assignment.meeting_instance_id} className="text-xs leading-5 text-red-900">
                    {labels.subject} · {labels.section} · {REVIEW_WEEKDAYS.find((day) => day.value === assignment.day_of_week)?.label ?? 'Unknown day'} {formatTime(assignment.start_time)}–{formatTime(assignment.end_time)}
                  </li>
                )
              })}
            </ul>
          </div>
        ) : null}

        {selected ? (
          <div className="rounded-lg border border-line bg-surface-soft p-4" role="status">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">{assignmentLabels(selected, options).subject}</p>
                <p className="mt-1 text-xs leading-5 text-ink-muted">
                  {assignmentLabels(selected, options).section} · {REVIEW_WEEKDAYS.find((day) => day.value === selected.day_of_week)?.label ?? 'Unknown day'} {formatTime(selected.start_time)}–{formatTime(selected.end_time)} · {formatDuration(durationBetween(selected.start_time, selected.end_time))}
                </p>
              </div>
              <Badge tone={changeTone(changes.get(selected.meeting_instance_id) ?? 'unchanged')}>
                {changeLabel(changes.get(selected.meeting_instance_id) ?? 'unchanged')}
              </Badge>
            </div>
            <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
              <div><dt className="text-ink-muted">Professor</dt><dd className="font-medium text-ink">{assignmentLabels(selected, options).professor}</dd></div>
              <div><dt className="text-ink-muted">Room</dt><dd className="font-medium text-ink">{assignmentLabels(selected, options).room}</dd></div>
              <div><dt className="text-ink-muted">Meeting</dt><dd className="font-medium capitalize text-ink">{selected.meeting_type} · {selected.modality.replaceAll('_', ' ')}</dd></div>
              <div><dt className="text-ink-muted">Occurrence</dt><dd className="font-medium text-ink">{selected.occurrence_number}</dd></div>
            </dl>
            {selectedIssues.diagnostics.length || selectedIssues.errors.length ? (
              <div className="mt-3 rounded-lg border border-red-200 bg-white p-3">
                <p className="text-xs font-semibold text-red-900">Issues affecting this placement</p>
                <ul className="mt-1.5 space-y-1 text-xs leading-5 text-red-800">
                  {selectedIssues.diagnostics.map((diagnostic) => (
                    <li key={`diagnostic-${diagnostic.code}-${diagnostic.message}`}>{diagnostic.message} <span className="text-red-600">({diagnostic.code})</span></li>
                  ))}
                  {selectedIssues.errors.map((error) => <li key={error}>{error}</li>)}
                </ul>
              </div>
            ) : null}
            <p className="mt-3 border-t border-line pt-2 text-[11px] text-ink-muted">
              Meeting instance: {selected.meeting_instance_id} · Source requirement: {selected.source_requirement_id}
            </p>
          </div>
        ) : null}
      </CardBody>
    </Card>
  )
}
