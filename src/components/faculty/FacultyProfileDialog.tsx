import { useEffect, useRef } from 'react'
import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import type {
  FacultyAvailabilityRecord,
  FacultyDetail,
  FacultyWorkload,
  FacultyWorkloadStatus,
} from '@/types/faculty'

interface FacultyProfileDialogProps {
  professor: FacultyDetail | null
  isLoading: boolean
  error: string | null
  canEditProfile: boolean
  canManageQuota: boolean
  isChangingStatus: boolean
  onClose: () => void
  onEditProfile: () => void
  onEditQuota: () => void
  onToggleStatus: () => void
  onAddAvailability: () => void
  onEditAvailability: (availability: FacultyAvailabilityRecord) => void
  onDeleteAvailability: (availability: FacultyAvailabilityRecord) => void
  onRetry: () => void
}

const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function statusTone(status: string): 'success' | 'danger' | 'neutral' {
  if (status === 'active' || status === 'available' || status === 'preferred') return 'success'
  if (status === 'suspended' || status === 'unavailable') return 'danger'
  return 'neutral'
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Unknown'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date)
}

function formatHours(value: number | null): string {
  if (value === null) return '—'

  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value)} h`
}

function formatPercent(value: number | null): string {
  if (value === null) return '—'

  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value)}%`
}

function formatSignedHours(value: number): string {
  const formatted = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value)

  return value > 0 ? `+${formatted} h` : `${formatted} h`
}

function workloadStatusLabel(status: FacultyWorkloadStatus): string {
  switch (status) {
    case 'within_quota':
      return 'Within quota'
    case 'at_quota':
      return 'At quota'
    case 'exceeds_quota':
      return 'Exceeds quota'
    case 'no_current_term':
      return 'No current term'
    case 'multiple_current_terms':
      return 'Multiple current terms'
    case 'incomplete':
      return 'Incomplete workload'
    default:
      return 'Quota not configured'
  }
}

function workloadStatusTone(
  status: FacultyWorkloadStatus,
): 'success' | 'warning' | 'danger' | 'neutral' {
  switch (status) {
    case 'within_quota':
      return 'success'
    case 'at_quota':
      return 'warning'
    case 'exceeds_quota':
      return 'danger'
    case 'no_current_term':
    case 'multiple_current_terms':
    case 'incomplete':
      return 'warning'
    default:
      return 'neutral'
  }
}

function workloadProgressWidth(workload: FacultyWorkload): number {
  if (!workload.calculation_complete) return 0

  const quota = workload.weekly_quota

  if (quota === null) return 0
  if (quota <= 0) return workload.assigned_hours > 0 ? 100 : 0

  return Math.min(100, Math.max(0, (workload.assigned_hours / quota) * 100))
}

function workloadProgressTone(status: FacultyWorkloadStatus): string {
  if (status === 'exceeds_quota') return 'bg-red-500'
  if (status === 'at_quota') return 'bg-amber-500'
  if (status === 'within_quota') return 'bg-emerald-500'

  return 'bg-stone-300'
}

