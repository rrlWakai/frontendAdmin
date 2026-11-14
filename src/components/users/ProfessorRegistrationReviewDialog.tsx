import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/common/Button'
import type { ProfessorReviewAction } from '@/services/api/users'
import type { ManagedUser } from '@/types/users'
import { getApiErrorMessage } from '@/utils/apiError'

interface ProfessorRegistrationReviewDialogProps {
  user: ManagedUser
  onClose: () => void
  onAction: (action: ProfessorReviewAction, reason?: string) => Promise<void>
}

const actionLabels: Record<ProfessorReviewAction, string> = {
  approve: 'Approve registration',
  return: 'Return for correction',
  reject: 'Reject registration',
}

export function ProfessorRegistrationReviewDialog({
  user,
  onClose,
  onAction,
}: ProfessorRegistrationReviewDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [reason, setReason] = useState('')
  const [action, setAction] = useState<ProfessorReviewAction | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()

    return () => dialog?.close()
  }, [])

  const profile = user.profile?.type === 'professor' ? user.profile : null

  async function submit(nextAction: ProfessorReviewAction) {
    if (nextAction !== 'approve' && !reason.trim()) {
      setError('Enter a reason to return or reject this registration.')
      return
    }

    setAction(nextAction)
    setError(null)
    try {
      await onAction(nextAction, reason.trim() || undefined)
    } catch (actionError) {
      setError(getApiErrorMessage(actionError, 'Unable to review this registration.'))
      setAction(null)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault()
        if (!action) onClose()
      }}
      className="fixed inset-0 m-auto max-h-[92vh] w-[min(42rem,calc(100%-2rem))] overflow-y-auto rounded-2xl border border-line bg-white p-0 text-ink shadow-2xl backdrop:bg-night-950/45"
      aria-labelledby="professor-review-title"
    >
      <div className="space-y-5 p-5 sm:p-7">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">
            Professor registration
          </p>
          <h2 id="professor-review-title" className="mt-1 text-xl font-semibold">
            Review registration
          </h2>
        </div>

        {error ? (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <dl className="grid gap-x-6 gap-y-3 rounded-lg border border-line bg-stone-50 p-4 text-sm sm:grid-cols-2">
          <Detail label="Name" value={user.name} />
          <Detail label="Institutional email" value={user.email} />
          <Detail
            label="Employment type"
            value={profile?.employment_type.replace('_', ' ') ?? '—'}
          />
          <Detail
            label="Department affiliation"
            value={
              profile?.department_affiliation === 'ccs'
                ? 'CCS'
                : profile?.department_affiliation === 'other'
                  ? 'Other department'
                  : 'Not recorded'
            }
          />
          <Detail label="Department" value={profile?.department?.name ?? 'Not assigned'} />
          <Detail label="Employee number" value={profile?.employee_number || 'Not assigned'} />
        </dl>

        <section aria-label="Registration review history">
          <h3 className="text-sm font-semibold">Submission and review history</h3>
          <ol className="mt-2 max-h-40 space-y-3 overflow-y-auto border-l border-line pl-4">
            {(user.review_history ?? []).map((entry) => (
              <li key={entry.id} className="text-xs text-ink-muted">
                <p className="font-semibold text-ink">
                  {entry.action.replace(/_/g, ' ')} · {entry.actor.name}
                </p>
                <p>{entry.created_at ? new Date(entry.created_at).toLocaleString() : 'Date unavailable'}</p>
                {entry.reason ? <p className="mt-1">{entry.reason}</p> : null}
              </li>
            ))}
          </ol>
        </section>

        <div className="space-y-1.5">
          <label htmlFor="professor-review-reason" className="block text-sm font-medium text-ink">
            Reason for return or rejection
          </label>
          <textarea
            id="professor-review-reason"
            rows={3}
            maxLength={2000}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Required when returning or rejecting"
            className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="outline" disabled={Boolean(action)} onClick={onClose}>
            Close
          </Button>
          {(['approve', 'return', 'reject'] as const).map((nextAction) => (
            <Button
              key={nextAction}
              type="button"
              variant={nextAction === 'reject' ? 'danger' : 'secondary'}
              disabled={Boolean(action) || (nextAction !== 'approve' && !reason.trim())}
              isLoading={action === nextAction}
              onClick={() => void submit(nextAction)}
            >
              {actionLabels[nextAction]}
            </Button>
          ))}
        </div>
      </div>
    </dialog>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="mt-0.5 font-medium capitalize text-ink">{value}</dd>
    </div>
  )
}
