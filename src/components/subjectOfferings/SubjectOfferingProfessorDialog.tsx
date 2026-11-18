import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/common/Button'
import type {
  SubjectOffering,
  SubjectOfferingOptions,
  SubjectOfferingProfessor,
} from '@/types/subjectOffering'
import { getApiErrorMessage, getApiFieldErrors } from '@/utils/apiError'

interface SubjectOfferingProfessorDialogProps {
  offering: SubjectOffering
  options: SubjectOfferingOptions
  onCancel: () => void
  onSubmit: (professorId: number | null) => Promise<void>
}

const selectClass = 'h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink focus:border-maroon-500 focus:outline-none focus:ring-2 focus:ring-maroon-500/20 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-ink-muted'

function isProfessorActive(professor: SubjectOfferingProfessor): boolean {
  return professor.status === 'active' && professor.user?.status === 'active'
}

export function SubjectOfferingProfessorDialog({
  offering,
  options,
  onCancel,
  onSubmit,
}: SubjectOfferingProfessorDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const activeAssignments = offering.faculty_assignments?.filter((assignment) => assignment.status === 'active') ?? []
  const currentProfessorId = activeAssignments[0]?.professor.id ?? null
  const currentProfessorIds = new Set(activeAssignments.map((assignment) => assignment.professor.id))
  const selectableProfessors = options.professors.filter((professor) => (
    isProfessorActive(professor) || currentProfessorIds.has(professor.id)
  ))
  const currentProfessor = options.professors.find((professor) => professor.id === currentProfessorId)
  const term = options.terms.find((item) => item.id === offering.academic_term_id)
  const [professorId, setProfessorId] = useState(currentProfessorId ? String(currentProfessorId) : '')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  const termSupportsFaculty = term?.status === 'active' || term?.status === 'planned'
  const publishedSchedules = offering.published_schedules_count ?? 0
  const professorLockedBySchedules = publishedSchedules > 0 && currentProfessorId !== null
  const professorLocked = Boolean(
    !termSupportsFaculty
    || selectableProfessors.length === 0
    || professorLockedBySchedules,
  )
  const currentProfessorInactive = Boolean(
    currentProfessor
    && currentProfessorId !== null
    && professorId === String(currentProfessorId)
    && !isProfessorActive(currentProfessor),
  )
  const hasMultipleAssignments = activeAssignments.length > 1
  const selectedProfessorId = professorId ? Number(professorId) : null
  const hasChanged = selectedProfessorId !== currentProfessorId || activeAssignments.length > 1
  const sectionScope = [
    offering.section.program?.code,
    offering.section.year_level?.name,
    offering.section.major?.code,
  ].filter(Boolean).join(' | ')

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (professorLocked || !hasChanged) return

    setError(null)
    setFieldErrors({})
    setIsSaving(true)

    try {
      await onSubmit(selectedProfessorId)
    } catch (failure) {
      const errors = getApiFieldErrors(failure)
      setFieldErrors(errors)
      setError(
        Object.values(errors).flat()[0]
          ?? getApiErrorMessage(failure, 'Unable to update the professor assignment.'),
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
      className="fixed inset-0 m-auto max-h-[92vh] w-[min(40rem,calc(100%-2rem))] overflow-y-auto rounded-2xl border border-line bg-white p-0 text-ink shadow-2xl backdrop:bg-maroon-900/45"
      aria-labelledby="subject-offering-professor-title"
    >
      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5 p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-maroon-600">
              Class assignments
            </p>
            <h2 id="subject-offering-professor-title" className="mt-1 text-xl font-semibold">
              {currentProfessorId === null ? 'Assign professor' : 'Change professor'}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              {offering.subject.code} - {offering.section.code}
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

        <div className="rounded-lg border border-line bg-surface-soft px-4 py-3">
          <p className="font-semibold text-ink">{offering.subject.code} - {offering.subject.title}</p>
          <p className="mt-1 text-sm text-ink-muted">
            {offering.section.code}
            {sectionScope ? ` | ${sectionScope}` : ''}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            {term ? `${term.academic_year} - ${term.name}` : 'No academic term selected'}
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="offering-professor" className="block text-sm font-medium text-ink">
            Professor
          </label>
          <select
            id="offering-professor"
            disabled={professorLocked}
            value={professorId}
            aria-invalid={Boolean(fieldErrors.professor_id?.[0])}
            onChange={(event) => {
              setProfessorId(event.target.value)
              setFieldErrors((current) => ({ ...current, professor_id: [] }))
              setError(null)
            }}
            className={selectClass}
          >
            <option value="">Unassigned</option>
            {selectableProfessors.map((professor) => {
              const professorActive = isProfessorActive(professor)

              return (
                <option key={professor.id} value={professor.id} disabled={!professorActive}>
                  {professor.user?.name ?? professor.employee_number}
                  {professor.user?.name ? ` (${professor.employee_number})` : ''}
                  {!professorActive ? ' (inactive)' : ''}
                </option>
              )
            })}
          </select>
          {fieldErrors.professor_id?.[0] ? (
            <p className="text-xs font-medium text-red-600">{fieldErrors.professor_id[0]}</p>
          ) : !termSupportsFaculty ? (
            <p className="text-xs text-amber-700">
              Professor assignment requires an active or planned academic term.
            </p>
          ) : professorLockedBySchedules ? (
            <p className="text-xs text-ink-muted">
              The professor is locked because published schedules exist for this class assignment.
            </p>
          ) : selectableProfessors.length === 0 ? (
            <p className="text-xs text-amber-700">
              No active professors are available. The class remains prepared but incomplete.
            </p>
          ) : currentProfessorInactive ? (
            <p className="text-xs font-medium text-amber-700">
              The currently assigned professor is inactive. The assignment is preserved unless you choose another active professor.
            </p>
          ) : hasMultipleAssignments ? (
            <p className="text-xs font-medium text-amber-700">
              Multiple active professors are linked. Choose one to replace the current assignments.
            </p>
          ) : (
            <p className="text-xs text-ink-muted">
              Assigning a professor opens the prepared class for Intelligent Scheduling. Leave unassigned to keep it incomplete.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={isSaving}
            disabled={professorLocked || !hasChanged}
          >
            {currentProfessorId === null ? 'Assign professor' : 'Save assignment'}
          </Button>
        </div>
      </form>
    </dialog>
  )
}
