import { useEffect, useRef } from 'react'
import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { SubjectOfferingStatusBadge } from '@/components/subjectOfferings/SubjectOfferingStatusBadge'
import type { SubjectOfferingDetail, SubjectOfferingSchedule } from '@/types/subjectOffering'

interface SubjectOfferingDetailsDialogProps {
  offering: SubjectOfferingDetail | null
  isLoading: boolean
  error: string | null
  onClose: () => void
  onRetry: () => void
}

const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function formatTime(value: string): string {
  return value.slice(0, 5)
}

function formatLabel(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase())
}

function scheduleTone(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'published') return 'success'
  if (status === 'draft') return 'warning'
  if (status === 'cancelled') return 'danger'
  return 'neutral'
}

function roomLabel(schedule: SubjectOfferingSchedule): string {
  const rooms = schedule.room_allocations.map((allocation) => allocation.room.code)
  return rooms.length ? rooms.join(', ') : 'No room allocated'
}

export function SubjectOfferingDetailsDialog({
  offering,
  isLoading,
  error,
  onClose,
  onRetry,
}: SubjectOfferingDetailsDialogProps) {
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
      aria-labelledby="subject-offering-details-title"
    >
      <div className="space-y-6 p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">
              Subject offering
            </p>
            <h2 id="subject-offering-details-title" className="mt-1 text-xl font-semibold">
              {offering ? `${offering.subject.code} - ${offering.subject.title}` : 'Offering details'}
            </h2>
            {offering ? (
              <p className="mt-1 text-sm text-ink-muted">
                {offering.section.code}
                {offering.section.name ? ` - ${offering.section.name}` : ''} | {offering.academic_term.academic_year} {offering.academic_term.name}
              </p>
            ) : null}
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>

        {error ? (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p>{error}</p>
            <Button className="mt-3" size="sm" variant="outline" onClick={onRetry}>
              Retry
            </Button>
          </div>
        ) : isLoading ? (
          <div role="status" className="py-12 text-center text-sm text-ink-muted">
            Loading offering details.
          </div>
        ) : offering ? (
          <>
            <section className="grid gap-4 rounded-xl border border-line bg-stone-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs font-medium text-ink-muted">Status</p>
                <div className="mt-1">
                  <SubjectOfferingStatusBadge status={offering.status} />
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-ink-muted">Term</p>
                <p className="mt-1 text-sm font-semibold text-ink">
                  {offering.academic_term.academic_year} - {offering.academic_term.name}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-ink-muted">Program</p>
                <p className="mt-1 text-sm font-semibold text-ink">
                  {offering.section.program?.code ?? '-'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-ink-muted">Year level</p>
                <p className="mt-1 text-sm font-semibold text-ink">
                  {offering.section.year_level?.name ?? '-'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-ink-muted">Section</p>
                <p className="mt-1 text-sm font-semibold text-ink">{offering.section.code}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-ink-muted">Expected students</p>
                <p className="mt-1 text-sm font-semibold text-ink">{offering.expected_students ?? '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-ink-muted">Enrolled students</p>
                <p className="mt-1 text-sm font-semibold text-ink">{offering.enrolled_students_count}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-ink-muted">Units</p>
                <p className="mt-1 text-sm font-semibold text-ink">{offering.subject.units}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-ink-muted">Active faculty</p>
                <p className="mt-1 text-sm font-semibold text-ink">
                  {offering.active_faculty_assignments_count}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-ink-muted">Published schedules</p>
                <p className="mt-1 text-sm font-semibold text-ink">
                  {offering.published_schedules_count}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-ink-muted">Section capacity</p>
                <p className="mt-1 text-sm font-semibold text-ink">
                  {offering.section.capacity ?? '-'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-ink-muted">Subject status</p>
                <p className="mt-1 text-sm font-semibold text-ink">{formatLabel(offering.subject.status)}</p>
              </div>
            </section>

            <section>
              <div className="mb-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">
                  Teaching
                </p>
                <h3 className="mt-1 text-lg font-semibold">Active faculty assignments</h3>
              </div>
              {offering.faculty_assignments.length ? (
                <div className="overflow-x-auto rounded-lg border border-line">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="bg-stone-50 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                      <tr>
                        <th className="px-4 py-3">Professor</th>
                        <th className="px-4 py-3">Employee number</th>
                        <th className="px-4 py-3">Role</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {offering.faculty_assignments.map((assignment) => (
                        <tr key={assignment.id}>
                          <td className="px-4 py-3 font-medium">
                            {assignment.professor.user?.name ?? 'Unknown professor'}
                          </td>
                          <td className="px-4 py-3 text-ink-muted">
                            {assignment.professor.employee_number}
                          </td>
                          <td className="px-4 py-3 text-ink-muted">
                            {formatLabel(assignment.assignment_role)}
                          </td>
                          <td className="px-4 py-3">
                            <Badge tone="success">{formatLabel(assignment.status)}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-ink-muted">
                  No active faculty assignments are linked to this offering.
                </p>
              )}
            </section>

            <section>
              <div className="mb-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">
                  Scheduling
                </p>
                <h3 className="mt-1 text-lg font-semibold">Class schedules</h3>
                <p className="mt-1 text-sm text-ink-muted">
                  Schedules are preserved across offering status changes.
                </p>
              </div>
              {offering.class_schedules.length ? (
                <div className="overflow-x-auto rounded-lg border border-line">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="bg-stone-50 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                      <tr>
                        <th className="px-4 py-3">Day</th>
                        <th className="px-4 py-3">Time</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Modality</th>
                        <th className="px-4 py-3">Room</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {offering.class_schedules.map((schedule) => (
                        <tr key={schedule.id}>
                          <td className="px-4 py-3">{dayLabels[schedule.day_of_week - 1] ?? 'Unknown day'}</td>
                          <td className="px-4 py-3 text-ink-muted">
                            {formatTime(schedule.start_time)}-{formatTime(schedule.end_time)}
                          </td>
                          <td className="px-4 py-3 text-ink-muted">{formatLabel(schedule.schedule_type)}</td>
                          <td className="px-4 py-3 text-ink-muted">{formatLabel(schedule.modality)}</td>
                          <td className="px-4 py-3 text-ink-muted">{roomLabel(schedule)}</td>
                          <td className="px-4 py-3">
                            <Badge tone={scheduleTone(schedule.status)}>
                              {formatLabel(schedule.status)}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-ink-muted">
                  No class schedules are linked to this offering.
                </p>
              )}
            </section>
          </>
        ) : null}
      </div>
    </dialog>
  )
}
