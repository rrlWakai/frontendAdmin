import { useEffect, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, GraduationCap, Play, RefreshCw, TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { Card, CardBody, CardHeader } from '@/components/common/Card'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import {
  adjustPromotionItem,
  allocatePromotionRun,
  fetchAcademicDirectory,
  fetchAcademicOptions,
  fetchDuePromotions,
  fetchPromotionRun,
  fetchPromotionRuns,
  finalizePromotionRun,
  preparePromotionRun,
} from '@/services/api/academic'
import type {
  AcademicOptions,
  AcademicPagination,
  AcademicSection,
  DuePromotion,
  PromotionAllocation,
  PromotionRun,
  PromotionRunItem,
} from '@/types/academic'
import { getApiErrorMessage, getApiFieldErrors } from '@/utils/apiError'

function runTone(status: string): 'success' | 'warning' | 'neutral' {
  if (status === 'finalized') return 'success'
  if (status === 'prepared') return 'warning'
  return 'neutral'
}

function itemTone(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'promoted' || status === 'ready') return 'success'
  if (status === 'exception') return 'danger'
  return 'neutral'
}

export function PromotionsPage() {
  const [options, setOptions] = useState<AcademicOptions | null>(null)
  const [optionsError, setOptionsError] = useState<string | null>(null)
  const [due, setDue] = useState<DuePromotion[]>([])
  const [runs, setRuns] = useState<PromotionRun[]>([])
  const [pagination, setPagination] = useState<AcademicPagination>({
    current_page: 1,
    last_page: 1,
    per_page: 25,
    total: 0,
  })
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const [refreshVersion, setRefreshVersion] = useState(0)

  const [sourceYearId, setSourceYearId] = useState('')
  const [sourceTermId, setSourceTermId] = useState('')
  const [targetYearId, setTargetYearId] = useState('')
  const [targetTermId, setTargetTermId] = useState('')

  const [selectedRun, setSelectedRun] = useState<PromotionRun | null>(null)
  const [sections, setSections] = useState<AcademicSection[]>([])
  const [allocation, setAllocation] = useState<PromotionAllocation | null>(null)
  const [allowShortages, setAllowShortages] = useState(false)

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
    void Promise.all([
      fetchDuePromotions(),
      fetchPromotionRuns({ page, per_page: 25 }),
    ])
      .then(([dueResult, runResult]) => {
        if (active) {
          setDue(dueResult)
          setRuns(runResult.records)
          setPagination(runResult.pagination)
          setLoadError(null)
        }
      })
      .catch((failure: unknown) => {
        if (active) setLoadError(getApiErrorMessage(failure, 'Unable to load promotion runs.'))
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [page, refreshVersion])

  const sourceTerms = (options?.terms ?? []).filter((term) =>
    sourceYearId === '' || term.academic_year_id === Number(sourceYearId),
  )
  const targetTerms = (options?.terms ?? []).filter((term) =>
    targetYearId === '' || term.academic_year_id === Number(targetYearId),
  )

  async function openRun(runId: number) {
    setIsBusy(true)
    setActionError(null)
    setAllocation(null)
    try {
      const run = await fetchPromotionRun(runId)
      setSelectedRun(run)
      const sectionResult = await fetchAcademicDirectory<AcademicSection>('sections', {
        academic_term_id: run.target_term_id,
        per_page: 100,
      })
      setSections(sectionResult.records)
    } catch (failure) {
      setActionError(getApiErrorMessage(failure, 'Unable to load the promotion run.'))
    } finally {
      setIsBusy(false)
    }
  }

  async function handlePrepare() {
    setIsBusy(true)
    setActionError(null)
    setSuccess(null)
    try {
      const run = await preparePromotionRun({
        source_academic_year_id: Number(sourceYearId),
        source_term_id: Number(sourceTermId),
        target_academic_year_id: Number(targetYearId),
        target_term_id: Number(targetTermId),
      })
      setSuccess('Promotion run prepared.')
      setRefreshVersion((version) => version + 1)
      await openRun(run.id)
    } catch (failure) {
      setActionError(
        Object.values(getApiFieldErrors(failure)).flat()[0] ??
          getApiErrorMessage(failure, 'Unable to prepare the promotion run.'),
      )
    } finally {
      setIsBusy(false)
    }
  }

  async function handleAdjust(
    item: PromotionRunItem,
    attributes: { to_year_level_id?: number | null; major_id?: number | null; section_id?: number | null },
  ) {
    if (!selectedRun) return
    setIsBusy(true)
    setActionError(null)
    try {
      await adjustPromotionItem(selectedRun.id, item.id, attributes)
      const run = await fetchPromotionRun(selectedRun.id)
      setSelectedRun(run)
    } catch (failure) {
      setActionError(
        Object.values(getApiFieldErrors(failure)).flat()[0] ??
          getApiErrorMessage(failure, 'Unable to adjust this promotion item.'),
      )
    } finally {
      setIsBusy(false)
    }
  }

  async function handleAllocate() {
    if (!selectedRun) return
    setIsBusy(true)
    setActionError(null)
    setSuccess(null)
    try {
      const result = await allocatePromotionRun(selectedRun.id)
      setSelectedRun(result.run)
      setAllocation(result.allocation)
      setSuccess('Sections allocated. Review any reported shortages before finalizing.')
      setRefreshVersion((version) => version + 1)
    } catch (failure) {
      setActionError(getApiErrorMessage(failure, 'Unable to allocate sections.'))
    } finally {
      setIsBusy(false)
    }
  }

  async function handleFinalize() {
    if (!selectedRun) return
    setIsBusy(true)
    setActionError(null)
    setSuccess(null)
    try {
      const run = await finalizePromotionRun(selectedRun.id, allowShortages)
      setSelectedRun(run)
      setSuccess(`Promotion finalized. ${run.promoted_count ?? 0} student(s) advanced.`)
      setRefreshVersion((version) => version + 1)
    } catch (failure) {
      setActionError(
        Object.values(getApiFieldErrors(failure)).flat()[0] ??
          getApiErrorMessage(failure, 'Unable to finalize the promotion run.'),
      )
    } finally {
      setIsBusy(false)
    }
  }

  const isPrepared = selectedRun?.status === 'prepared'

  return (
    <>
      <PageHeader
        eyebrow="Student progression"
        title="Promotion runs"
        description="Prepare, review, and finalize year-level advancement after the Second Semester ends."
        actions={
          <Button
            variant="outline"
            leftIcon={<RefreshCw className="size-4" aria-hidden="true" />}
            onClick={() => setRefreshVersion((version) => version + 1)}
          >
            Refresh
          </Button>
        }
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

      {actionError ? (
        <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {actionError}
        </div>
      ) : null}

      {optionsError ? (
        <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {optionsError}
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-ink">Prepare a promotion run</h2>
          </CardHeader>
          <CardBody>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="promotion-source-year" className="block text-sm font-medium text-ink">Source academic year</label>
                <select
                  id="promotion-source-year"
                  value={sourceYearId}
                  onChange={(event) => {
                    setSourceYearId(event.target.value)
                    setSourceTermId('')
                  }}
                  className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="">Select source year</option>
                  {(options?.academic_years ?? []).map((year) => (
                    <option key={year.id} value={year.id}>{year.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="promotion-source-term" className="block text-sm font-medium text-ink">Source Second Semester</label>
                <select
                  id="promotion-source-term"
                  value={sourceTermId}
                  onChange={(event) => setSourceTermId(event.target.value)}
                  className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="">Select source term</option>
                  {sourceTerms.map((term) => (
                    <option key={term.id} value={term.id}>{term.name} · {term.term}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="promotion-target-year" className="block text-sm font-medium text-ink">Target academic year</label>
                <select
                  id="promotion-target-year"
                  value={targetYearId}
                  onChange={(event) => {
                    setTargetYearId(event.target.value)
                    setTargetTermId('')
                  }}
                  className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="">Select target year</option>
                  {(options?.academic_years ?? []).map((year) => (
                    <option key={year.id} value={year.id}>{year.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="promotion-target-term" className="block text-sm font-medium text-ink">Target term</label>
                <select
                  id="promotion-target-term"
                  value={targetTermId}
                  onChange={(event) => setTargetTermId(event.target.value)}
                  className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="">Select target term</option>
                  {targetTerms.map((term) => (
                    <option key={term.id} value={term.id}>{term.name} · {term.term}</option>
                  ))}
                </select>
              </div>
            </div>
            <Button
              className="mt-4"
              leftIcon={<Play className="size-4" aria-hidden="true" />}
              isLoading={isBusy}
              disabled={!sourceYearId || !sourceTermId || !targetYearId || !targetTermId}
              onClick={() => void handlePrepare()}
            >
              Prepare promotion run
            </Button>
            <p className="mt-3 text-xs leading-5 text-ink-muted">
              Promotion can only be prepared from a Second Semester that has ended. Students with unresolved major or
              section exceptions remain reviewable before finalization.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-ink">Due promotions</h2>
          </CardHeader>
          <CardBody>
            {due.length === 0 ? (
              <p className="text-sm text-ink-muted">No ended Second Semester is currently due for promotion.</p>
            ) : (
              <ul className="divide-y divide-line">
                {due.map((promotion) => (
                  <li key={`${promotion.academic_year_id}-${promotion.source_term_id}`} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-sm font-semibold text-ink">{promotion.academic_year ?? 'Unknown year'}</p>
                      <p className="mt-0.5 text-xs text-ink-muted">{promotion.source_term} · ended {promotion.ends_on ?? '—'}</p>
                    </div>
                    <Badge tone={promotion.status === 'finalized' ? 'success' : promotion.status === 'not_prepared' ? 'warning' : 'neutral'}>
                      {promotion.status.replaceAll('_', ' ')}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-ink">Promotion history</h2>
          <Badge tone="neutral">{pagination.total} run{pagination.total === 1 ? '' : 's'}</Badge>
        </CardHeader>
        <CardBody>
          {loadError ? (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p>{loadError}</p>
              <Button className="mt-3" size="sm" variant="outline" onClick={() => setRefreshVersion((version) => version + 1)}>
                Retry
              </Button>
            </div>
          ) : isLoading ? (
            <p role="status" className="py-10 text-center text-sm text-ink-muted">Loading promotion runs…</p>
          ) : runs.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="No promotion runs yet"
              description="Prepare a run after a Second Semester ends to begin reviewing advancement."
            />
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-line">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-stone-50 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    <tr>
                      <th className="px-4 py-3">Source</th>
                      <th className="px-4 py-3">Target</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Prepared</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {runs.map((run) => (
                      <tr key={run.id}>
                        <td className="px-4 py-4 text-ink-muted">
                          <p className="text-ink">{run.source_academic_year?.label ?? '—'}</p>
                          <p className="mt-0.5 text-xs">{run.source_term?.name ?? '—'}</p>
                        </td>
                        <td className="px-4 py-4 text-ink-muted">
                          <p className="text-ink">{run.target_academic_year?.label ?? '—'}</p>
                          <p className="mt-0.5 text-xs">{run.target_term?.name ?? '—'}</p>
                        </td>
                        <td className="px-4 py-4">
                          <Badge tone={runTone(run.status)}>{run.status}</Badge>
                        </td>
                        <td className="px-4 py-4 text-ink-muted">{run.prepared_at ? new Date(run.prepared_at).toLocaleString() : '—'}</td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end">
                            <Button type="button" size="sm" variant="outline" onClick={() => void openRun(run.id)}>
                              Open
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-ink-muted">Page {page} of {pagination.last_page}</p>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                    <ChevronLeft className="size-4" aria-hidden="true" />
                    Previous
                  </Button>
                  <Button type="button" size="sm" variant="outline" disabled={page >= pagination.last_page} onClick={() => setPage((current) => Math.min(pagination.last_page, current + 1))}>
                    Next
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardBody>
      </Card>

      {selectedRun ? (
        <Card className="mt-5">
          <CardHeader className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink">
                {selectedRun.source_academic_year?.label ?? 'Run'} → {selectedRun.target_academic_year?.label ?? 'Target'}
              </h2>
              <p className="mt-1 text-xs text-ink-muted">
                {selectedRun.items.length} student item{selectedRun.items.length === 1 ? '' : 's'} · {selectedRun.target_term?.name ?? 'Target term'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={runTone(selectedRun.status)}>{selectedRun.status}</Badge>
              {isPrepared ? (
                <>
                  <Button type="button" size="sm" variant="outline" isLoading={isBusy} onClick={() => void handleAllocate()}>
                    Allocate sections
                  </Button>
                  <label className="flex items-center gap-2 text-xs font-medium text-ink-muted">
                    <input
                      type="checkbox"
                      checked={allowShortages}
                      onChange={(event) => setAllowShortages(event.target.checked)}
                      className="size-4 rounded border-line text-brand-700 focus:ring-brand-500"
                    />
                    Allow shortages
                  </label>
                  <Button type="button" size="sm" isLoading={isBusy} onClick={() => void handleFinalize()}>
                    Finalize
                  </Button>
                </>
              ) : null}
            </div>
          </CardHeader>
          <CardBody>
            {allocation ? (
              <div className="mb-5 rounded-lg border border-line bg-stone-50 p-4">
                <div className="flex flex-wrap gap-4 text-sm">
                  <p><span className="text-ink-muted">Students:</span> <span className="font-semibold text-ink">{allocation.totals.students}</span></p>
                  <p><span className="text-ink-muted">Required sections:</span> <span className="font-semibold text-ink">{allocation.totals.required_sections}</span></p>
                  <p><span className="text-ink-muted">Existing sections:</span> <span className="font-semibold text-ink">{allocation.totals.existing_sections}</span></p>
                  <p><span className="text-ink-muted">Shortage sections:</span> <span className="font-semibold text-ink">{allocation.totals.shortage_sections}</span></p>
                  <p><span className="text-ink-muted">Shortage seats:</span> <span className="font-semibold text-ink">{allocation.totals.shortage_seats}</span></p>
                </div>
                {allocation.totals.shortage_sections > 0 ? (
                  <p className="mt-2 flex items-center gap-2 text-sm text-amber-700">
                    <TriangleAlert className="size-4" aria-hidden="true" />
                    Configure additional sections or finalize with shortages after review.
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="overflow-x-auto rounded-lg border border-line">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-stone-50 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  <tr>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">From</th>
                    <th className="px-4 py-3">To year level</th>
                    <th className="px-4 py-3">Major</th>
                    <th className="px-4 py-3">Section</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {selectedRun.items.map((item) => {
                    const programId = item.student.program_id
                    const majorOptions = (options?.majors ?? []).filter((major) =>
                      programId === undefined || major.program_id === programId,
                    )
                    const sectionOptions = sections.filter((section) =>
                      section.program_id === programId &&
                      section.year_level_id === item.to_year_level_id &&
                      (section.major_id ?? null) === (item.major_id ?? null),
                    )

                    return (
                      <tr key={item.id} className="align-top">
                        <td className="px-4 py-4">
                          <p className="font-semibold text-ink">{item.student.user?.name ?? 'Unknown student'}</p>
                          <p className="mt-0.5 text-xs text-ink-muted">{item.student.student_number}</p>
                        </td>
                        <td className="px-4 py-4 text-ink-muted">{item.from_year_level?.name ?? '—'}</td>
                        <td className="px-4 py-4">
                          <select
                            value={item.to_year_level_id ?? ''}
                            disabled={!isPrepared || isBusy}
                            onChange={(event) => void handleAdjust(item, {
                              to_year_level_id: event.target.value ? Number(event.target.value) : null,
                            })}
                            className="h-9 w-full min-w-32 rounded-lg border border-line bg-white px-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                          >
                            <option value="">No higher level</option>
                            {(options?.year_levels ?? []).map((level) => (
                              <option key={level.id} value={level.id}>{level.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-4">
                          <select
                            value={item.major_id ?? ''}
                            disabled={!isPrepared || isBusy}
                            onChange={(event) => void handleAdjust(item, {
                              major_id: event.target.value ? Number(event.target.value) : null,
                            })}
                            className="h-9 w-full min-w-32 rounded-lg border border-line bg-white px-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                          >
                            <option value="">No major</option>
                            {majorOptions.map((major) => (
                              <option key={major.id} value={major.id}>{major.code}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-4">
                          <select
                            value={item.section_id ?? ''}
                            disabled={!isPrepared || isBusy}
                            onChange={(event) => void handleAdjust(item, {
                              section_id: event.target.value ? Number(event.target.value) : null,
                            })}
                            className="h-9 w-full min-w-32 rounded-lg border border-line bg-white px-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                          >
                            <option value="">Unassigned</option>
                            {sectionOptions.map((section) => (
                              <option key={section.id} value={section.id}>{section.code}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-4">
                          <Badge tone={itemTone(item.status)}>{item.status}</Badge>
                          {item.exception_message ? (
                            <p className="mt-1 max-w-52 text-xs text-ink-muted">{item.exception_message}</p>
                          ) : null}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      ) : null}
    </>
  )
}
