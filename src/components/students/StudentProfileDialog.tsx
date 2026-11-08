import { useEffect, useRef } from 'react'
import { Button } from '@/components/common/Button'
import { Badge } from '@/components/common/Badge'
import type { StudentDetail } from '@/types/students'

interface StudentProfileDialogProps {
  student: StudentDetail | null
  isLoading: boolean
  error: string | null
  canManage: boolean
  isChangingStatus: boolean
  onClose: () => void
  onEdit: () => void
  onToggleStatus: () => void
  onRetry: () => void
}

function accountStatusTone(status?: string): 'success' | 'danger' | 'neutral' {
  if (status === 'active') return 'success'
  if (status === 'suspended') return 'danger'
  return 'neutral'
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Unknown'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date)
}

export function StudentProfileDialog({
  student,
  isLoading,
  error,
  canManage,
  isChangingStatus,
  onClose,
  onEdit,
  onToggleStatus,
  onRetry,
}: StudentProfileDialogProps) {
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
      className="fixed inset-0 m-auto max-h-[92vh] w-[min(56rem,calc(100%-2rem))] overflow-y-auto rounded-2xl border border-line bg-white p-0 text-ink shadow-2xl backdrop:bg-brand-950/45"
      aria-labelledby="student-profile-title"
    >
      <div className="space-y-5 p-5 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">
              Student profile
            </p>
            <h2 id="student-profile-title" className="mt-1 text-xl font-semibold">
              {student?.name ?? 'Student details'}
            </h2>
            {student ? (
              <p className="mt-1 text-sm text-ink-muted">
                {student.student_number} · {student.program?.code ?? 'No program'}
              </p>
            ) : null}
          </div>
          <div className="flex gap-2">
            {student && canManage ? (
              <>
                <Button type="button" size="sm" variant="outline" onClick={onEdit}>
                  Edit profile
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={student.account_status === 'active' ? 'danger' : 'secondary'}
                  disabled={isChangingStatus}
                  onClick={onToggleStatus}
                >
                  {isChangingStatus
                    ? 'Saving…'
                    : student.account_status === 'active'
                      ? 'Deactivate'
                      : 'Activate'}
                </Button>
              </>
            ) : null}
            <Button type="button" size="sm" variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
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
            Loading student profile…
          </div>
        ) : student ? (
          <>
            <section className="grid gap-4 rounded-xl border border-line bg-stone-50 p-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-xs font-medium text-ink-muted">Student number</p>
                <p className="mt-1 text-sm font-semibold text-ink">{student.student_number}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-ink-muted">Full name</p>
                <p className="mt-1 text-sm text-ink">{student.name}</p>
              </div>
              {student.email ? (
                <div>
                  <p className="text-xs font-medium text-ink-muted">Email</p>
                  <p className="mt-1 break-all text-sm text-ink">{student.email}</p>
                </div>
              ) : null}
              <div>
                <p className="text-xs font-medium text-ink-muted">Program</p>
                <p className="mt-1 text-sm text-ink">
                  {student.program ? `${student.program.code} · ${student.program.name}` : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-ink-muted">Account status</p>
                <div className="mt-1">
                  <Badge tone={accountStatusTone(student.account_status)}>
                    {student.account_status}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-ink-muted">Student profile status</p>
                <p className="mt-1 text-sm capitalize text-ink">{student.profile_status}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-ink-muted">Admitted on</p>
                <p className="mt-1 text-sm text-ink">{formatDate(student.admitted_on)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-ink-muted">Profile created</p>
                <p className="mt-1 text-sm text-ink">{formatDate(student.created_at)}</p>
              </div>
            </section>

            <p className="text-xs leading-5 text-ink-muted">
              Contact number, date of birth, and address are not stored in the current student schema.
            </p>

            <section>
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">
                    Academic information
                  </p>
                  <h3 className="mt-1 text-lg font-semibold">Subject enrollments</h3>
                </div>
                <p className="text-xs text-ink-muted">
                  {student.enrollments.length} record{student.enrollments.length === 1 ? '' : 's'}
                </p>
              </div>
              {student.enrollments.length ? (
                <div className="overflow-x-auto rounded-lg border border-line">
                  <table className="w-full min-w-[700px] text-left text-sm">
                    <thead className="bg-stone-50 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                      <tr>
                        <th className="px-4 py-3">Subject</th>
                        <th className="px-4 py-3">Term</th>
                        <th className="px-4 py-3">Section</th>
                        <th className="px-4 py-3">Year level</th>
                        <th className="px-4 py-3">Enrollment status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {student.enrollments.map((enrollment) => {
                        const { subject, academic_term: term, section } = enrollment.subject_offering
                        return (
                          <tr key={enrollment.id}>
                            <td className="px-4 py-3">
                              <p className="font-medium text-ink">{subject.title}</p>
                              <p className="mt-0.5 text-xs text-ink-muted">{subject.code} · {subject.units} units</p>
                            </td>
                            <td className="px-4 py-3 text-ink-muted">
                              {term.academic_year} · {term.name}
                            </td>
                            <td className="px-4 py-3 text-ink-muted">
                              {section.code}{section.name ? ` · ${section.name}` : ''}
                            </td>
                            <td className="px-4 py-3 text-ink-muted">
                              {section.year_level.name}
                            </td>
                            <td className="px-4 py-3">
                              <Badge tone={enrollment.status === 'enrolled' ? 'success' : 'neutral'}>
                                {enrollment.status}
                              </Badge>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-ink-muted">
                  No subject enrollment records are available.
                </p>
              )}
            </section>
          </>
        ) : null}
      </div>
    </dialog>
  )
}