export function FacultyProfileDialog({
  professor,
  isLoading,
  error,
  canEditProfile,
  canManageQuota,
  isChangingStatus,
  onClose,
  onEditProfile,
  onEditQuota,
  onToggleStatus,
  onAddAvailability,
  onEditAvailability,
  onDeleteAvailability,
  onRetry,
}: FacultyProfileDialogProps) {
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
      className="fixed inset-0 m-auto max-h-[92vh] w-[min(64rem,calc(100%-2rem))] overflow-y-auto rounded-2xl border border-line bg-white p-0 text-ink shadow-2xl backdrop:bg-brand-950/45"
      aria-labelledby="faculty-profile-title"
    >
      <div className="space-y-6 p-5 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">
              Faculty profile
            </p>
            <h2 id="faculty-profile-title" className="mt-1 text-xl font-semibold">
              {professor?.name ?? 'Faculty details'}
            </h2>
            {professor ? (
              <p className="mt-1 text-sm text-ink-muted">
                {professor.employee_number ?? 'No employee number'} · {professor.program?.code ?? 'No program'}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {professor ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!canEditProfile}
                  onClick={onEditProfile}
                >
                  Edit profile
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={professor.account_status === 'active' ? 'danger' : 'secondary'}
                  disabled={isChangingStatus}
                  onClick={onToggleStatus}
                >
                  {isChangingStatus
                    ? 'Saving…'
                    : professor.account_status === 'active'
                      ? 'Deactivate'
                      : 'Activate'}
                </Button>
              </>
            ) : null}
            <Button type="button" size="sm" variant="ghost" onClick={onClose}>Close</Button>
          </div>
        </div>

        {error ? (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p>{error}</p>
            <Button className="mt-3" size="sm" variant="outline" onClick={onRetry}>Retry</Button>
          </div>
        ) : isLoading ? (
          <div role="status" className="py-12 text-center text-sm text-ink-muted">
            Loading faculty profile…
          </div>
        ) : professor ? (
          <>
            <section className="grid gap-4 rounded-xl border border-line bg-stone-50 p-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-xs font-medium text-ink-muted">Employee number</p>
                <p className="mt-1 text-sm font-semibold text-ink">
                  {professor.employee_number ?? 'Not assigned'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-ink-muted">Email</p>
                <p className="mt-1 break-all text-sm text-ink">{professor.email}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-ink-muted">Program</p>
                <p className="mt-1 text-sm text-ink">
                  {professor.program ? `${professor.program.code} · ${professor.program.name}` : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-ink-muted">Employment type</p>
                <p className="mt-1 text-sm capitalize text-ink">{professor.employment_type.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-ink-muted">Specialization</p>
                <p className="mt-1 text-sm text-ink">{professor.specialization || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-ink-muted">Account status</p>
                <div className="mt-1">
                  <Badge tone={statusTone(professor.account_status)}>{professor.account_status}</Badge>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-ink-muted">Profile status</p>
                <p className="mt-1 text-sm capitalize text-ink">{professor.profile_status}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-ink-muted">Account created</p>
                <p className="mt-1 text-sm text-ink">{formatDate(professor.user_created_at)}</p>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">
                    Weekly workload
                  </p>
                  <h3 className="mt-1 text-lg font-semibold">Teaching-hour summary</h3>
                  <p className="mt-1 text-sm text-ink-muted">
                    {professor.workload.academic_term
                      ? `${professor.workload.academic_term.academic_year} · ${professor.workload.academic_term.name}`
                      : 'Faculty workload is unavailable for the current academic term configuration.'}
                  </p>
                  <p className="mt-1 max-w-3xl text-xs text-ink-muted">
                    Assigned hours use each distinct offering's configured lecture and laboratory weekly
                    requirements. Scheduled hours are calculated separately from published class schedules.
                  </p>
                </div>
                {canManageQuota ? (
                  <Button size="sm" variant="outline" onClick={onEditQuota}>
                    Edit weekly quota
                  </Button>
                ) : null}
              </div>

              {professor.workload.term_resolution.status !== 'resolved' ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <p className="font-semibold">Academic term configuration requires attention.</p>
                  <p className="mt-1">{professor.workload.term_resolution.message}</p>
                  {professor.workload.term_resolution.current_terms.length ? (
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                      {professor.workload.term_resolution.current_terms.map((term) => (
                        <li key={term.id}>
                          {term.academic_year} · {term.name} ({term.status})
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}

              {professor.workload.status === 'incomplete' ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <p className="font-semibold">Workload calculation is incomplete.</p>
                  <p className="mt-1">
                    Offerings with assignment conflicts or invalid subject-hour requirements are excluded from
                    assigned and scheduled totals until they are corrected.
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                    {professor.workload.issues.map((issue, index) => (
                      <li key={`${issue.code}-${issue.offering?.id ?? 'workload'}-${index}`}>
                        {issue.offering ? (
                          <span className="font-semibold">
                            {issue.offering.subject.code} · {issue.offering.section.code}:{' '}
                          </span>
                        ) : null}
                        {issue.message}
                        {issue.professors?.length ? (
                          <span>
                            {' '}
                            Conflicting professors: {issue.professors.map((entry) => entry.name).join(', ')}.
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="grid gap-4 rounded-xl border border-line bg-stone-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-xs font-medium text-ink-muted">Approved weekly quota</p>
                  <p className="mt-1 text-sm font-semibold text-ink">
                    {professor.workload.weekly_quota === null
                      ? 'Not configured'
                      : formatHours(professor.workload.weekly_quota)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-ink-muted">Total assigned</p>
                  <p className="mt-1 text-sm font-semibold text-ink">
                    {formatHours(professor.workload.assigned_hours)}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {formatHours(professor.workload.scheduled_hours)} scheduled
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-ink-muted">Remaining</p>
                  <p className="mt-1 text-sm font-semibold text-ink">
                    {professor.workload.remaining_hours === null
                      ? '—'
                      : formatHours(professor.workload.remaining_hours)}
                  </p>
                  {professor.workload.remaining_hours === null ? (
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {professor.workload.calculation_complete
                        ? 'No approved quota is configured.'
                        : 'Unavailable while workload is incomplete.'}
                    </p>
                  ) : professor.workload.excess_hours !== null && professor.workload.excess_hours > 0 ? (
                    <p className="mt-0.5 text-xs font-medium text-red-600">
                      {formatHours(professor.workload.excess_hours)} over quota
                    </p>
                  ) : null}
                </div>
                <div>
                  <p className="text-xs font-medium text-ink-muted">Workload status</p>
                  <div className="mt-1">
                    <Badge tone={workloadStatusTone(professor.workload.status)}>
                      {workloadStatusLabel(professor.workload.status)}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2 sm:col-span-2 lg:col-span-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-ink-muted">Quota utilization</span>
                    <span className="font-semibold text-ink">
                      {formatPercent(professor.workload.utilization_percentage)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-stone-200">
                    <div
                      className={`h-full rounded-full ${workloadProgressTone(professor.workload.status)}`}
                      style={{ width: `${workloadProgressWidth(professor.workload)}%` }}
                    />
                  </div>
                </div>
              </div>

              {professor.workload.status === 'not_configured' ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  No approved weekly teaching-hour quota has been configured for this professor.
                </div>
              ) : null}

              {professor.workload.status === 'exceeds_quota' ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <p className="font-semibold">
                    Assigned workload exceeds the approved quota by {formatHours(professor.workload.excess_hours)}.
                  </p>
                  <p className="mt-1">
                    Assigned {formatHours(professor.workload.assigned_hours)} against an approved quota of{' '}
                    {formatHours(professor.workload.weekly_quota)}.
                  </p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide">Contributing offerings</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-xs">
                    {professor.workload.offerings.map((offering) => (
                      <li key={offering.offering_id}>
                        {offering.subject.code} · {offering.section.code} —{' '}
                        {formatHours(offering.required_weekly_hours)}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {professor.workload.has_discrepancies ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <p className="font-semibold">
                    Scheduled meeting duration differs from the configured weekly subject requirement.
                  </p>
                  <ul className="mt-2 space-y-1 text-xs">
                    {professor.workload.discrepancies.map((discrepancy) => (
                      <li key={discrepancy.offering_id}>
                        {discrepancy.subject_code} · {discrepancy.section_code}: required{' '}
                        {formatHours(discrepancy.required_weekly_hours)}, scheduled{' '}
                        {formatHours(discrepancy.scheduled_weekly_hours)} (
                        {formatSignedHours(discrepancy.difference_hours)}).
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {professor.workload.unscheduled_offerings_count > 0 ? (
                <p className="text-xs text-ink-muted">
                  {professor.workload.unscheduled_offerings_count} assigned offering
                  {professor.workload.unscheduled_offerings_count === 1 ? '' : 's'} do not have published
                  scheduled meetings yet. Scheduled hours only include published class schedules.
                </p>
              ) : null}

              {professor.workload.offerings.length ? (
                <div className="overflow-x-auto rounded-lg border border-line">
                  <table className="w-full min-w-[820px] text-left text-sm">
                    <thead className="bg-stone-50 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                      <tr>
                        <th className="px-4 py-3">Subject</th>
                        <th className="px-4 py-3">Section</th>
                        <th className="px-4 py-3">Required</th>
                        <th className="px-4 py-3">Scheduled</th>
                        <th className="px-4 py-3">Variance</th>
                        <th className="px-4 py-3">Assignment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {professor.workload.offerings.map((offering) => (
                        <tr key={offering.offering_id}>
                          <td className="px-4 py-3">
                            <p className="font-medium">{offering.subject.title}</p>
                            <p className="mt-0.5 text-xs text-ink-muted">
                              {offering.subject.code} · lecture {formatHours(Number(offering.subject.lecture_hours))} ·
                              lab {formatHours(Number(offering.subject.lab_hours))}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <p>{offering.section.code} · {offering.section.name ?? '—'}</p>
                            <p className="mt-0.5 text-xs text-ink-muted">
                              {offering.section.program.code} · {offering.section.year_level.name}
                            </p>
                          </td>
                          <td className="px-4 py-3">{formatHours(offering.required_weekly_hours)}</td>
                          <td className="px-4 py-3">
                            {offering.has_scheduled_meetings
                              ? formatHours(offering.scheduled_weekly_hours)
                              : <span className="text-ink-muted">Not scheduled</span>}
                          </td>
                          <td className="px-4 py-3">
                            {offering.schedule_discrepancy_hours === null
                              ? '—'
                              : (
                                <span
                                  className={
                                    offering.schedule_discrepancy_hours === 0
                                      ? 'text-ink-muted'
                                      : 'font-medium text-amber-700'
                                  }
                                >
                                  {formatSignedHours(offering.schedule_discrepancy_hours)}
                                </span>
                              )}
                          </td>
                          <td className="px-4 py-3 capitalize text-ink-muted">
                            {offering.assignment_roles
                              .map((role) => role.replaceAll('_', ' '))
                              .join(' · ')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-ink-muted">
                  No active subject offerings are assigned for the current academic term.
                </p>
              )}
            </section>

            <section>
              <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">
                    Availability
                  </p>
                  <h3 className="mt-1 text-lg font-semibold">Term availability windows</h3>
                </div>
                <Button size="sm" onClick={onAddAvailability}>Add availability</Button>
              </div>
              {professor.availability.length ? (
                <div className="overflow-x-auto rounded-lg border border-line">
                  <table className="w-full min-w-[660px] text-left text-sm">
                    <thead className="bg-stone-50 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                      <tr>
                        <th className="px-4 py-3">Academic term</th>
                        <th className="px-4 py-3">Day</th>
                        <th className="px-4 py-3">Time</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {professor.availability.map((availability) => (
                        <tr key={availability.id}>
                          <td className="px-4 py-3">{availability.academic_term.academic_year} · {availability.academic_term.name}</td>
                          <td className="px-4 py-3">{dayLabels[availability.day_of_week - 1]}</td>
                          <td className="px-4 py-3">{availability.start_time}–{availability.end_time}</td>
                          <td className="px-4 py-3">
                            <Badge tone={statusTone(availability.availability_type)}>{availability.availability_type}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => onEditAvailability(availability)}>
                                Edit
                              </Button>
                              <Button size="sm" variant="danger" onClick={() => onDeleteAvailability(availability)}>
                                Remove
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-ink-muted">
                  No availability windows have been recorded.
                </p>
              )}
            </section>

            <section>
              <div className="mb-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">
                  Teaching assignments
                </p>
                <h3 className="mt-1 text-lg font-semibold">Assigned subject offerings</h3>
              </div>
              {professor.assignments.length ? (
                <div className="overflow-x-auto rounded-lg border border-line">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="bg-stone-50 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                      <tr>
                        <th className="px-4 py-3">Subject</th>
                        <th className="px-4 py-3">Section</th>
                        <th className="px-4 py-3">Term</th>
                        <th className="px-4 py-3">Assignment</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {professor.assignments.map((assignment) => {
                        const { offering } = assignment
                        return (
                          <tr key={assignment.id}>
                            <td className="px-4 py-3">
                              <p className="font-medium">{offering.subject.title}</p>
                              <p className="mt-0.5 text-xs text-ink-muted">{offering.subject.code} · {offering.subject.units} units</p>
                            </td>
                            <td className="px-4 py-3">
                              <p>{offering.section.code} · {offering.section.name}</p>
                              <p className="mt-0.5 text-xs text-ink-muted">
                                {offering.section.program.code} · {offering.section.year_level.name}
                              </p>
                            </td>
                            <td className="px-4 py-3">
                              {offering.academic_term.academic_year} · {offering.academic_term.name}
                            </td>
                            <td className="px-4 py-3 capitalize">
                              {assignment.assignment_role.replace('_', ' ')}
                              {assignment.assigned_units ? ` · ${assignment.assigned_units} units` : ''}
                            </td>
                            <td className="px-4 py-3">
                              <Badge tone={statusTone(assignment.status)}>{assignment.status}</Badge>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-ink-muted">
                  No teaching assignments have been recorded.
                </p>
              )}
            </section>
          </>
        ) : null}
      </div>
    </dialog>
  )
}
