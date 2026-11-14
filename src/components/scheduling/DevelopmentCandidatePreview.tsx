import { AlertTriangle, Check, Clock3, LockKeyhole, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { Card, CardBody, CardHeader } from '@/components/common/Card'
import { SampleTimetableGrid } from '@/components/scheduling/SampleTimetableGrid'
import { developmentScheduleFixture } from '@/components/scheduling/developmentScheduleFixture'

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function describeChanges(
  previous: (typeof developmentScheduleFixture.baseline)[number],
  next: (typeof developmentScheduleFixture.candidate)[number],
): string[] {
  const changes: string[] = []
  if (previous.day !== next.day) changes.push(`day: ${days[previous.day - 1]} → ${days[next.day - 1]}`)
  if (previous.startTime !== next.startTime) changes.push(`start: ${previous.startTime} → ${next.startTime}`)
  if (previous.endTime !== next.endTime) changes.push(`end: ${previous.endTime} → ${next.endTime}`)
  if (previous.room !== next.room) changes.push(`room: ${previous.room} → ${next.room}`)
  return changes
}

function formatPlacement(
  placement: (typeof developmentScheduleFixture.baseline)[number] | (typeof developmentScheduleFixture.candidate)[number],
): string {
  return `${days[placement.day - 1]}, ${placement.startTime}–${placement.endTime} · ${placement.room}`
}

export function DevelopmentCandidatePreview() {
  const { baseline, candidate, requiredMeetings, requiredOfferings, unscheduledMeetings } = developmentScheduleFixture
  const baselineByMeeting = new Map<string, (typeof baseline)[number]>(
    baseline.map((placement) => [placement.meetingId, placement]),
  )
  const scheduledOfferingCount = new Set(candidate.map((placement) => placement.offeringId)).size
  const complete = (
    scheduledOfferingCount === requiredOfferings
    && candidate.length === requiredMeetings
    && unscheduledMeetings.length === 0
  )
  const comparison = candidate.map((placement) => {
    const previous = baselineByMeeting.get(placement.meetingId)
    return {
      placement,
      previous,
      changes: previous ? describeChanges(previous, placement) : [],
      kind: previous ? (describeChanges(previous, placement).length ? 'changed' : 'retained') : 'new',
    } as const
  })
  const retainedCount = comparison.filter((item) => item.kind === 'retained').length
  const changedCount = comparison.filter((item) => item.kind === 'changed').length
  const newCount = comparison.filter((item) => item.kind === 'new').length

  return (
    <div className="space-y-5">
      <div role="alert" className="flex items-start gap-3 rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-bold">DEVELOPMENT FIXTURE — synthetic sample only</p>
          <p className="mt-1 text-xs leading-5">
            This sample is not generated from the selected term, live CCSync records, or the solver. It is not saved, approved, or published.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-maroon-700">Sample generation · complete-semester candidate</p>
            <h2 className="mt-1 text-lg font-semibold text-ink">Candidate result preview</h2>
            <p className="mt-1 text-xs text-ink-muted">Synthetic term: 2026–2027 · First term · Sample generation ID: DEV-SAMPLE-001</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={complete ? 'success' : 'danger'}>{complete ? 'Complete sample' : 'Incomplete sample'}</Badge>
            <Badge tone="info">{developmentScheduleFixture.solverStatus}</Badge>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Metric label="Required offerings" value={`${requiredOfferings}`} detail="Sample configured set" />
            <Metric label="Scheduled offerings" value={`${scheduledOfferingCount} / ${requiredOfferings}`} detail={complete ? 'All sample offerings represented' : 'Candidate is incomplete'} />
            <Metric label="Scheduled meetings" value={`${candidate.length} / ${requiredMeetings}`} detail={`${unscheduledMeetings.length} unscheduled`} />
            <Metric label="Retained placements" value={`${retainedCount}`} detail="Day, start time, and room retained" />
            <Metric label="Changed / new" value={`${changedCount} / ${newCount}`} detail="Solver may change valid placements" />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-4 text-xs text-ink-muted">
            <span className="flex items-center gap-1.5"><ShieldCheck className="size-4 text-emerald-700" aria-hidden="true" /> Sample professor assignments unchanged</span>
            <span className="flex items-center gap-1.5"><Check className="size-4 text-emerald-700" aria-hidden="true" /> Sample hard constraints passed</span>
            <span className="flex items-center gap-1.5"><Clock3 className="size-4 text-ink-muted" aria-hidden="true" /> No live execution duration or progress</span>
          </div>
        </CardBody>
      </Card>

      {complete ? (
        <SampleTimetableGrid placements={candidate} />
      ) : (
        <Card>
          <CardBody>
            <div role="alert" className="flex items-start gap-3 text-sm text-red-800">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <p>This sample does not cover every required meeting. It is not shown as a successful timetable.</p>
            </div>
          </CardBody>
        </Card>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-ink">Published baseline comparison</h3>
            <p className="mt-1 text-xs text-ink-muted">Sample-only comparison by stable meeting ID; published placements are context, not fixed constraints.</p>
          </CardHeader>
          <div className="divide-y divide-line">
            {comparison.map(({ placement, previous, changes, kind }) => (
              <div key={placement.meetingId} className="grid gap-2 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center">
                <div>
                  <p className="text-sm font-semibold text-ink">{placement.subjectCode} · {placement.sectionCode}</p>
                  <p className="mt-1 text-xs text-ink-muted">Currently published</p>
                  <p className="text-xs text-ink">{previous ? formatPlacement(previous) : 'No previous placement'}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-muted">Candidate</p>
                  <p className="text-xs font-medium text-ink">{formatPlacement(placement)}</p>
                  {changes.length ? <p className="mt-1 text-[11px] text-amber-900">{changes.join(' · ')}</p> : null}
                </div>
                <Badge tone={kind === 'retained' ? 'success' : kind === 'changed' ? 'warning' : 'info'}>
                  {kind === 'retained' ? 'Retained' : kind === 'changed' ? 'Changed' : 'New'}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-semibold text-ink">Conflict and diagnostic review</h3>
            <p className="mt-1 text-xs text-ink-muted">Sample diagnostics only; no automatic fixes are proposed.</p>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <div><p className="font-semibold">No sample hard-constraint conflicts</p><p className="mt-1 text-xs">No professor, section, room, availability, capacity, or room-type violation is represented in this fixture.</p></div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <div><p className="font-semibold">Soft workload objective deviation</p><p className="mt-1 text-xs">A sample part-time target is short by 1.5 actual teaching hours. This is a soft objective, not a hard conflict.</p></div>
            </div>
            {unscheduledMeetings.length ? (
              <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                <p className="font-semibold">Unscheduled meetings</p>
                <ul className="mt-1 list-inside list-disc text-xs">{unscheduledMeetings.map((meeting) => <li key={meeting}>{meeting}</li>)}</ul>
              </div>
            ) : (
              <p className="text-xs text-ink-muted">Unscheduled meetings: 0 in this synthetic fixture.</p>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-ink">Professor workload summary</h3>
            <p className="mt-1 text-xs text-ink-muted">Teaching time uses actual duration; figures below are synthetic.</p>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead className="border-y border-line bg-surface-soft text-[10px] uppercase tracking-wide text-ink-muted">
                <tr><th className="px-5 py-2.5">Professor</th><th className="px-3 py-2.5">Type</th><th className="px-3 py-2.5">Target</th><th className="px-3 py-2.5">Generated</th><th className="px-5 py-2.5">Deviation</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {developmentScheduleFixture.workload.map((row) => (
                  <tr key={row.professor}>
                    <td className="px-5 py-3 font-medium text-ink">{row.professor}</td><td className="px-3 py-3 text-ink-muted">{row.type}</td><td className="px-3 py-3 text-ink-muted">{row.target}</td><td className="px-3 py-3 text-ink-muted">{row.actual}</td><td className="px-5 py-3 text-ink-muted">{row.deviation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-ink">Room utilization summary</h3>
            <p className="mt-1 text-xs text-ink-muted">Sample scheduled time; no live room inventory or availability is implied.</p>
          </CardHeader>
          <div className="divide-y divide-line">
            {developmentScheduleFixture.roomUtilization.map((row) => (
              <div key={row.room} className="flex items-center justify-between gap-4 px-5 py-3 text-xs">
                <span className="font-semibold text-ink">{row.room}</span>
                <span className="text-ink-muted">{row.scheduled} scheduled</span>
                <span className="text-ink-muted">{row.utilization}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h3 className="font-semibold text-ink">Candidate lifecycle</h3>
          <p className="mt-1 text-xs text-ink-muted">These are lifecycle labels, not persisted CCSync records or authorization decisions.</p>
        </CardHeader>
        <CardBody>
          <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <LifecycleStep state="current" title="Generated candidate" description="Synthetic preview only" />
            <LifecycleStep state="unavailable" title="Draft candidate" description="Save endpoint not implemented" />
            <LifecycleStep state="unavailable" title="Approved" description="Authorized role mapping unresolved" />
            <LifecycleStep state="protected" title="Published timetable" description="Current active version remains unchanged" />
          </ol>
          <p className="mt-4 flex items-start gap-2 border-t border-line pt-4 text-xs leading-5 text-ink-muted">
            <LockKeyhole className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            No save, approval, replacement, or publication operation is available in this milestone. The active timetable is never changed by this preview.
          </p>
        </CardBody>
      </Card>
    </div>
  )
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface-soft p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums text-ink">{value}</p>
      <p className="mt-1 text-[11px] leading-4 text-ink-muted">{detail}</p>
    </div>
  )
}

function LifecycleStep({
  state,
  title,
  description,
}: {
  state: 'current' | 'unavailable' | 'protected'
  title: string
  description: string
}) {
  const tone = state === 'current' ? 'info' : state === 'protected' ? 'success' : 'neutral'
  const label = state === 'current' ? 'Preview only' : state === 'protected' ? 'Unchanged' : 'Not available'

  return (
    <li className="rounded-lg border border-line p-3">
      <Badge tone={tone}>{label}</Badge>
      <p className="mt-2 text-sm font-semibold text-ink">{title}</p>
      <p className="mt-1 text-xs text-ink-muted">{description}</p>
    </li>
  )
}
