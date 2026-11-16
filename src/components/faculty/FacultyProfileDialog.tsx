import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
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

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)

  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || '?'
}

function groupAvailability(records: FacultyAvailabilityRecord[]) {
  const terms = new Map<number, {
    term: FacultyAvailabilityRecord['academic_term']
    records: FacultyAvailabilityRecord[]
  }>()

  for (const record of records) {
    const existing = terms.get(record.academic_term.id)
    if (existing) existing.records.push(record)
    else terms.set(record.academic_term.id, { term: record.academic_term, records: [record] })
  }

  return [...terms.values()]
    .sort((first, second) => (
      first.term.academic_year.localeCompare(second.term.academic_year)
      || first.term.name.localeCompare(second.term.name)
    ))
    .map(({ term, records: termRecords }) => ({
      term,
      days: dayLabels.map((label, index) => ({
        day: index + 1,
        label,
        records: termRecords
          .filter((record) => record.day_of_week === index + 1)
          .sort((first, second) => first.start_time.localeCompare(second.start_time)),
      })).filter((day) => day.records.length > 0),
    }))
}

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

  const availabilityGroups = professor ? groupAvailability(professor.availability) : []

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      className="fixed inset-0 m-auto max-h-[92dvh] w-[min(64rem,calc(100%-2rem))] overflow-hidden rounded-xl border border-line bg-white p-0 text-ink shadow-2xl backdrop:bg-maroon-900/40"
      aria-labelledby="faculty-profile-title"
    >
      <div className="flex max-h-[92dvh] flex-col">
        <header className="flex flex-col gap-4 border-b border-line bg-white px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-7">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-maroon-100 bg-maroon-50 text-sm font-semibold text-maroon-700"
              aria-hidden="true"
            >
              {initials(professor?.name ?? 'Faculty')}
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-maroon-600">
                Faculty profile
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h2 id="faculty-profile-title" className="text-xl font-semibold">
                  {professor?.name ?? 'Faculty details'}
                </h2>
                {professor ? (
                  <Badge tone={statusTone(professor.account_status)}>{professor.account_status}</Badge>
                ) : null}
              </div>
              {professor ? (
                <p className="mt-1 text-sm text-ink-muted">
                  {professor.employee_number ?? 'No employee number'} · {professor.program?.code ?? 'No program'}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
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
                  variant={professor.account_status === 'active' ? 'outline' : 'secondary'}
                  className={professor.account_status === 'active'
                    ? '!text-red-600 hover:!border-red-200 hover:!bg-red-50'
                    : undefined}
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
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-ink-muted transition-colors hover:bg-maroon-50 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon-600"
              aria-label="Close faculty profile"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5 sm:p-7">
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
            <section className="space-y-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-maroon-600">
                  Profile details
                </p>
                <h3 className="mt-1 text-lg font-semibold">Faculty information</h3>
              </div>
              <dl className="grid gap-x-6 gap-y-4 rounded-xl border border-line bg-stone-50 p-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <dt className="text-xs font-medium text-ink-muted">Employee number</dt>
                  <dd className="mt-1 text-sm font-semibold text-ink">
                    {professor.employee_number ?? 'Not assigned'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-ink-muted">Email</dt>
                  <dd className="mt-1 break-all text-sm text-ink">{professor.email}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-ink-muted">Program</dt>
                  <dd className="mt-1 text-sm text-ink">
                    {professor.program ? `${professor.program.code} · ${professor.program.name}` : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-ink-muted">Employment type</dt>
                  <dd className="mt-1 text-sm capitalize text-ink">
                    {professor.employment_type.replaceAll('_', ' ')}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-ink-muted">Specialization</dt>
                  <dd className="mt-1 text-sm text-ink">{professor.specialization || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-ink-muted">Profile status</dt>
                  <dd className="mt-1 text-sm capitalize text-ink">{professor.profile_status}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-ink-muted">Account created</dt>
                  <dd className="mt-1 text-sm text-ink">{formatDate(professor.user_created_at)}</dd>
                </div>
              </dl>
            </section>

            <section className="space-y-4">
              <div className="flex flex-col gap-3 border-b border-line pb-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-maroon-600">
                    Weekly workload
                  </p>
                  <h3 className="mt-1 text-lg font-semibold">Teaching-hour summary</h3>
                  <p className="mt-1 text-sm text-ink-muted">
                    {professor.workload.academic_term
                      ? `${professor.workload.academic_term.academic_year} · ${professor.workload.academic_term.name}`
                      : 'Faculty workload is unavailable for the current academic term configuration.'}
                  </p>
                  <p className="mt-1 max-w-3xl text-xs leading-relaxed text-ink-muted">
                    Assigned hours use each distinct offering&apos;s configured lecture and laboratory weekly
                    requirements. Scheduled hours are calculated separately from published class schedules.
                  </p>
                </div>
                {canManageQuota ? (
                  <Button size="sm" variant="outline" onClick={onEditQuota} className="shrink-0 self-start">
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

              <div className="overflow-hidden rounded-xl border border-line">
                <div className="grid divide-y divide-line sm:grid-cols-2 sm:divide-x lg:grid-cols-4 lg:divide-y-0">
                  <div className="p-4">
                    <p className="text-xs font-medium text-ink-muted">Approved weekly quota</p>
                    <p className="mt-1.5 text-lg font-semibold tabular-nums text-ink">
                      {professor.workload.weekly_quota === null
                        ? 'Not configured'
                        : formatHours(professor.workload.weekly_quota)}
                    </p>
                  </div>
                  <div className="p-4">
                    <p className="text-xs font-medium text-ink-muted">Total assigned</p>
                    <p className="mt-1.5 text-lg font-semibold tabular-nums text-ink">
                      {formatHours(professor.workload.assigned_hours)}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {formatHours(professor.workload.scheduled_hours)} scheduled
                    </p>
                  </div>
                  <div className="p-4">
                    <p className="text-xs font-medium text-ink-muted">Remaining</p>
                    <p className="mt-1.5 text-lg font-semibold tabular-nums text-ink">
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
                  <div className="p-4">
                    <p className="text-xs font-medium text-ink-muted">Workload status</p>
                    <div className="mt-2">
                      <Badge tone={workloadStatusTone(professor.workload.status)}>
                        {workloadStatusLabel(professor.workload.status)}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 border-t border-line bg-stone-50 px-4 py-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-ink-muted">Quota utilization</span>
                    <span className="font-semibold tabular-nums text-ink">
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
                        <th scope="col" className="px-4 py-3">Subject</th>
                        <th scope="col" className="px-4 py-3">Section</th>
                        <th scope="col" className="px-4 py-3">Required</th>
                        <th scope="col" className="px-4 py-3">Scheduled</th>
                        <th scope="col" className="px-4 py-3">Variance</th>
                        <th scope="col" className="px-4 py-3">Assignment</th>
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

            <section className="space-y-3">
              <div className="flex flex-col gap-3 border-b border-line pb-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-maroon-600">
                    Availability
                  </p>
                  <h3 className="mt-1 text-lg font-semibold">Term availability windows</h3>
                  <p className="mt-1 text-sm text-ink-muted">
                    Availability is managed per academic term. No configured windows means unrestricted availability.
                  </p>
                </div>
                <Button size="sm" onClick={onAddAvailability} className="shrink-0 self-start">
                  Add availability
                </Button>
              </div>
              {professor.availability.length ? (
                <div className="space-y-4">
                  {availabilityGroups.map((group) => (
                    <div key={group.term.id} className="overflow-hidden rounded-xl border border-line">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-stone-50 px-4 py-2.5">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                            Academic term
                          </p>
                          <h4 className="mt-0.5 text-sm font-semibold">
                            {group.term.academic_year} · {group.term.name}
                          </h4>
                        </div>
                        <span className="text-xs text-ink-muted">
                          {group.days.reduce((total, day) => total + day.records.length, 0)} window
                          {group.days.reduce((total, day) => total + day.records.length, 0) === 1 ? '' : 's'}
                        </span>
                      </div>
                      <div className="divide-y divide-line">
                        {group.days.map((day) => (
                          <div key={day.day}>
                            <h5 className="bg-stone-50/60 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                              {day.label}
                            </h5>
                            <ul className="divide-y divide-line">
                              {day.records.map((availability) => (
                                <li
                                  key={availability.id}
                                  className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                                >
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
                                    <span className="font-medium tabular-nums text-ink">
                                      {availability.start_time.slice(0, 5)}–{availability.end_time.slice(0, 5)}
                                    </span>
                                    <Badge tone={statusTone(availability.availability_type)}>
                                      {availability.availability_type}
                                    </Badge>
                                    {availability.notes ? (
                                      <span className="text-xs text-ink-muted">{availability.notes}</span>
                                    ) : null}
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => onEditAvailability(availability)}
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="danger"
                                      onClick={() => onDeleteAvailability(availability)}
                                    >
                                      Remove
                                    </Button>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-ink-muted">
                  No availability windows have been recorded.
                </p>
              )}
            </section>

            <section className="space-y-3">
              <div className="border-b border-line pb-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-maroon-600">
                  Teaching assignments
                </p>
                <h3 className="mt-1 text-lg font-semibold">Assigned subject offerings</h3>
                <p className="mt-1 text-sm text-ink-muted">
                  Recorded teaching assignments for this faculty profile.
                </p>
              </div>
              {professor.assignments.length ? (
                <div className="overflow-x-auto rounded-lg border border-line">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="bg-stone-50 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                      <tr>
                        <th scope="col" className="px-4 py-3">Subject</th>
                        <th scope="col" className="px-4 py-3">Section</th>
                        <th scope="col" className="px-4 py-3">Term</th>
                        <th scope="col" className="px-4 py-3">Assignment</th>
                        <th scope="col" className="px-4 py-3">Status</th>
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
      </div>
    </dialog>
  )
}
