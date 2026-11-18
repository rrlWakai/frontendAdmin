import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import {
  CalendarClock,
  Check,
  GraduationCap,
  Pencil,
  RefreshCw,
  TriangleAlert,
  Users,
} from 'lucide-react'
import { Button } from '@/components/common/Button'
import { Card, CardBody, CardHeader } from '@/components/common/Card'
import { SelectField } from '@/components/common/SelectField'
import { TextAreaField } from '@/components/common/TextAreaField'
import { TextField } from '@/components/common/TextField'
import { useAuth } from '@/hooks/useAuth'
import {
  correctMajorSelection,
  createAcademicRecord,
  fetchAcademicDirectory,
  fetchAcademicOptions,
  fetchDuePromotions,
  fetchMajorSelections,
  fetchPromotionRuns,
  updateAcademicRecord,
} from '@/services/api/academic'
import type {
  AcademicMajorSelection,
  AcademicMajorSelectionPeriod,
  AcademicOptions,
  DuePromotion,
  PromotionRun,
} from '@/types/academic'
import { getApiErrorMessage, getApiFieldErrors } from '@/utils/apiError'

function formatDateTime(value: string | null): string {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function toDateTimeLocal(value: string | null): string {
  if (!value) return ''

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return ''

  const pad = (part: number) => String(part).padStart(2, '0')

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function statusTone(status: string): string {
  if (['active', 'finalized', 'approved'].includes(status)) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }

  if (['exception', 'rejected', 'not_prepared'].includes(status)) {
    return 'border-amber-200 bg-amber-50 text-amber-700'
  }

  return 'border-stone-200 bg-stone-50 text-ink-muted'
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusTone(status)}`}>
      {status.replaceAll('_', ' ')}
    </span>
  )
}

interface PeriodDialogProps {
  period: AcademicMajorSelectionPeriod | null
  options: AcademicOptions
  onCancel: () => void
  onSaved: (message: string) => void
}

function PeriodDialog({ period, options, onCancel, onSaved }: PeriodDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const targetLevel = options.year_levels.find((level) => level.level === 3)
  const [academicYearId, setAcademicYearId] = useState(period ? String(period.academic_year_id) : '')
  const [programId, setProgramId] = useState(period ? String(period.program_id) : '')
  const [opensAt, setOpensAt] = useState(toDateTimeLocal(period?.opens_at ?? null))
  const [closesAt, setClosesAt] = useState(toDateTimeLocal(period?.closes_at ?? null))
  const [allowChanges, setAllowChanges] = useState(period?.allow_changes ?? true)
  const [status, setStatus] = useState(period?.status ?? 'planned')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setFieldErrors({})

    if (!targetLevel) {
      setError('Configure a third-year level before creating major selection windows.')
      return
    }

    setIsSaving(true)

    const payload = {
      academic_year_id: Number(academicYearId),
      program_id: Number(programId),
      target_year_level_id: targetLevel.id,
      opens_at: opensAt,
      closes_at: closesAt,
      allow_changes: allowChanges,
      status,
    }

    try {
      if (period) {
        await updateAcademicRecord('major-selection-periods', period.id, payload)
        onSaved('Major selection window updated.')
      } else {
        await createAcademicRecord('major-selection-periods', payload)
        onSaved('Major selection window created.')
      }
    } catch (failure) {
      const errors = getApiFieldErrors(failure)
      setFieldErrors(errors)
      setError(
        Object.values(errors).flat()[0] ??
          getApiErrorMessage(failure, 'Unable to save the major selection window.'),
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
      className="fixed inset-0 m-auto max-h-[92vh] w-[min(42rem,calc(100%-2rem))] overflow-y-auto rounded-2xl border border-line bg-white p-0 text-ink shadow-2xl backdrop:bg-brand-950/45"
      aria-labelledby="major-selection-window-title"
    >
      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5 p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">
              Progression oversight
            </p>
            <h2 id="major-selection-window-title" className="mt-1 text-xl font-semibold">
              {period ? 'Edit selection window' : 'Create selection window'}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Students choose a major while transitioning into third year.
            </p>
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            Close
          </Button>
        </div>

        {error ? (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Academic year"
            value={academicYearId}
            options={options.academic_years.map((year) => ({
              value: String(year.id),
              label: `${year.label} (${year.status})`,
            }))}
            onChange={setAcademicYearId}
            error={fieldErrors.academic_year_id?.[0]}
            required
          />
          <SelectField
            label="Program"
            value={programId}
            options={options.programs.map((program) => ({
              value: String(program.id),
              label: `${program.code} · ${program.name}`,
            }))}
            onChange={setProgramId}
            error={fieldErrors.program_id?.[0]}
            required
            searchable
          />
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-ink">Target year level</p>
            <div className="flex h-11 items-center rounded-xl border border-line bg-stone-50 px-3 text-sm text-ink-muted">
              {targetLevel ? targetLevel.name : 'Third year level is not configured'}
            </div>
            {fieldErrors.target_year_level_id?.[0] ? (
              <p className="text-xs font-medium text-red-600">{fieldErrors.target_year_level_id[0]}</p>
            ) : null}
          </div>
          <SelectField
            label="Status"
            value={status}
            options={[
              { value: 'planned', label: 'Planned' },
              { value: 'active', label: 'Active' },
              { value: 'closed', label: 'Closed' },
              { value: 'archived', label: 'Archived' },
            ]}
            onChange={(value) => setStatus(value as AcademicMajorSelectionPeriod['status'])}
            error={fieldErrors.status?.[0]}
          />
          <TextField
            label="Opens at"
            type="datetime-local"
            value={opensAt}
            onChange={(event) => setOpensAt(event.target.value)}
            error={fieldErrors.opens_at?.[0]}
            required
          />
          <TextField
            label="Closes at"
            type="datetime-local"
            value={closesAt}
            onChange={(event) => setClosesAt(event.target.value)}
            error={fieldErrors.closes_at?.[0]}
            required
          />
          <label className="flex items-center gap-3 text-sm font-medium text-ink sm:col-span-2">
            <input
              type="checkbox"
              checked={allowChanges}
              onChange={(event) => setAllowChanges(event.target.checked)}
              className="size-4 rounded border-line text-brand-700 focus:ring-brand-500"
            />
            Allow students to change their selection while the window is open
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSaving} disabled={!targetLevel}>
            Save window
          </Button>
        </div>
      </form>
    </dialog>
  )
}

interface CorrectionDialogProps {
  selection: AcademicMajorSelection
  options: AcademicOptions
  onCancel: () => void
  onSaved: (message: string) => void
}

function CorrectionDialog({ selection, options, onCancel, onSaved }: CorrectionDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [majorId, setMajorId] = useState(selection.major_id ? String(selection.major_id) : '')
  const [reason, setReason] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const majorOptions = options.majors.filter(
    (major) => major.program_id === selection.program_id && major.status === 'active',
  )

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setFieldErrors({})
    setIsSaving(true)

    try {
      await correctMajorSelection(selection.id, {
        major_id: Number(majorId),
        reason: reason.trim(),
      })
      onSaved('Major selection corrected and audited.')
    } catch (failure) {
      const errors = getApiFieldErrors(failure)
      setFieldErrors(errors)
      setError(
        Object.values(errors).flat()[0] ??
          getApiErrorMessage(failure, 'Unable to correct the major selection.'),
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
      className="fixed inset-0 m-auto max-h-[92vh] w-[min(36rem,calc(100%-2rem))] overflow-y-auto rounded-2xl border border-line bg-white p-0 text-ink shadow-2xl backdrop:bg-brand-950/45"
      aria-labelledby="major-selection-correction-title"
    >
      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5 p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">
              Authorized correction
            </p>
            <h2 id="major-selection-correction-title" className="mt-1 text-xl font-semibold">
              Correct major selection
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              {selection.student.user?.name ?? selection.student.student_number} · {selection.academic_year?.label ?? 'Academic year'}
            </p>
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            Close
          </Button>
        </div>

        {error ? (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="rounded-xl border border-line bg-stone-50 px-3 py-2.5 text-sm text-ink-muted">
          Current selection: <span className="font-medium text-ink">{selection.major?.name ?? '—'}</span>
        </div>

        <SelectField
          label="Corrected major"
          value={majorId}
          options={majorOptions.map((major) => ({
            value: String(major.id),
            label: `${major.code} · ${major.name}`,
          }))}
          onChange={setMajorId}
          error={fieldErrors.major_id?.[0]}
          required
          searchable
        />
        <TextAreaField
          label="Reason for correction"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          error={fieldErrors.reason?.[0]}
          hint="This reason is stored in the selection change audit trail."
          required
        />

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSaving} disabled={!majorId || reason.trim() === ''}>
            Save correction
          </Button>
        </div>
      </form>
    </dialog>
  )
}

export function ProgressionOversight() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'administrator'
  const canCorrect = isAdmin
  const [options, setOptions] = useState<AcademicOptions | null>(null)
  const [periods, setPeriods] = useState<AcademicMajorSelectionPeriod[]>([])
  const [selections, setSelections] = useState<AcademicMajorSelection[]>([])
  const [duePromotions, setDuePromotions] = useState<DuePromotion[]>([])
  const [promotionRuns, setPromotionRuns] = useState<PromotionRun[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const [periodDialog, setPeriodDialog] = useState<AcademicMajorSelectionPeriod | null | undefined>()
  const [correctionSelection, setCorrectionSelection] = useState<AcademicMajorSelection | null>(null)

  useEffect(() => {
    let active = true

    const emptyRunResult = {
      records: [] as PromotionRun[],
      pagination: { current_page: 1, last_page: 1, per_page: 6, total: 0 },
    }

    void Promise.all([
      fetchAcademicOptions(),
      fetchAcademicDirectory<AcademicMajorSelectionPeriod>('major-selection-periods', { per_page: 8 }),
      fetchMajorSelections({ per_page: 6 }),
      isAdmin ? fetchDuePromotions() : Promise.resolve([] as DuePromotion[]),
      isAdmin ? fetchPromotionRuns({ per_page: 6 }) : Promise.resolve(emptyRunResult),
    ])
      .then(([loadedOptions, periodResult, selectionResult, dueResult, runResult]) => {
        if (!active) return
        setOptions(loadedOptions)
        setPeriods(periodResult.records)
        setSelections(selectionResult.records)
        setDuePromotions(dueResult)
        setPromotionRuns(runResult.records)
      })
      .catch((failure: unknown) => {
        if (active) setError(getApiErrorMessage(failure, 'Unable to load progression oversight.'))
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [isAdmin, version])

  function refresh() {
    setIsLoading(true)
    setError(null)
    setVersion((current) => current + 1)
  }

  function saved(message: string) {
    setPeriodDialog(undefined)
    setCorrectionSelection(null)
    setSuccess(message)
    refresh()
  }

  return (
    <>
      <Card className="mt-6">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">
                Academic progression
              </p>
              <h2 className="mt-1 text-lg font-semibold text-ink">Progression oversight</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Selection windows, recent choices, due promotions, and allocation exceptions.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={refresh}
              leftIcon={<RefreshCw className="size-4" aria-hidden="true" />}
            >
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardBody className="space-y-5">
          {success ? (
            <div role="status" className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              <Check className="size-4" aria-hidden="true" />
              {success}
              <button type="button" className="ml-auto text-xs font-semibold underline" onClick={() => setSuccess(null)}>
                Dismiss
              </button>
            </div>
          ) : null}

          {error ? (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {isLoading ? (
            <p className="py-8 text-center text-sm text-ink-muted" role="status">
              Loading progression oversight…
            </p>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              <section className="rounded-xl border border-line p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="size-4 text-brand-600" aria-hidden="true" />
                    <h3 className="text-sm font-semibold text-ink">Selection windows</h3>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setPeriodDialog(null)}
                    disabled={!options || !options.year_levels.some((level) => level.level === 3)}
                  >
                    Configure
                  </Button>
                </div>
                <p className="mt-1 text-xs text-ink-muted">Only third-year transition windows are accepted.</p>
                {periods.length === 0 ? (
                  <p className="mt-3 text-sm text-ink-muted">No selection windows configured.</p>
                ) : (
                  <ul className="mt-3 divide-y divide-line">
                    {periods.map((period) => (
                      <li key={period.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-ink">
                            {period.program.code} · {period.target_year_level.name}
                          </p>
                          <p className="mt-0.5 text-xs text-ink-muted">
                            {period.academic_year.label} · {formatDateTime(period.opens_at)} to {formatDateTime(period.closes_at)}
                          </p>
                          <div className="mt-1.5 flex items-center gap-2">
                            <StatusPill status={period.status} />
                            {period.allow_changes ? <span className="text-[10px] text-ink-muted">Changes allowed</span> : null}
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setPeriodDialog(period)}
                          leftIcon={<Pencil className="size-3.5" aria-hidden="true" />}
                        >
                          Edit
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {isAdmin ? (
                <section className="rounded-xl border border-line p-4">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="size-4 text-brand-600" aria-hidden="true" />
                    <h3 className="text-sm font-semibold text-ink">Due promotions</h3>
                  </div>
                  <p className="mt-1 text-xs text-ink-muted">Automatic processing runs after an ended Second Semester.</p>
                  {duePromotions.length === 0 ? (
                    <p className="mt-3 text-sm text-ink-muted">No ended Second Semester is waiting for promotion.</p>
                  ) : (
                    <ul className="mt-3 divide-y divide-line">
                      {duePromotions.slice(0, 5).map((promotion) => (
                        <li key={promotion.source_term_id} className="py-3 first:pt-0 last:pb-0">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-ink">{promotion.academic_year ?? 'Academic year'}</p>
                              <p className="mt-0.5 text-xs text-ink-muted">
                                {promotion.source_term} ended {promotion.ends_on ?? '—'}
                                {promotion.promotion_run_id ? ` · Run #${promotion.promotion_run_id}` : ''}
                              </p>
                            </div>
                            <StatusPill status={promotion.status} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ) : null}

              <section className="rounded-xl border border-line p-4">
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-brand-600" aria-hidden="true" />
                  <h3 className="text-sm font-semibold text-ink">Recent major selections</h3>
                </div>
                <p className="mt-1 text-xs text-ink-muted">Submitted selections are used by automatic promotion.</p>
                {selections.length === 0 ? (
                  <p className="mt-3 text-sm text-ink-muted">No major selections recorded.</p>
                ) : (
                  <ul className="mt-3 divide-y divide-line">
                    {selections.map((selection) => (
                      <li key={selection.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-ink">
                            {selection.student.user?.name ?? selection.student.student_number}
                          </p>
                          <p className="mt-0.5 text-xs text-ink-muted">
                            {selection.major?.name ?? '—'} · {selection.academic_year?.label ?? 'Academic year'}
                          </p>
                          <div className="mt-1.5 flex items-center gap-2">
                            <StatusPill status={selection.status} />
                            <span className="text-[10px] text-ink-muted">{formatDateTime(selection.selected_at)}</span>
                          </div>
                        </div>
                        {canCorrect ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setCorrectionSelection(selection)}
                          >
                            Correct
                          </Button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {isAdmin ? (
                <section className="rounded-xl border border-line p-4">
                  <div className="flex items-center gap-2">
                    <TriangleAlert className="size-4 text-brand-600" aria-hidden="true" />
                    <h3 className="text-sm font-semibold text-ink">Promotion runs and exceptions</h3>
                  </div>
                <p className="mt-1 text-xs text-ink-muted">Unresolved shortages and missing requirements remain visible here.</p>
                {promotionRuns.length === 0 ? (
                  <p className="mt-3 text-sm text-ink-muted">No promotion runs recorded.</p>
                ) : (
                  <ul className="mt-3 divide-y divide-line">
                    {promotionRuns.map((run) => {
                      const exceptions = run.items.filter((item) => item.status === 'exception')
                      const exceptionCounts = exceptions.reduce<Record<string, number>>((counts, item) => {
                        const key = item.exception_code ?? 'exception'
                        counts[key] = (counts[key] ?? 0) + 1
                        return counts
                      }, {})

                      return (
                        <li key={run.id} className="py-3 first:pt-0 last:pb-0">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-ink">
                                Run #{run.id} · {run.target_academic_year?.label ?? 'Target year'}
                              </p>
                              <p className="mt-0.5 text-xs text-ink-muted">
                                {run.prepared_by === null ? 'Automatic' : 'Manual'} · {run.items.length} students · {run.items.filter((item) => item.status === 'promoted').length} promoted
                              </p>
                            </div>
                            <StatusPill status={run.status} />
                          </div>
                          {Object.keys(exceptionCounts).length > 0 ? (
                            <p className="mt-1.5 text-xs text-amber-700">
                              {Object.entries(exceptionCounts)
                                .map(([code, count]) => `${code.replaceAll('_', ' ')} (${count})`)
                                .join(' · ')}
                            </p>
                          ) : (
                            <p className="mt-1.5 text-xs text-emerald-700">No unresolved exceptions.</p>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
                </section>
              ) : null}
            </div>
          )}
        </CardBody>
      </Card>

      {periodDialog !== undefined && options ? (
        <PeriodDialog
          key={periodDialog?.id ?? 'new'}
          period={periodDialog}
          options={options}
          onCancel={() => setPeriodDialog(undefined)}
          onSaved={saved}
        />
      ) : null}

      {correctionSelection && options ? (
        <CorrectionDialog
          key={correctionSelection.id}
          selection={correctionSelection}
          options={options}
          onCancel={() => setCorrectionSelection(null)}
          onSaved={saved}
        />
      ) : null}
    </>
  )
}
