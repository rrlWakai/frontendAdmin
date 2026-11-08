import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/common/Button'
import { Badge } from '@/components/common/Badge'
import { fetchAttendanceSession, correctAttendanceRecords } from '@/services/api/attendance'
import type {
  AttendanceSessionDetail,
  AttendanceStatus,
} from '@/types/attendance'
import { getApiErrorMessage, getApiFieldErrors } from '@/utils/apiError'

interface AttendanceSessionDialogProps {
  sessionId: number
  canCorrect: boolean
  onClose: () => void
  onSaved: () => void
}

const statuses: AttendanceStatus[] = ['present', 'absent', 'late', 'excused']

export function AttendanceSessionDialog({
  sessionId,
  canCorrect,
  onClose,
  onSaved,
}: AttendanceSessionDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [detail, setDetail] = useState<AttendanceSessionDetail | null>(null)
  const [drafts, setDrafts] = useState<Record<number, { status: AttendanceStatus; remarks: string }>>({})
  const [correctionReason, setCorrectionReason] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    let active = true

    void fetchAttendanceSession(sessionId)
      .then((result) => {
        if (!active) return
        setDetail(result)
        setDrafts(Object.fromEntries(
          result.roster.flatMap((entry) => entry.attendance
            ? [[entry.attendance.id, {
                status: entry.attendance.status,
                remarks: entry.attendance.remarks ?? '',
              }]]
            : []),
        ))
      })
      .catch((failure: unknown) => {
        if (active) setError(getApiErrorMessage(failure, 'Unable to load attendance session.'))
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
      dialog?.close()
    }
  }, [sessionId])

  function updateDraft(
    recordId: number,
    field: 'status' | 'remarks',
    value: AttendanceStatus | string,
  ) {
    setDrafts((current) => ({
      ...current,
      [recordId]: {
        ...current[recordId],
        [field]: value,
      },
    }))
  }

  const changedRecords = detail?.roster.flatMap((entry) => {
    const attendance = entry.attendance
    if (!attendance) return []
    const draft = drafts[attendance.id]
    if (
      !draft ||
      (draft.status === attendance.status && draft.remarks === (attendance.remarks ?? ''))
    ) {
      return []
    }

    return [{
      student_subject_enrollment_id: entry.student_subject_enrollment_id,
      status: draft.status,
      remarks: draft.remarks.trim() || null,
    }]
  }) ?? []

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!detail || changedRecords.length === 0) return

    setIsSaving(true)
    setError(null)
    setFieldErrors({})

    try {
      await correctAttendanceRecords(detail.session.id, changedRecords, correctionReason.trim())
      setCorrectionReason('')
      setDetail(await fetchAttendanceSession(sessionId))
      onSaved()
    } catch (failure) {
      setError(getApiErrorMessage(failure, 'Unable to save attendance corrections.'))
      setFieldErrors(getApiFieldErrors(failure))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      className="fixed inset-0 m-auto max-h-[92vh] w-[min(62rem,calc(100%-2rem))] overflow-y-auto rounded-2xl border border-line bg-white p-0 text-ink shadow-2xl backdrop:bg-night-950/45"
      aria-labelledby="attendance-session-title"
    >
      <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">
              Session details
            </p>
            <h2 id="attendance-session-title" className="mt-1 text-xl font-semibold">
              {detail
                ? `${detail.session.offering.subject.code} · ${detail.session.offering.section.code}`
                : 'Attendance session'}
            </h2>
            {detail ? (
              <p className="mt-1 text-sm text-ink-muted">
                {detail.session.class_date} · {detail.session.offering.academic_term.name}
              </p>
            ) : null}
          </div>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>

        {error ? (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div role="status" className="py-12 text-center text-sm text-ink-muted">
            Loading attendance session…
          </div>
        ) : detail ? (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone={detail.session.status === 'submitted' ? 'success' : detail.session.status === 'cancelled' ? 'danger' : 'neutral'}>
                {detail.session.status}
              </Badge>
              <span className="text-sm text-ink-muted">
                {detail.session.schedule.start_time}–{detail.session.schedule.end_time}
              </span>
              <span className="text-sm text-ink-muted">
                {detail.session.offering.section.program.code} · {detail.session.offering.subject.title}
              </span>
            </div>

            {detail.session.status === 'cancelled' ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                Session cancelled: {detail.session.cancellation_reason}
              </p>
            ) : null}

            <div className="overflow-x-auto rounded-lg border border-line">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-stone-50 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  <tr>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Attendance</th>
                    <th className="px-4 py-3">Remarks</th>
                    <th className="px-4 py-3">Correction history</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {detail.roster.map((entry) => {
                    const attendance = entry.attendance
                    const draft = attendance ? drafts[attendance.id] : undefined

                    return (
                      <tr key={entry.student_subject_enrollment_id} className="align-top">
                        <td className="px-4 py-3">
                          <p className="font-medium text-ink">{entry.student.name}</p>
                          <p className="text-xs text-ink-muted">{entry.student.student_number}</p>
                        </td>
                        <td className="px-4 py-3">
                          {canCorrect && attendance && detail.session.status === 'submitted' ? (
                            <select
                              value={draft?.status ?? attendance.status}
                              onChange={(event) => updateDraft(
                                attendance.id,
                                'status',
                                event.target.value as AttendanceStatus,
                              )}
                              className="h-9 rounded-lg border border-line bg-white px-2 text-sm"
                              aria-label={`Attendance status for ${entry.student.name}`}
                            >
                              {statuses.map((status) => (
                                <option key={status} value={status}>{status}</option>
                              ))}
                            </select>
                          ) : (
                            <Badge tone={attendance ? 'success' : 'neutral'}>
                              {attendance?.status ?? 'Not recorded'}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {canCorrect && attendance && detail.session.status === 'submitted' ? (
                            <textarea
                              value={draft?.remarks ?? ''}
                              onChange={(event) => updateDraft(attendance.id, 'remarks', event.target.value)}
                              rows={2}
                              maxLength={2000}
                              className="w-full rounded-lg border border-line px-2 py-1.5 text-sm"
                              aria-label={`Attendance remarks for ${entry.student.name}`}
                            />
                          ) : (
                            <span className="text-ink-muted">{attendance?.remarks ?? '—'}</span>
                          )}
                        </td>
                        <td className="max-w-64 px-4 py-3 text-xs leading-5 text-ink-muted">
                          {attendance?.changes?.length
                            ? attendance.changes.map((change, index) => (
                                <p key={`${attendance.id}-${index}`} className="mb-2 last:mb-0">
                                  {change.previous_status} → {change.new_status}: {change.correction_reason}
                                </p>
                              ))
                            : '—'}
                        </td>
                      </tr>
                    )
                  })}
                  {detail.roster.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-sm text-ink-muted">
                        No eligible students or recorded attendance for this session.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            {canCorrect && detail.session.status === 'submitted' ? (
              <label className="block space-y-1.5 text-sm font-medium text-ink">
                Correction reason
                <textarea
                  value={correctionReason}
                  onChange={(event) => setCorrectionReason(event.target.value)}
                  rows={2}
                  maxLength={2000}
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm font-normal"
                />
                {fieldErrors.correction_reason?.[0] ? (
                  <span className="block text-xs font-medium text-red-600">
                    {fieldErrors.correction_reason[0]}
                  </span>
                ) : null}
              </label>
            ) : null}

            <div className="flex justify-end border-t border-line pt-4">
              <Button
                type="submit"
                isLoading={isSaving}
                disabled={
                  !canCorrect ||
                  detail.session.status !== 'submitted' ||
                  changedRecords.length === 0 ||
                  correctionReason.trim().length < 3
                }
              >
                Save correction
              </Button>
            </div>
          </>
        ) : null}
      </form>
    </dialog>
  )
}
