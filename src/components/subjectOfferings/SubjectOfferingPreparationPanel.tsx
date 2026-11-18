import { AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import type {
  SubjectOfferingPreparationDiagnostic,
  SubjectOfferingPreparationPlan,
} from '@/types/subjectOffering'

interface SubjectOfferingPreparationPanelProps {
  plan: SubjectOfferingPreparationPlan | null
  isLoading: boolean
  error: string | null
  isPreparing: boolean
  canPrepare: boolean
  onPrepare: () => void
  onRetry: () => void
}

function diagnosticsFor(plan: SubjectOfferingPreparationPlan): SubjectOfferingPreparationDiagnostic[] {
  return [...plan.issues, ...plan.warnings]
}

export function SubjectOfferingPreparationPanel({
  plan,
  isLoading,
  error,
  isPreparing,
  canPrepare,
  onPrepare,
  onRetry,
}: SubjectOfferingPreparationPanelProps) {
  if (isLoading && plan === null) {
    return (
      <div className="mt-5 rounded-xl border border-line bg-surface-soft/60 px-4 py-3 text-sm text-ink-muted" role="status">
        Checking curriculum coverage and prepared classes.
      </div>
    )
  }

  if (error) {
    return (
      <div className="mt-5 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between">
        <p>{error}</p>
        <Button size="sm" variant="outline" onClick={onRetry}>
          Retry plan
        </Button>
      </div>
    )
  }

  if (plan === null) return null

  const diagnostics = diagnosticsFor(plan)
  const { summary } = plan
  const hasMissing = summary.missing > 0
  const hasRequired = summary.required > 0
  const hasIssues = plan.issues.length > 0
  const isComplete = hasRequired && !hasMissing && !hasIssues
  const progress = hasRequired
    ? Math.round((summary.existing / summary.required) * 100)
    : 0

  return (
    <div className="mt-5 rounded-xl border border-line bg-white p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-3">
          <div className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg ${isComplete ? 'bg-emerald-50 text-emerald-700' : hasMissing ? 'bg-maroon-600/10 text-maroon-700' : 'bg-amber-50 text-amber-700'}`}>
            {isComplete
              ? <CheckCircle2 className="size-4" aria-hidden="true" />
              : hasMissing
                ? <Sparkles className="size-4" aria-hidden="true" />
                : <AlertTriangle className="size-4" aria-hidden="true" />}
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Academic preparation
            </p>
            <h3 className="mt-1 text-base font-semibold text-ink">
              {!hasRequired
                ? hasIssues
                  ? 'No classes can be prepared yet'
                  : 'No required classes found'
                : hasMissing
                  ? `${summary.missing} required class${summary.missing === 1 ? '' : 'es'} need preparation`
                  : hasIssues
                    ? 'Prepared classes are ready; some sections need review'
                    : 'All required classes are prepared'}
            </h3>
            <p className="mt-1 text-sm text-ink-muted">
              {summary.required} required class{summary.required === 1 ? '' : 'es'} across {summary.sections} active section{summary.sections === 1 ? '' : 's'} | {summary.existing} already prepared
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button size="sm" variant="outline" onClick={onRetry} disabled={isLoading || isPreparing}>
            Refresh plan
          </Button>
          {hasMissing ? (
            <Button
              size="sm"
              isLoading={isPreparing}
              disabled={!canPrepare || isLoading}
              onClick={onPrepare}
            >
              Prepare {summary.missing} class{summary.missing === 1 ? '' : 'es'}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-stone-100">
        <div
          className={`h-full rounded-full ${isComplete ? 'bg-emerald-500' : hasMissing ? 'bg-maroon-500' : 'bg-amber-500'}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {plan.issues.length > 0 ? (
        <p className="mt-3 text-xs font-medium text-amber-700">
          Some sections are blocked and will be skipped. Resolve the notes below before preparing those sections.
        </p>
      ) : null}

      {diagnostics.length > 0 ? (
        <details className="mt-3 rounded-lg border border-line bg-surface-soft/60">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-ink">
            Review {diagnostics.length} preparation note{diagnostics.length === 1 ? '' : 's'}
          </summary>
          <ul className="space-y-2 border-t border-line px-3 py-3">
            {diagnostics.map((diagnostic, index) => (
              <li key={`${diagnostic.code}-${diagnostic.section_id ?? 'term'}-${index}`} className="flex items-start gap-2 text-sm">
                {diagnostic.severity === 'blocking' ? (
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-stone-400" aria-hidden="true" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={diagnostic.severity === 'blocking' ? 'warning' : 'neutral'}>
                      {diagnostic.severity === 'blocking' ? 'Blocked' : 'Note'}
                    </Badge>
                    {diagnostic.section_code ? (
                      <span className="text-xs font-medium text-ink-muted">{diagnostic.section_code}</span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-ink">{diagnostic.message}</p>
                </div>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  )
}
