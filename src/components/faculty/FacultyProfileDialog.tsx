import { useEffect, useRef } from 'react'
import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import type { FacultyAvailabilityRecord, FacultyDetail } from '@/types/faculty'

interface FacultyProfileDialogProps {
  professor: FacultyDetail | null
  isLoading: boolean
  error: string | null
  canEditProfile: boolean
  isChangingStatus: boolean
  onClose: () => void
  onEditProfile: () => void
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

export function FacultyProfileDialog({
  professor,
  isLoading,
  error,
  canEditProfile,
  isChangingStatus,
  onClose,
  onEditProfile,
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
