import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/common/Button'
import { TextField } from '@/components/common/TextField'
import type {
  SubjectOffering,
  SubjectOfferingInput,
  SubjectOfferingOptions,
  SubjectOfferingUpdateInput,
} from '@/types/subjectOffering'
import { getApiErrorMessage, getApiFieldErrors } from '@/utils/apiError'

interface SubjectOfferingFormDialogProps {
  offering: SubjectOffering | null
  options: SubjectOfferingOptions
  onCancel: () => void
  onSubmit: (payload: SubjectOfferingInput | SubjectOfferingUpdateInput) => Promise<void>
}

interface SubjectOfferingFormValues {
  academic_term_id: string
  section_id: string
  subject_id: string
  expected_students: string
}

const selectClass = 'h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-ink-muted'

export function SubjectOfferingFormDialog({
  offering,
  options,
  onCancel,
  onSubmit,
}: SubjectOfferingFormDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const structuralLocked = offering !== null && offering.status !== 'draft'
  const [values, setValues] = useState<SubjectOfferingFormValues>(() => ({
    academic_term_id: String(
      offering?.academic_term_id
        ?? options.terms.find((term) => term.is_current)?.id
        ?? options.terms[0]?.id
        ?? '',
    ),
    section_id: offering ? String(offering.section_id) : '',
    subject_id: offering ? String(offering.subject_id) : '',
    expected_students: offering?.expected_students === null || offering?.expected_students === undefined
      ? ''
      : String(offering.expected_students),
  }))
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])

  const filteredSections = options.sections.filter(
    (section) => String(section.academic_term_id) === values.academic_term_id,
  )

  function update<K extends keyof SubjectOfferingFormValues>(
    field: K,
    value: SubjectOfferingFormValues[K],
  ) {
    setValues((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => ({ ...current, [field]: [] }))
    setError(null)
  }

  function updateTerm(termId: string) {
    setValues((current) => {
      const selectedSection = options.sections.find(
        (section) => String(section.id) === current.section_id,
      )
      const keepsSection = selectedSection
        ? String(selectedSection.academic_term_id) === termId
        : false

      return {
        ...current,
        academic_term_id: termId,
        section_id: keepsSection ? current.section_id : '',
      }
    })
    setFieldErrors((current) => ({ ...current, academic_term_id: [], section_id: [] }))
    setError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError(null)
    setFieldErrors({})

    const expectedStudents = values.expected_students.trim() === ''
      ? null
      : Number(values.expected_students)

    if (expectedStudents !== null && (!Number.isInteger(expectedStudents) || expectedStudents < 0)) {
      setFieldErrors({ expected_students: ['Expected students must be a non-negative whole number.'] })
      setError('Expected students must be a non-negative whole number.')
      setIsSaving(false)
      return
    }

    try {
      if (offering?.status === 'open') {
        await onSubmit({ expected_students: expectedStudents })
      } else {
        await onSubmit({
          academic_term_id: Number(values.academic_term_id),
          section_id: Number(values.section_id),
          subject_id: Number(values.subject_id),
          expected_students: expectedStudents,
        })
      }
    } catch (failure) {
      const errors = getApiFieldErrors(failure)
      setFieldErrors(errors)
      setError(
        Object.values(errors).flat()[0]
          ?? getApiErrorMessage(failure, 'Unable to save the subject offering.'),
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
      className="fixed inset-0 m-auto max-h-[92vh] w-[min(44rem,calc(100%-2rem))] overflow-y-auto rounded-2xl border border-line bg-white p-0 text-ink shadow-2xl backdrop:bg-brand-950/45"
      aria-labelledby="subject-offering-form-title"
    >
      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5 p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">
              Subject offerings
            </p>
            <h2 id="subject-offering-form-title" className="mt-1 text-xl font-semibold">
              {offering ? `Edit ${offering.subject.code} - ${offering.section.code}` : 'Create subject offering'}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              {offering
                ? 'Draft offerings can change structure. Open offerings only allow expected student updates.'
                : 'New offerings always start as drafts and can be opened once their term, section, and subject are ready.'}
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

        {structuralLocked ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Structure is locked for {offering?.status} offerings. Only expected students can be changed while open.
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="offering-term" className="block text-sm font-medium text-ink">
              Academic term
            </label>
            <select
              id="offering-term"
              required
              disabled={structuralLocked}
              value={values.academic_term_id}
              aria-invalid={Boolean(fieldErrors.academic_term_id?.[0])}
              onChange={(event) => updateTerm(event.target.value)}
              className={selectClass}
            >
              <option value="">Choose a term</option>
              {options.terms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.academic_year} - {term.name}
                  {term.status === 'archived' ? ' (archived)' : ''}
                </option>
              ))}
            </select>
            {fieldErrors.academic_term_id?.[0] ? (
              <p className="text-xs font-medium text-red-600">{fieldErrors.academic_term_id[0]}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="offering-section" className="block text-sm font-medium text-ink">
              Section
            </label>
            <select
              id="offering-section"
              required
              disabled={structuralLocked}
              value={values.section_id}
              aria-invalid={Boolean(fieldErrors.section_id?.[0])}
              onChange={(event) => update('section_id', event.target.value)}
              className={selectClass}
            >
              <option value="">Choose a section</option>
              {filteredSections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.code}
                  {section.name ? ` - ${section.name}` : ''}
                  {section.program ? ` (${section.program.code})` : ''}
                </option>
              ))}
            </select>
            {fieldErrors.section_id?.[0] ? (
              <p className="text-xs font-medium text-red-600">{fieldErrors.section_id[0]}</p>
            ) : !values.academic_term_id ? (
              <p className="text-xs text-ink-muted">Choose a term first to see matching sections.</p>
            ) : filteredSections.length === 0 ? (
              <p className="text-xs text-ink-muted">No sections are available for this term.</p>
            ) : null}
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="offering-subject" className="block text-sm font-medium text-ink">
              Subject
            </label>
            <select
              id="offering-subject"
              required
              disabled={structuralLocked}
              value={values.subject_id}
              aria-invalid={Boolean(fieldErrors.subject_id?.[0])}
              onChange={(event) => update('subject_id', event.target.value)}
              className={selectClass}
            >
              <option value="">Choose a subject</option>
              {options.subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.code} - {subject.title}
                  {subject.status !== 'active' ? ` (${subject.status})` : ''}
                </option>
              ))}
            </select>
            {fieldErrors.subject_id?.[0] ? (
              <p className="text-xs font-medium text-red-600">{fieldErrors.subject_id[0]}</p>
            ) : null}
          </div>

          <TextField
            label="Expected students"
            type="number"
            min={0}
            max={65535}
            step={1}
            value={values.expected_students}
            error={fieldErrors.expected_students?.[0]}
            hint={
              offering?.status === 'open'
                ? 'Cannot be lower than the current enrolled count or the capacity of rooms used by published schedules.'
                : 'Optional planning estimate used when allocating rooms.'
            }
            onChange={(event) => update('expected_students', event.target.value)}
            className="sm:col-span-2"
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSaving}>
            {offering ? 'Save changes' : 'Create draft'}
          </Button>
        </div>
      </form>
    </dialog>
  )
}
