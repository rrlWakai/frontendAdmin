import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/common/Button'
import { TextField } from '@/components/common/TextField'
import { fetchCurriculumSubjects } from '@/services/api/subjectOfferings'
import type {
  SubjectOffering,
  SubjectOfferingInput,
  SubjectOfferingOptions,
  SubjectOfferingProfessor,
  SubjectOfferingSubject,
  SubjectOfferingUpdateInput,
  SubjectOfferingYearLevel,
} from '@/types/subjectOffering'
import { getApiErrorMessage, getApiFieldErrors } from '@/utils/apiError'

export interface SubjectOfferingFormSubmission {
  payload: SubjectOfferingInput | SubjectOfferingUpdateInput
  professor_id: number | null
}

interface SubjectOfferingFormDialogProps {
  offering: SubjectOffering | null
  options: SubjectOfferingOptions
  termId: number
  onCancel: () => void
  onSubmit: (submission: SubjectOfferingFormSubmission) => Promise<void>
}

interface SubjectOfferingFormValues {
  program_id: string
  year_level_id: string
  section_id: string
  subject_id: string
  expected_students: string
  professor_id: string
}

const selectClass = 'h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-ink-muted'

function isProfessorActive(professor: SubjectOfferingProfessor): boolean {
  return professor.status === 'active' && professor.user?.status === 'active'
}

