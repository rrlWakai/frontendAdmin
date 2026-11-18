import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Check, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { Card, CardBody } from '@/components/common/Card'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { useAuth } from '@/hooks/useAuth'
import {
  fetchAcademicOptions,
  fetchMajorSelections,
  reviewMajorSelection,
} from '@/services/api/academic'
import type {
  AcademicMajorSelection,
  AcademicOptions,
  AcademicPagination,
} from '@/types/academic'
import { getApiErrorMessage, getApiFieldErrors } from '@/utils/apiError'

function selectionTone(status: string): 'success' | 'danger' | 'neutral' {
  if (status === 'approved') return 'success'
  if (status === 'rejected') return 'danger'
  return 'neutral'
}

function formatDateTime(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

interface ReviewDialogProps {
  selection: AcademicMajorSelection
  status: 'approved' | 'rejected'
  onCancel: () => void
  onSubmit: (remarks: string) => Promise<void>
}

function ReviewDialog({ selection, status, onCancel, onSubmit }: ReviewDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [remarks, setRemarks] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError(null)

    try {
      await onSubmit(remarks.trim())
    } catch (failure) {
      setError(
        Object.values(getApiFieldErrors(failure)).flat()[0] ??
          getApiErrorMessage(failure, 'Unable to review this major selection.'),
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault()
        onCancel()
      }}
      className="fixed inset-0 m-auto max-h-[92vh] w-[min(32rem,calc(100%-2rem))] overflow-y-auto rounded-2xl border border-line bg-white p-0 text-ink shadow-2xl backdrop:bg-brand-950/45"
      aria-labelledby="review-selection-title"
    >
      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5 p-5 sm:p-7">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">
            Major selection review
          </p>
          <h2 id="review-selection-title" className="mt-1 text-xl font-semibold">
            {status === 'approved' ? 'Approve' : 'Reject'} selection
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            {selection.student.user?.name ?? 'Student'} ·{' '}
            {selection.major ? `${selection.major.code} — ${selection.major.name}` : 'No major'}
          </p>
        </div>

        {error ? (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="space-y-1.5">
          <label htmlFor="review-remarks" className="block text-sm font-medium text-ink">
            Remarks (optional)
          </label>
          <textarea
            id="review-remarks"
            value={remarks}
            maxLength={1000}
            onChange={(event) => setRemarks(event.target.value)}
            className="min-h-24 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSaving} variant={status === 'approved' ? 'primary' : 'danger'}>
            {status === 'approved' ? 'Approve' : 'Reject'} selection
          </Button>
        </div>
      </form>
    </dialog>
  )
}

export function MajorSelectionsPage() {
  const { user } = useAuth()
  const canReview = user?.role === 'administrator'
  const [options, setOptions] = useState<AcademicOptions | null>(null)
  const [optionsError, setOptionsError] = useState<string | null>(null)
  const [records, setRecords] = useState<AcademicMajorSelection[]>([])
  const [pagination, setPagination] = useState<AcademicPagination>({
    current_page: 1,
    last_page: 1,
    per_page: 25,
    total: 0,
  })
  const [status, setStatus] = useState('')
  const [programFilter, setProgramFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [page, setPage] = useState(1)
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [review, setReview] = useState<{
    selection: AcademicMajorSelection
    status: 'approved' | 'rejected'
  } | null>(null)

  useEffect(() => {
    let active = true
    void fetchAcademicOptions()
      .then((result) => {
        if (active) setOptions(result)
      })
      .catch((failure: unknown) => {
        if (active) setOptionsError(getApiErrorMessage(failure, 'Unable to load academic options.'))
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    void fetchMajorSelections({
      status: status || undefined,
      program_id: programFilter ? Number(programFilter) : undefined,
      academic_year_id: yearFilter ? Number(yearFilter) : undefined,
      page,
      per_page: 25,
    })
      .then((result) => {
        if (active) {
          setRecords(result.records)
          setPagination(result.pagination)
          setLoadError(null)
        }
      })
      .catch((failure: unknown) => {
        if (active) setLoadError(getApiErrorMessage(failure, 'Unable to load major selections.'))
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [page, programFilter, refreshVersion, status, yearFilter])

  async function handleReview(remarks: string) {
    if (!review) return

    await reviewMajorSelection(review.selection.id, {
      status: review.status,
      remarks: remarks || null,
    })
    setReview(null)
    setSuccess(`Major selection ${review.status}.`)
    setRefreshVersion((version) => version + 1)
  }

  return (
    <>
      <PageHeader
        eyebrow="Student progression"
        title="Major selections"
        description="Review the majors students submitted for their next academic year before promotion."
      />

      {success ? (
        <div role="status" className="mb-5 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
          <Check className="size-4" aria-hidden="true" />
          {success}
          <button type="button" className="ml-auto text-xs font-semibold underline" onClick={() => setSuccess(null)}>
            Dismiss
          </button>
        </div>
      ) : null}

      {optionsError ? (
        <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {optionsError}
        </div>
      ) : null}

      <Card>
        <CardBody>
          <div className="grid gap-3 md:grid-cols-[repeat(auto-fit,minmax(12rem,1fr))]">
            <div className="space-y-1.5">
              <label htmlFor="major-selection-status" className="block text-sm font-medium text-ink">
                Status
              </label>
              <select
                id="major-selection-status"
                value={status}
                onChange={(event) => {
                  setPage(1)
                  setStatus(event.target.value)
                }}
                className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="">All statuses</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="major-selection-program" className="block text-sm font-medium text-ink">
                Program
              </label>
              <select
                id="major-selection-program"
                value={programFilter}
                onChange={(event) => {
                  setPage(1)
                  setProgramFilter(event.target.value)
                }}
                className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="">All programs</option>
                {(options?.programs ?? []).map((program) => (
                  <option key={program.id} value={program.id}>{program.code} — {program.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="major-selection-year" className="block text-sm font-medium text-ink">
                Academic year
              </label>
              <select
                id="major-selection-year"
                value={yearFilter}
                onChange={(event) => {
                  setPage(1)
                  setYearFilter(event.target.value)
                }}
                className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="">All academic years</option>
                {(options?.academic_years ?? []).map((year) => (
                  <option key={year.id} value={year.id}>{year.label}</option>
                ))}
              </select>
            </div>
          </div>

          {loadError ? (
            <div role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p>{loadError}</p>
              <Button className="mt-3" size="sm" variant="outline" onClick={() => setRefreshVersion((version) => version + 1)}>
                Retry
              </Button>
            </div>
          ) : isLoading ? (
            <div className="py-16 text-center text-sm text-ink-muted" role="status">
              Loading major selections…
            </div>
          ) : records.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                icon={X}
                title="No major selections found"
                description="Student major selections will appear here after they are submitted."
              />
            </div>
          ) : (
            <>
              <div className="mt-5 overflow-x-auto rounded-lg border border-line">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="bg-stone-50 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    <tr>
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3">Major</th>
                      <th className="px-4 py-3">Academic year</th>
                      <th className="px-4 py-3">Submitted</th>
                      <th className="px-4 py-3">Status</th>
                      {canReview ? <th className="px-4 py-3 text-right">Review</th> : null}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {records.map((selection) => (
                      <tr key={selection.id} className="align-top">
                        <td className="px-4 py-4">
                          <p className="font-semibold text-ink">{selection.student.user?.name ?? 'Unknown student'}</p>
                          <p className="mt-0.5 text-xs text-ink-muted">
                            {selection.student.student_number} · {selection.student.user?.email ?? '—'}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-ink-muted">
                          {selection.major ? (
                            <>
                              <p className="text-ink">{selection.major.code}</p>
                              <p className="mt-0.5 text-xs">{selection.major.name}</p>
                            </>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-4 text-ink-muted">{selection.academic_year?.label ?? '—'}</td>
                        <td className="px-4 py-4 text-ink-muted">{formatDateTime(selection.selected_at)}</td>
                        <td className="px-4 py-4">
                          <Badge tone={selectionTone(selection.status)}>{selection.status}</Badge>
                          {selection.remarks ? (
                            <p className="mt-1 max-w-52 text-xs text-ink-muted">{selection.remarks}</p>
                          ) : null}
                        </td>
                        {canReview ? (
                          <td className="px-4 py-4">
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={selection.status === 'approved'}
                                onClick={() => {
                                  setSuccess(null)
                                  setReview({ selection, status: 'approved' })
                                }}
                              >
                                Approve
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="danger"
                                disabled={selection.status === 'rejected'}
                                onClick={() => {
                                  setSuccess(null)
                                  setReview({ selection, status: 'rejected' })
                                }}
                              >
                                Reject
                              </Button>
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-ink-muted">
                  {pagination.total} selection{pagination.total === 1 ? '' : 's'} · Page {page} of {pagination.last_page}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    <ChevronLeft className="size-4" aria-hidden="true" />
                    Previous
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={page >= pagination.last_page}
                    onClick={() => setPage((current) => Math.min(pagination.last_page, current + 1))}
                  >
                    Next
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardBody>
      </Card>

      {review ? (
        <ReviewDialog
          key={`${review.selection.id}-${review.status}`}
          selection={review.selection}
          status={review.status}
          onCancel={() => setReview(null)}
          onSubmit={handleReview}
        />
      ) : null}
    </>
  )
}