export function SubjectOfferingFormDialog({
  offering,
  options,
  termId,
  onCancel,
  onSubmit,
}: SubjectOfferingFormDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const structuralLocked = offering !== null && offering.status !== 'draft'
  const activeAssignments = offering?.faculty_assignments?.filter((assignment) => assignment.status === 'active') ?? []
  const currentProfessorId = activeAssignments[0]?.professor.id
  const currentProfessorIds = new Set(activeAssignments.map((assignment) => assignment.professor.id))
  const selectableProfessors = options.professors.filter((professor) => (
    isProfessorActive(professor) || currentProfessorIds.has(professor.id)
  ))
  const currentProfessor = options.professors.find((professor) => professor.id === currentProfessorId)
  const [values, setValues] = useState<SubjectOfferingFormValues>(() => ({
    program_id: offering ? String(offering.section.program_id) : '',
    year_level_id: offering ? String(offering.section.year_level_id) : '',
    section_id: offering ? String(offering.section_id) : '',
    subject_id: offering ? String(offering.subject_id) : '',
    expected_students: offering?.expected_students === null || offering?.expected_students === undefined
      ? ''
      : String(offering.expected_students),
    professor_id: currentProfessorId ? String(currentProfessorId) : '',
  }))
  const [curriculumSubjects, setCurriculumSubjects] = useState<SubjectOfferingSubject[]>([])
  const [isCurriculumLoading, setIsCurriculumLoading] = useState(Boolean(offering))
  const [curriculumError, setCurriculumError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  const term = options.terms.find((item) => item.id === termId)
  const termSections = options.sections.filter((section) => section.academic_term_id === termId)
  const programs = options.programs.filter((program) => (
    termSections.some((section) => section.program_id === program.id)
    || offering?.section.program_id === program.id
  ))
  const yearLevels = Array.from(
    new Map(
      termSections
        .filter((section) => String(section.program_id) === values.program_id)
        .map((section) => [section.year_level_id, section.year_level]),
    ).values(),
  ).filter((yearLevel): yearLevel is SubjectOfferingYearLevel => Boolean(yearLevel))
  const sections = termSections.filter((section) => (
    String(section.program_id) === values.program_id
    && String(section.year_level_id) === values.year_level_id
    && (section.status === 'active' || section.id === offering?.section_id)
  ))
  const selectedSection = options.sections.find((section) => String(section.id) === values.section_id)
  const selectedProgram = options.programs.find((program) => String(program.id) === values.program_id)
  const selectedYearLevel = yearLevels.find((yearLevel) => String(yearLevel.id) === values.year_level_id)
  const isOriginalSection = Boolean(offering && selectedSection?.id === offering.section_id)
  const subjectOptions = [...curriculumSubjects]
  if (
    offering
    && isOriginalSection
    && !subjectOptions.some((subject) => subject.id === offering.subject_id)
  ) {
    subjectOptions.unshift(offering.subject)
  }
  const offeringSubjectNotMapped = Boolean(
    offering
    && isOriginalSection
    && !isCurriculumLoading
    && !curriculumError
    && !curriculumSubjects.some((subject) => subject.id === offering.subject_id),
  )
  const selectedSubjectNotMapped = Boolean(
    offering
    && offeringSubjectNotMapped
    && Number(values.subject_id) === offering.subject_id,
  )
  const preservesExistingSubject = Boolean(
    offering
    && isOriginalSection
    && offering.subject?.id === offering.subject_id
    && Number(values.subject_id) === offering.subject_id,
  )
  const currentProfessorInactive = Boolean(
    currentProfessor
    && currentProfessorId !== undefined
    && values.professor_id === String(currentProfessorId)
    && !isProfessorActive(currentProfessor),
  )
  const termSupportsFaculty = term?.status === 'active' || term?.status === 'planned'
  const publishedSchedules = offering?.published_schedules_count ?? 0
  const professorLockedBySchedules = Boolean(offering && publishedSchedules > 0 && currentProfessorId)
  const professorLocked = Boolean(
    !termSupportsFaculty
    || selectableProfessors.length === 0
    || professorLockedBySchedules,
  )
  const hasMultipleAssignments = activeAssignments.length > 1

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])

  useEffect(() => {
    if (!selectedSection || !selectedProgram || !selectedYearLevel || !term?.term) {
      setCurriculumSubjects([])
      setCurriculumError(null)
      setIsCurriculumLoading(false)
      return
    }

    let active = true
    setIsCurriculumLoading(true)
    setCurriculumError(null)

    fetchCurriculumSubjects({
      program_id: Number(values.program_id),
      year_level_id: Number(values.year_level_id),
      semester: term.term,
      major_id: selectedSection.major_id ?? undefined,
    })
      .then((subjects) => {
        if (active) {
          setCurriculumSubjects(subjects)
        }
      })
      .catch((failure) => {
        if (active) {
          setCurriculumSubjects([])
          setCurriculumError(getApiErrorMessage(failure, 'Unable to load curriculum subjects.'))
        }
      })
      .finally(() => {
        if (active) {
          setIsCurriculumLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [selectedProgram, selectedSection, selectedYearLevel, term?.term, values.program_id, values.year_level_id])

  function update<K extends keyof SubjectOfferingFormValues>(
    field: K,
    value: SubjectOfferingFormValues[K],
  ) {
    setValues((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => ({ ...current, [field]: [] }))
    setError(null)
  }

  function updateProgram(programId: string) {
    setValues((current) => ({
      ...current,
      program_id: programId,
      year_level_id: '',
      section_id: '',
      subject_id: '',
    }))
    setCurriculumSubjects([])
    setCurriculumError(null)
    setIsCurriculumLoading(false)
    setFieldErrors((current) => ({ ...current, program_id: [], year_level_id: [], section_id: [], subject_id: [] }))
    setError(null)
  }

  function updateYearLevel(yearLevelId: string) {
    setValues((current) => ({
      ...current,
      year_level_id: yearLevelId,
      section_id: '',
      subject_id: '',
    }))
    setCurriculumSubjects([])
    setCurriculumError(null)
    setIsCurriculumLoading(false)
    setFieldErrors((current) => ({ ...current, year_level_id: [], section_id: [], subject_id: [] }))
    setError(null)
  }

  function updateSection(sectionId: string) {
    setValues((current) => ({
      ...current,
      section_id: sectionId,
      subject_id: '',
    }))
    setCurriculumSubjects([])
    setCurriculumError(null)
    setIsCurriculumLoading(Boolean(sectionId))
    setFieldErrors((current) => ({ ...current, section_id: [], subject_id: [] }))
    setError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setFieldErrors({})

    if (!structuralLocked) {
      const missingFields: Record<string, string[]> = {}
      if (!values.program_id) missingFields.program_id = ['Choose a program.']
      if (!values.year_level_id) missingFields.year_level_id = ['Choose a year level.']
      if (!values.section_id) missingFields.section_id = ['Choose a section.']
      if (!values.subject_id) missingFields.subject_id = ['Choose an eligible subject.']

      if (Object.keys(missingFields).length > 0) {
        setFieldErrors(missingFields)
        setError('Complete the class details before saving.')
        return
      }

      if (
        !preservesExistingSubject
        && (isCurriculumLoading || curriculumError || subjectOptions.length === 0)
      ) {
        setError(curriculumError ?? 'Wait for the curriculum subjects to load before saving.')
        return
      }
    }

    const expectedStudents = values.expected_students.trim() === ''
      ? null
      : Number(values.expected_students)

    if (expectedStudents !== null && (!Number.isInteger(expectedStudents) || expectedStudents < 0)) {
      setFieldErrors({ expected_students: ['Expected students must be a non-negative whole number.'] })
      setError('Expected students must be a non-negative whole number.')
      return
    }

    setIsSaving(true)

    try {
      const payload = offering?.status === 'open'
        ? { expected_students: expectedStudents }
        : {
            academic_term_id: termId,
            section_id: Number(values.section_id),
            subject_id: Number(values.subject_id),
            expected_students: expectedStudents,
          }

      await onSubmit({
        payload,
        professor_id: values.professor_id ? Number(values.professor_id) : null,
      })
    } catch (failure) {
      const errors = getApiFieldErrors(failure)
      setFieldErrors(errors)
      setError(
        Object.values(errors).flat()[0]
          ?? getApiErrorMessage(failure, 'Unable to save the class assignment.'),
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
      className="fixed inset-0 m-auto max-h-[92vh] w-[min(46rem,calc(100%-2rem))] overflow-y-auto rounded-2xl border border-line bg-white p-0 text-ink shadow-2xl backdrop:bg-brand-950/45"
      aria-labelledby="subject-offering-form-title"
    >
      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5 p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">
              Class assignments
            </p>
            <h2 id="subject-offering-form-title" className="mt-1 text-xl font-semibold">
              {offering ? `Edit ${offering.subject.code} - ${offering.section.code}` : 'Create class assignment'}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              {offering
                ? 'Update the class details and professor assignment without changing linked records.'
                : 'Select a curriculum-eligible subject, then assign a professor or save the class as incomplete.'}
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
            Class structure is locked while the assignment is {offering?.status}. Only expected students and the professor assignment can be changed.
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <p className="text-sm font-medium text-ink">Academic term</p>
            <p className="rounded-lg border border-line bg-surface-soft px-3 py-2 text-sm text-ink-muted">
              {term ? `${term.academic_year} - ${term.name}` : 'No academic term selected'}
              {term?.status ? ` (${term.status})` : ''}
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="offering-program" className="block text-sm font-medium text-ink">
              Program
            </label>
            <select
              id="offering-program"
              required
              disabled={structuralLocked}
              value={values.program_id}
              aria-invalid={Boolean(fieldErrors.program_id?.[0])}
              onChange={(event) => updateProgram(event.target.value)}
              className={selectClass}
            >
              <option value="">Choose a program</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.code} - {program.name}
                  {program.status !== 'active' ? ` (${program.status})` : ''}
                </option>
              ))}
            </select>
            {fieldErrors.program_id?.[0] ? (
              <p className="text-xs font-medium text-red-600">{fieldErrors.program_id[0]}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="offering-year-level" className="block text-sm font-medium text-ink">
              Year level
            </label>
            <select
              id="offering-year-level"
              required
              disabled={structuralLocked || !values.program_id}
              value={values.year_level_id}
              aria-invalid={Boolean(fieldErrors.year_level_id?.[0])}
              onChange={(event) => updateYearLevel(event.target.value)}
              className={selectClass}
            >
              <option value="">Choose a year level</option>
              {yearLevels.map((yearLevel) => (
                <option key={yearLevel.id} value={yearLevel.id}>
                  {yearLevel.name}
                </option>
              ))}
            </select>
            {fieldErrors.year_level_id?.[0] ? (
              <p className="text-xs font-medium text-red-600">{fieldErrors.year_level_id[0]}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="offering-section" className="block text-sm font-medium text-ink">
              Section
            </label>
            <select
              id="offering-section"
              required
              disabled={structuralLocked || !values.year_level_id}
              value={values.section_id}
              aria-invalid={Boolean(fieldErrors.section_id?.[0])}
              onChange={(event) => updateSection(event.target.value)}
              className={selectClass}
            >
              <option value="">Choose a section</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.code}
                  {section.name ? ` - ${section.name}` : ''}
                  {section.status !== 'active' ? ` (${section.status})` : ''}
                </option>
              ))}
            </select>
            {fieldErrors.section_id?.[0] ? (
              <p className="text-xs font-medium text-red-600">{fieldErrors.section_id[0]}</p>
            ) : !values.program_id ? (
              <p className="text-xs text-ink-muted">Choose a program first.</p>
            ) : !values.year_level_id ? (
              <p className="text-xs text-ink-muted">Choose a year level to see matching sections.</p>
            ) : sections.length === 0 ? (
              <p className="text-xs text-ink-muted">No active sections match this program and year level.</p>
            ) : selectedSection?.major ? (
              <p className="text-xs text-ink-muted">Major: {selectedSection.major.name}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="offering-subject" className="block text-sm font-medium text-ink">
              Subject
            </label>
            <select
              id="offering-subject"
              required
              disabled={structuralLocked || !values.section_id || isCurriculumLoading}
              value={values.subject_id}
              aria-invalid={Boolean(fieldErrors.subject_id?.[0])}
              onChange={(event) => update('subject_id', event.target.value)}
              className={selectClass}
            >
              <option value="">
                {isCurriculumLoading ? 'Loading eligible subjects...' : 'Choose an eligible subject'}
              </option>
              {subjectOptions.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.code} - {subject.title}
                  {offeringSubjectNotMapped && subject.id === offering?.subject_id ? ' (not in current curriculum)' : ''}
                </option>
              ))}
            </select>
            {fieldErrors.subject_id?.[0] ? (
              <p className="text-xs font-medium text-red-600">{fieldErrors.subject_id[0]}</p>
            ) : !selectedSection ? (
              <p className="text-xs text-ink-muted">Choose a section to see curriculum-eligible subjects.</p>
            ) : curriculumError ? (
              <div className="space-y-1">
                <p className={`text-xs font-medium ${preservesExistingSubject ? 'text-amber-700' : 'text-red-600'}`}>
                  {curriculumError}
                </p>
                {preservesExistingSubject ? (
                  <p className="text-xs text-ink-muted">
                    The existing subject will be preserved. You can save this draft without reloading the curriculum.
                  </p>
                ) : null}
              </div>
            ) : isCurriculumLoading ? (
              <p className="text-xs text-ink-muted">Loading subjects from the curriculum.</p>
            ) : subjectOptions.length === 0 ? (
              <p className="text-xs font-medium text-amber-700">
                No active subjects are mapped to this curriculum scope. Update Curriculum first.
              </p>
            ) : selectedSubjectNotMapped ? (
              <p className="text-xs font-medium text-amber-700">
                The current subject is not mapped to this curriculum scope. Review Curriculum mapping.
              </p>
            ) : (
              <p className="text-xs text-ink-muted">
                Eligible subjects come from {selectedProgram?.code ?? 'the program'} · {selectedYearLevel?.name ?? 'this year level'} · {term?.term ?? 'this semester'}.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="offering-professor" className="block text-sm font-medium text-ink">
              Professor <span className="font-normal text-ink-muted">(optional)</span>
            </label>
            <select
              id="offering-professor"
              disabled={professorLocked}
              value={values.professor_id}
              onChange={(event) => update('professor_id', event.target.value)}
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
            {!termSupportsFaculty ? (
              <p className="text-xs text-amber-700">
                Professor assignment requires an active or planned term. Save this class as incomplete and assign later.
              </p>
            ) : professorLockedBySchedules ? (
              <p className="text-xs text-ink-muted">
                The professor is locked because published schedules exist for this class assignment.
              </p>
            ) : selectableProfessors.length === 0 ? (
              <p className="text-xs text-amber-700">
                No active professors are available. Save this class as incomplete and assign later.
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
                Leave blank to save as incomplete. Selecting a professor opens the class assignment and assigns them.
              </p>
            )}
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
          <Button
            type="submit"
            isLoading={isSaving}
            disabled={
              !term
              || (
                !structuralLocked
                && !preservesExistingSubject
                && (isCurriculumLoading || Boolean(curriculumError) || subjectOptions.length === 0)
              )
            }
          >
            {offering ? 'Save changes' : 'Create class assignment'}
          </Button>
        </div>
      </form>
    </dialog>
  )
}
