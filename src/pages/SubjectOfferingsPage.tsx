import { useEffect, useState } from 'react'
import { BookOpenCheck, Check, ChevronLeft, ChevronRight, Filter, Plus } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { Card, CardBody } from '@/components/common/Card'
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { TextField } from '@/components/common/TextField'
import { SubjectOfferingDetailsDialog } from '@/components/subjectOfferings/SubjectOfferingDetailsDialog'
import { SubjectOfferingFormDialog } from '@/components/subjectOfferings/SubjectOfferingFormDialog'
import { SubjectOfferingPreparationPanel } from '@/components/subjectOfferings/SubjectOfferingPreparationPanel'
import { SubjectOfferingProfessorDialog } from '@/components/subjectOfferings/SubjectOfferingProfessorDialog'
import { SubjectOfferingStatusBadge } from '@/components/subjectOfferings/SubjectOfferingStatusBadge'
import { useAuth } from '@/hooks/useAuth'
import {
  createFacultyAssignment,
  fetchSchedulingReadiness,
  updateFacultyAssignmentStatus,
} from '@/services/api/scheduling'
import {
  createSubjectOffering,
  fetchSubjectOffering,
  fetchSubjectOfferingOptions,
  fetchSubjectOfferingPreparationPlan,
  fetchSubjectOfferings,
  prepareSubjectOfferingClasses,
  updateSubjectOffering,
  updateSubjectOfferingStatus,
} from '@/services/api/subjectOfferings'
import type { SchedulingReadiness, SchedulingReadinessIssue } from '@/types/scheduling'
import type {
  SubjectOffering,
  SubjectOfferingAssignmentFilter,
  SubjectOfferingDetail,
  SubjectOfferingInput,
  SubjectOfferingOptions,
  SubjectOfferingPagination,
  SubjectOfferingPreparationPlan,
  SubjectOfferingSummary,
  SubjectOfferingUpdateInput,
  SubjectOfferingYearLevel,
} from '@/types/subjectOffering'
import { getApiErrorMessage, getApiFieldErrors } from '@/utils/apiError'

type StatusTone = 'success' | 'warning' | 'neutral' | 'danger'

interface StatusMeta {
  label: string
  tone: StatusTone
  title?: string
}

const emptyOptions: SubjectOfferingOptions = {
  terms: [],
  programs: [],
  sections: [],
  subjects: [],
  professors: [],
}

const emptyPagination: SubjectOfferingPagination = {
  current_page: 1,
  last_page: 1,
  per_page: 25,
  total: 0,
}

const selectClass = 'h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink focus:border-maroon-500 focus:outline-none focus:ring-2 focus:ring-maroon-500/20'

function canEditOffering(offering: SubjectOffering): boolean {
  return offering.status === 'draft' || offering.status === 'open'
}

function nextStatus(offering: SubjectOffering): 'open' | 'closed' | null {
  if (offering.status === 'draft' || offering.status === 'closed') return 'open'
  if (offering.status === 'open') return 'closed'
  return null
}

function statusActionLabel(offering: SubjectOffering): string {
  if (offering.status === 'draft') return 'Open'
  if (offering.status === 'open') return 'Close'
  if (offering.status === 'closed') return 'Reopen'
  return ''
}

function uniqueYearLevels(sections: SubjectOfferingOptions['sections']): SubjectOfferingYearLevel[] {
  return Array.from(
    new Map(sections.map((section) => [section.year_level_id, section.year_level])).values(),
  ).filter((yearLevel): yearLevel is SubjectOfferingYearLevel => Boolean(yearLevel))
}

export function SubjectOfferingsPage() {
  const { user } = useAuth()
  const canManage = user?.role === 'administrator' || user?.role === 'department_personnel'
  const [offerings, setOfferings] = useState<SubjectOffering[]>([])
  const [pagination, setPagination] = useState<SubjectOfferingPagination>(emptyPagination)
  const [summary, setSummary] = useState<SubjectOfferingSummary | null>(null)
  const [options, setOptions] = useState<SubjectOfferingOptions>(emptyOptions)
  const [isOptionsLoading, setIsOptionsLoading] = useState(true)
  const [optionsError, setOptionsError] = useState<string | null>(null)
  const [optionsVersion, setOptionsVersion] = useState(0)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [assignmentFilter, setAssignmentFilter] = useState<SubjectOfferingAssignmentFilter | ''>('')
  const [termFilter, setTermFilter] = useState('')
  const [programFilter, setProgramFilter] = useState('')
  const [yearLevelFilter, setYearLevelFilter] = useState('')
  const [sectionFilter, setSectionFilter] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [dialogOffering, setDialogOffering] = useState<SubjectOffering | null | undefined>(undefined)
  const [professorOffering, setProfessorOffering] = useState<SubjectOffering | null>(null)
  const [selectedOfferingId, setSelectedOfferingId] = useState<number | null>(null)
  const [detailsOffering, setDetailsOffering] = useState<SubjectOfferingDetail | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [busyOfferingId, setBusyOfferingId] = useState<number | null>(null)
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [detailVersion, setDetailVersion] = useState(0)
  const [readiness, setReadiness] = useState<SchedulingReadiness | null>(null)
  const [readinessError, setReadinessError] = useState<string | null>(null)
  const [isReadinessLoading, setIsReadinessLoading] = useState(false)
  const [readinessVersion, setReadinessVersion] = useState(0)
  const [preparation, setPreparation] = useState<SubjectOfferingPreparationPlan | null>(null)
  const [preparationError, setPreparationError] = useState<string | null>(null)
  const [isPreparationLoading, setIsPreparationLoading] = useState(false)
  const [isPreparing, setIsPreparing] = useState(false)
  const [preparationVersion, setPreparationVersion] = useState(0)
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string
    description?: string
    confirmLabel: string
    cancelLabel: string
    destructive: boolean
    onConfirm: () => void | Promise<void>
  } | null>(null)

  const selectedTerm = options.terms.find((term) => String(term.id) === termFilter)
  const canCreate = canManage
    && Boolean(selectedTerm)
    && selectedTerm?.status !== 'archived'
    && !isOptionsLoading
  const canPrepare = canCreate

  useEffect(() => {
    let active = true
    void Promise.resolve().then(async () => {
      setIsOptionsLoading(true)
      setOptionsError(null)
      try {
        const result = await fetchSubjectOfferingOptions()
        if (active) setOptions(result)
      } catch (failure) {
        if (active) setOptionsError(getApiErrorMessage(failure, 'Unable to load academic options.'))
      } finally {
        if (active) setIsOptionsLoading(false)
      }
    })
    return () => {
      active = false
    }
  }, [optionsVersion])

  useEffect(() => {
    if (termFilter || options.terms.length === 0) return

    const defaultTerm = options.terms.find((term) => term.is_current) ?? options.terms[0]
    setTermFilter(String(defaultTerm.id))
    setIsLoading(true)
  }, [options.terms, termFilter])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 300)

    return () => window.clearTimeout(timeout)
  }, [searchInput])

  useEffect(() => {
    if (!termFilter) {
      setOfferings([])
      setPagination(emptyPagination)
      setSummary(null)
      setIsLoading(false)
      return
    }

    let active = true
    void Promise.resolve().then(async () => {
      setIsLoading(true)
      setError(null)
      try {
        const result = await fetchSubjectOfferings({
          search: search || undefined,
          assignment_status: assignmentFilter || undefined,
          academic_term_id: Number(termFilter),
          program_id: programFilter ? Number(programFilter) : undefined,
          year_level_id: yearLevelFilter ? Number(yearLevelFilter) : undefined,
          section_id: sectionFilter ? Number(sectionFilter) : undefined,
          subject_id: subjectFilter ? Number(subjectFilter) : undefined,
          page,
          per_page: 25,
        })
        if (active) {
          setOfferings(result.offerings)
          setPagination(result.pagination)
          setSummary(result.summary)
        }
      } catch (failure) {
        if (active) setError(getApiErrorMessage(failure, 'Unable to load class assignments.'))
      } finally {
        if (active) setIsLoading(false)
      }
    })
    return () => {
      active = false
    }
  }, [assignmentFilter, page, programFilter, refreshVersion, search, sectionFilter, subjectFilter, termFilter, yearLevelFilter])

  useEffect(() => {
    if (!termFilter) {
      setReadiness(null)
      setReadinessError(null)
      setIsReadinessLoading(false)
      return
    }

    let active = true
    void Promise.resolve().then(async () => {
      setIsReadinessLoading(true)
      setReadinessError(null)
      try {
        const result = await fetchSchedulingReadiness(Number(termFilter))
        if (active) setReadiness(result)
      } catch (failure) {
        if (active) {
          setReadiness(null)
          setReadinessError(getApiErrorMessage(failure, 'Unable to load scheduling readiness.'))
        }
      } finally {
        if (active) setIsReadinessLoading(false)
      }
    })
    return () => {
      active = false
    }
  }, [readinessVersion, termFilter])

  useEffect(() => {
    if (!termFilter) {
      setPreparation(null)
      setPreparationError(null)
      setIsPreparationLoading(false)
      return
    }

    let active = true
    void Promise.resolve().then(async () => {
      setIsPreparationLoading(true)
      setPreparationError(null)
      try {
        const result = await fetchSubjectOfferingPreparationPlan(Number(termFilter))
        if (active) setPreparation(result)
      } catch (failure) {
        if (active) {
          setPreparation(null)
          setPreparationError(getApiErrorMessage(failure, 'Unable to load the class preparation plan.'))
        }
      } finally {
        if (active) setIsPreparationLoading(false)
      }
    })
    return () => {
      active = false
    }
  }, [preparationVersion, termFilter])

  useEffect(() => {
    if (selectedOfferingId === null) return

    let active = true
    void Promise.resolve().then(async () => {
      try {
        const result = await fetchSubjectOffering(selectedOfferingId)
        if (active) {
          setDetailsOffering(result)
          setDetailError(null)
        }
      } catch (failure) {
        if (active) setDetailError(getApiErrorMessage(failure, 'Unable to load class assignment details.'))
      } finally {
        if (active) setIsDetailLoading(false)
      }
    })
    return () => {
      active = false
    }
  }, [detailVersion, selectedOfferingId])

  const termSections = options.sections.filter((section) => section.academic_term_id === Number(termFilter))
  const programYearLevels = uniqueYearLevels(
    termSections.filter((section) => !programFilter || section.program_id === Number(programFilter)),
  )
  const filteredSectionOptions = termSections.filter((section) => (
    (!programFilter || section.program_id === Number(programFilter))
    && (!yearLevelFilter || section.year_level_id === Number(yearLevelFilter))
  ))
  const activeFilterCount = [assignmentFilter, programFilter, yearLevelFilter, sectionFilter, subjectFilter]
    .filter(Boolean).length
  const hasFilters = activeFilterCount > 0 || searchInput.trim() !== ''

  function offeringIssues(offering: SubjectOffering): SchedulingReadinessIssue[] {
    const offeringId = String(offering.id)
    const professorIds = new Set(
      (offering.faculty_assignments ?? []).map((assignment) => String(assignment.professor.id)),
    )

    return readiness?.issues.filter((issue) => {
      if (issue.layer === 'lifecycle') return false
      if (issue.entity_type === 'academic_term') return true
      if (issue.entity_type === 'subject_offering') return issue.entity_id === offeringId
      if (issue.entity_type === 'professor') {
        return issue.entity_id !== null && professorIds.has(issue.entity_id)
      }

      return false
    }) ?? []
  }

  function assignmentStatusFor(offering: SubjectOffering): StatusMeta {
    if (offering.status === 'cancelled') {
      return { label: 'Cancelled', tone: 'neutral' }
    }

    const assignmentCount = offering.active_faculty_assignments_count
      ?? offering.faculty_assignments?.length
      ?? 0
    const facultyIssue = offeringIssues(offering)
      .find((issue) => (
        issue.entity_type !== 'academic_term'
        && issue.severity === 'blocking'
        && issue.category === 'faculty'
      ))

    if (assignmentCount === 0) {
      return { label: 'Not assigned', tone: 'warning' }
    }

    if (assignmentCount > 1) {
      return { label: 'Multiple professors', tone: 'danger' }
    }

    if (facultyIssue) {
      return { label: 'Assignment issue', tone: 'danger', title: facultyIssue.message }
    }

    return { label: 'Assigned', tone: 'success' }
  }

  function readinessStatusFor(offering: SubjectOffering): StatusMeta {
    if (offering.status === 'cancelled') {
      return { label: 'Cancelled', tone: 'neutral' }
    }

    if ((offering.published_schedules_count ?? 0) > 0) {
      return { label: 'Scheduled', tone: 'success', title: 'Already scheduled.' }
    }

    if (offering.status === 'closed') {
      return { label: 'Closed', tone: 'neutral' }
    }

    if (offering.status === 'draft') {
      return { label: 'Prepared', tone: 'neutral', title: 'Prepared. Assign a professor to make it schedulable.' }
    }

    if (isReadinessLoading) {
      return { label: 'Checking', tone: 'neutral' }
    }

    if (readinessError) {
      return { label: 'Unavailable', tone: 'neutral', title: readinessError }
    }

    if (!readiness) {
      return { label: 'Not checked', tone: 'neutral' }
    }

    const assignmentCount = offering.active_faculty_assignments_count
      ?? offering.faculty_assignments?.length
      ?? 0

    if (assignmentCount === 0) {
      return { label: 'Not ready', tone: 'warning', title: 'Assign a professor before scheduling.' }
    }

    const blockingIssues = offeringIssues(offering)
      .filter((issue) => issue.severity === 'blocking')

    if (blockingIssues.length > 0) {
      return {
        label: 'Blocked',
        tone: 'danger',
        title: blockingIssues.map((issue) => issue.message).join(' '),
      }
    }

    return { label: 'Ready', tone: 'success', title: 'Ready for Intelligent Scheduling.' }
  }

  function professorLabel(offering: SubjectOffering): string | null {
    const assignments = offering.faculty_assignments ?? []
    if (assignments.length === 0) return null

    return assignments
      .map((assignment) => assignment.professor.user?.name ?? assignment.professor.employee_number)
      .join(', ')
  }

  function refreshDetails() {
    setIsDetailLoading(true)
    setDetailVersion((version) => version + 1)
  }

  function openDetails(offering: SubjectOffering) {
    setDetailsOffering(null)
    setDetailError(null)
    setIsDetailLoading(true)
    setSelectedOfferingId(offering.id)
  }

  function closeDetails() {
    setSelectedOfferingId(null)
    setDetailsOffering(null)
    setDetailError(null)
    setIsDetailLoading(false)
  }

  function clearFilters() {
    setSearchInput('')
    setSearch('')
    setAssignmentFilter('')
    setProgramFilter('')
    setYearLevelFilter('')
    setSectionFilter('')
    setSubjectFilter('')
    setPage(1)
  }

  function changeTerm(termId: string) {
    setTermFilter(termId)
    setProgramFilter('')
    setYearLevelFilter('')
    setSectionFilter('')
    setSubjectFilter('')
    setPage(1)
    setOfferings([])
    setSummary(null)
    setReadiness(null)
    setReadinessError(null)
    setIsLoading(true)
    setIsReadinessLoading(true)
    setPreparation(null)
    setPreparationError(null)
    setIsPreparationLoading(true)
    setProfessorOffering(null)
    setDialogOffering(undefined)
    setError(null)
    setSuccess(null)
    setWarning(null)
  }

  async function handlePrepareClasses() {
    if (!termFilter || !canPrepare) return

    setIsPreparing(true)
    setError(null)
    setSuccess(null)
    setWarning(null)
    setPreparationError(null)

    try {
      const result = await prepareSubjectOfferingClasses(Number(termFilter))
      setPreparation(result.preparation)
      setPage(1)
      setRefreshVersion((version) => version + 1)
      setReadinessVersion((version) => version + 1)

      const remainingIssues = result.preparation.summary.issues
      const issueSuffix = remainingIssues > 0
        ? ` ${remainingIssues} preparation note${remainingIssues === 1 ? '' : 's'} still need review.`
        : ''

      if (result.created_count > 0) {
        setSuccess(
          `${result.created_count} required class${result.created_count === 1 ? '' : 'es'} prepared from the curriculum.${issueSuffix}`,
        )
      } else if (result.preparation.summary.missing > 0) {
        setSuccess(
          `No new classes were created. ${result.preparation.summary.missing} required class${result.preparation.summary.missing === 1 ? '' : 'es'} still need configuration review.`,
        )
      } else {
        setSuccess(`All required classes were already prepared.${issueSuffix}`)
      }
    } catch (failure) {
      const fieldMessage = Object.values(getApiFieldErrors(failure)).flat()[0]
      setPreparationError(
        fieldMessage ?? getApiErrorMessage(failure, 'Unable to prepare the required class assignments.'),
      )
    } finally {
      setIsPreparing(false)
    }
  }

  async function handleAssignProfessor(professorId: number | null) {
    const offering = professorOffering
    if (!offering) return

    const activeAssignments = offering.faculty_assignments
      ?.filter((assignment) => assignment.status === 'active') ?? []
    const currentProfessorId = activeAssignments[0]?.professor.id ?? null
    const shouldSyncAssignments = professorId !== currentProfessorId || activeAssignments.length > 1

    if (!shouldSyncAssignments) {
      setProfessorOffering(null)
      return
    }

    try {
      let working = offering

      if (professorId !== null && working.status !== 'open') {
        working = await updateSubjectOfferingStatus(working.id, 'open')
      }

      if (activeAssignments.length > 0) {
        await Promise.all(
          activeAssignments.map((assignment) => updateFacultyAssignmentStatus(assignment.id, 'cancelled')),
        )
      }

      if (professorId !== null) {
        await createFacultyAssignment({
          professor_id: professorId,
          subject_offering_id: working.id,
          assignment_role: 'lead',
        })
      }

      const professorName = professorId !== null
        ? options.professors.find((professor) => professor.id === professorId)?.user?.name
        : null

      setProfessorOffering(null)
      setRefreshVersion((version) => version + 1)
      setReadinessVersion((version) => version + 1)
      if (selectedOfferingId !== null) refreshDetails()
      setWarning(null)
      setSuccess(
        professorId !== null
          ? `${professorName ?? 'Professor'} assigned to ${offering.subject.code} - ${offering.section.code}.`
          : `Professor assignment removed from ${offering.subject.code} - ${offering.section.code}.`,
      )
    } catch (failure) {
      setProfessorOffering(null)
      setRefreshVersion((version) => version + 1)
      setReadinessVersion((version) => version + 1)
      if (selectedOfferingId === offering.id) refreshDetails()
      setSuccess(null)
      setWarning(
        `Professor assignment could not be updated: ${getApiErrorMessage(failure, 'Unknown error.')}`,
      )
    }
  }

  async function handleSave(payload: SubjectOfferingInput | SubjectOfferingUpdateInput) {
    if (dialogOffering) {
      await updateSubjectOffering(dialogOffering.id, payload)

      setDialogOffering(undefined)
      setRefreshVersion((version) => version + 1)
      setReadinessVersion((version) => version + 1)
      setPreparationVersion((version) => version + 1)
      if (selectedOfferingId !== null) refreshDetails()
      setWarning(null)
      setSuccess('Class assignment changes saved.')
      return
    }

    await createSubjectOffering(payload as SubjectOfferingInput)

    setDialogOffering(undefined)
    setPage(1)
    setRefreshVersion((version) => version + 1)
    setReadinessVersion((version) => version + 1)
    setPreparationVersion((version) => version + 1)
    if (selectedOfferingId !== null) refreshDetails()
    setWarning(null)
    setSuccess('Class assignment created. Assign a professor when ready.')
  }

  function requestStatusChange(offering: SubjectOffering) {
    const status = nextStatus(offering)

    if (!status) return

    const action = statusActionLabel(offering)
    const description = status === 'open'
      ? offering.status === 'closed'
        ? `Reopen ${offering.subject.code} - ${offering.section.code}? Eligibility will be revalidated before the class becomes schedulable.`
        : `Open ${offering.subject.code} - ${offering.section.code}? Only open class assignments can receive schedules.`
      : `Close ${offering.subject.code} - ${offering.section.code}? Existing schedules, room allocations, professor assignments, and enrollments will be preserved.`

    setConfirmDialog({
      title: `${action} class assignment`,
      description,
      confirmLabel: `${action} class assignment`,
      cancelLabel: 'Cancel',
      destructive: status === 'closed',
      onConfirm: async () => {
        setConfirmDialog(null)
        setBusyOfferingId(offering.id)
        setError(null)
        setDetailError(null)
        setSuccess(null)
        setWarning(null)

        try {
          await updateSubjectOfferingStatus(offering.id, status)
          setSuccess(
            status === 'closed'
              ? 'Class assignment closed. Schedules, allocations, professor assignments, and enrollments were preserved.'
              : offering.status === 'closed'
                ? 'Class assignment reopened.'
                : 'Class assignment opened.',
          )
          setRefreshVersion((version) => version + 1)
          setReadinessVersion((version) => version + 1)
          if (selectedOfferingId === offering.id) refreshDetails()
        } catch (failure) {
          const fieldMessage = Object.values(getApiFieldErrors(failure)).flat()[0]
          const message = fieldMessage ?? getApiErrorMessage(failure, 'Unable to update class assignment status.')
          if (selectedOfferingId === offering.id) setDetailError(message)
          else setError(message)
        } finally {
          setBusyOfferingId(null)
        }
      },
    })
  }

  return (
    <>
      <PageHeader
        eyebrow="Academic structure"
        title="Class assignments"
        description="Prepare required classes from the curriculum, assign professors, and hand validated offerings to Intelligent Scheduling."
        actions={canManage ? (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-end">
            <div className="space-y-1">
              <label htmlFor="class-term" className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                Academic term
              </label>
              <select
                id="class-term"
                value={termFilter}
                disabled={isOptionsLoading || options.terms.length === 0}
                onChange={(event) => changeTerm(event.target.value)}
                className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink focus:border-maroon-500 focus:outline-none focus:ring-2 focus:ring-maroon-500/20 sm:w-56"
              >
                {options.terms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.academic_year} - {term.name}
                    {term.is_current ? ' (current)' : ''}
                    {term.status === 'archived' ? ' (archived)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <Button
              variant="outline"
              leftIcon={<Plus className="size-4" aria-hidden="true" />}
              disabled={!canCreate}
              onClick={() => {
                setProfessorOffering(null)
                setDialogOffering(null)
              }}
            >
              Add manually
            </Button>
          </div>
        ) : null}
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

      {warning ? (
        <div role="alert" className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
          <div className="flex items-start gap-2">
            <p className="flex-1">{warning}</p>
            <button type="button" className="text-xs font-semibold underline" onClick={() => setWarning(null)}>
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      {optionsError ? (
        <div role="alert" className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p>{optionsError}</p>
          <Button className="mt-3" size="sm" variant="outline" onClick={() => setOptionsVersion((version) => version + 1)}>
            Retry options
          </Button>
        </div>
      ) : null}

      <Card>
        <CardBody>
          <SubjectOfferingPreparationPanel
            plan={preparation}
            isLoading={isPreparationLoading}
            error={preparationError}
            isPreparing={isPreparing}
            canPrepare={canPrepare}
            onPrepare={() => void handlePrepareClasses()}
            onRetry={() => setPreparationVersion((version) => version + 1)}
          />

          <div className="mt-5 grid grid-cols-2 divide-line rounded-lg border border-line bg-surface-soft/60 lg:grid-cols-4 lg:divide-x">
            <div className="p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Required classes</p>
              <p className="mt-1 text-2xl font-semibold text-ink">{preparation?.summary.required ?? '—'}</p>
            </div>
            <div className="border-t border-line p-4 lg:border-t-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Prepared</p>
              <p className="mt-1 text-2xl font-semibold text-maroon-700">{preparation?.summary.existing ?? '—'}</p>
            </div>
            <div className="border-t border-line p-4 lg:border-t-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Assigned</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-700">{summary?.assigned ?? '—'}</p>
            </div>
            <div className="border-t border-line p-4 lg:border-t-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">To prepare</p>
              <p className="mt-1 text-2xl font-semibold text-amber-700">{preparation?.summary.missing ?? '—'}</p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <TextField
              label="Search class assignments"
              name="search"
              type="search"
              value={searchInput}
              placeholder="Subject, section, or professor"
              onChange={(event) => setSearchInput(event.target.value)}
              className="w-full md:max-w-md"
            />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={filtersOpen ? 'secondary' : 'outline'}
                leftIcon={<Filter className="size-4" aria-hidden="true" />}
                onClick={() => setFiltersOpen((current) => !current)}
              >
                Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
              </Button>
              {hasFilters ? (
                <Button type="button" size="sm" variant="ghost" onClick={clearFilters}>
                  Clear
                </Button>
              ) : null}
            </div>
          </div>

          {filtersOpen ? (
            <div className="mt-4 grid gap-3 rounded-lg border border-line bg-stone-50 p-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-1.5">
                <label htmlFor="class-program-filter" className="block text-sm font-medium text-ink">
                  Program
                </label>
                <select
                  id="class-program-filter"
                  value={programFilter}
                  onChange={(event) => {
                    setProgramFilter(event.target.value)
                    setYearLevelFilter('')
                    setSectionFilter('')
                    setPage(1)
                  }}
                  className={selectClass}
                >
                  <option value="">All programs</option>
                  {options.programs.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.code} - {program.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="class-year-filter" className="block text-sm font-medium text-ink">
                  Year level
                </label>
                <select
                  id="class-year-filter"
                  value={yearLevelFilter}
                  disabled={!termFilter}
                  onChange={(event) => {
                    setYearLevelFilter(event.target.value)
                    setSectionFilter('')
                    setPage(1)
                  }}
                  className={selectClass}
                >
                  <option value="">All year levels</option>
                  {programYearLevels.map((yearLevel) => (
                    <option key={yearLevel.id} value={yearLevel.id}>
                      {yearLevel.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="class-section-filter" className="block text-sm font-medium text-ink">
                  Section
                </label>
                <select
                  id="class-section-filter"
                  value={sectionFilter}
                  onChange={(event) => {
                    setSectionFilter(event.target.value)
                    setPage(1)
                  }}
                  className={selectClass}
                >
                  <option value="">All sections</option>
                  {filteredSectionOptions.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.code}
                      {section.program ? ` (${section.program.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="class-subject-filter" className="block text-sm font-medium text-ink">
                  Subject
                </label>
                <select
                  id="class-subject-filter"
                  value={subjectFilter}
                  onChange={(event) => {
                    setSubjectFilter(event.target.value)
                    setPage(1)
                  }}
                  className={selectClass}
                >
                  <option value="">All subjects</option>
                  {options.subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.code} - {subject.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="class-assignment-filter" className="block text-sm font-medium text-ink">
                  Assignment status
                </label>
                <select
                  id="class-assignment-filter"
                  value={assignmentFilter}
                  onChange={(event) => {
                    setAssignmentFilter(event.target.value as SubjectOfferingAssignmentFilter | '')
                    setPage(1)
                  }}
                  className={selectClass}
                >
                  <option value="">All assignments</option>
                  <option value="assigned">Assigned</option>
                  <option value="incomplete">Not assigned</option>
                </select>
              </div>
            </div>
          ) : null}

          {readinessError && !isReadinessLoading ? (
            <div className="mt-4 flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between">
              <p>Scheduling readiness is unavailable. Assignment status is still shown.</p>
              <Button size="sm" variant="outline" onClick={() => setReadinessVersion((version) => version + 1)}>
                Retry readiness
              </Button>
            </div>
          ) : null}

          {error ? (
            <div role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p>{error}</p>
              <Button className="mt-3" size="sm" variant="outline" onClick={() => setRefreshVersion((version) => version + 1)}>
                Retry
              </Button>
            </div>
          ) : isOptionsLoading ? (
            <div className="py-16 text-center text-sm text-ink-muted" role="status">
              Loading class assignments.
            </div>
          ) : !termFilter ? (
            <div className="py-16 text-center text-sm text-ink-muted" role="status">
              {options.terms.length === 0
                ? 'No academic terms are available.'
                : 'Select an academic term to view class assignments.'}
            </div>
          ) : isLoading ? (
            <div className="py-16 text-center text-sm text-ink-muted" role="status">
              Loading class assignments.
            </div>
          ) : offerings.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                icon={BookOpenCheck}
                title={hasFilters
                  ? 'No class assignments match'
                  : preparation && preparation.summary.missing > 0
                    ? 'Required classes are not prepared yet'
                    : 'No class assignments for this term'}
                description={hasFilters
                  ? 'Try adjusting the search or filters.'
                  : preparation && preparation.summary.missing > 0
                    ? 'Prepare classes from the curriculum, then assign professors to make them ready for scheduling.'
                    : 'Review the active sections and curriculum, or add an exceptional class manually.'}
                action={!hasFilters && preparation && preparation.summary.missing > 0 && canPrepare ? (
                  <Button isLoading={isPreparing} onClick={() => void handlePrepareClasses()}>
                    Prepare {preparation.summary.missing} class{preparation.summary.missing === 1 ? '' : 'es'}
                  </Button>
                ) : canCreate && !hasFilters ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setProfessorOffering(null)
                      setDialogOffering(null)
                    }}
                  >
                    Add class manually
                  </Button>
                ) : null}
              />
            </div>
          ) : (
            <>
              <div className="mt-5 overflow-x-auto rounded-lg border border-line">
                <table className="w-full min-w-[1120px] text-left text-sm">
                  <thead className="bg-stone-50 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    <tr>
                      <th className="px-4 py-3">Class</th>
                      <th className="px-4 py-3">Section</th>
                      <th className="px-4 py-3">Professor</th>
                      <th className="px-4 py-3">Assignment</th>
                      <th className="px-4 py-3">Scheduling readiness</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {offerings.map((offering) => {
                      const assignmentStatus = assignmentStatusFor(offering)
                      const readinessStatus = readinessStatusFor(offering)
                      const professor = professorLabel(offering)

                      return (
                        <tr key={offering.id} className="align-top">
                          <td className="px-4 py-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-ink">{offering.subject.code}</p>
                              <SubjectOfferingStatusBadge status={offering.status} />
                            </div>
                            <p className="mt-0.5 text-xs text-ink-muted">{offering.subject.title}</p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="font-medium text-ink">{offering.section.code}</p>
                            <p className="mt-0.5 text-xs text-ink-muted">
                              {[
                                offering.section.program?.code,
                                offering.section.year_level?.name,
                                offering.section.major?.code,
                              ].filter(Boolean).join(' · ') || '-'}
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <p
                              className={professor ? 'font-medium text-ink' : 'font-medium text-amber-700'}
                              title={professor ?? undefined}
                            >
                              {professor ?? 'Unassigned'}
                            </p>
                            <p className="mt-0.5 text-xs text-ink-muted">
                              {offering.active_faculty_assignments_count ?? offering.faculty_assignments?.length ?? 0} active
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <span title={assignmentStatus.title}>
                              <Badge tone={assignmentStatus.tone}>{assignmentStatus.label}</Badge>
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span title={readinessStatus.title}>
                              <Badge tone={readinessStatus.tone}>{readinessStatus.label}</Badge>
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex justify-end gap-2">
                              {canManage && canEditOffering(offering) ? (
                                <Button
                                  size="sm"
                                  variant={professor ? 'outline' : 'secondary'}
                                  onClick={() => {
                                    setDialogOffering(undefined)
                                    setProfessorOffering(offering)
                                  }}
                                >
                                  {professor ? 'Change professor' : 'Assign professor'}
                                </Button>
                              ) : null}
                              <Button size="sm" variant="outline" onClick={() => openDetails(offering)}>
                                View
                              </Button>
                              {canManage && canEditOffering(offering) ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setProfessorOffering(null)
                                    setDialogOffering(offering)
                                  }}
                                >
                                  Edit details
                                </Button>
                              ) : null}
                              {canManage && nextStatus(offering) ? (
                                <Button
                                  size="sm"
                                  variant={offering.status === 'open' ? 'outline' : 'secondary'}
                                  isLoading={busyOfferingId === offering.id}
                                  onClick={() => requestStatusChange(offering)}
                                >
                                  {statusActionLabel(offering)}
                                </Button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-ink-muted">
                  {pagination.total} class assignment{pagination.total === 1 ? '' : 's'} | Page {page} of {pagination.last_page}
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

      {dialogOffering !== undefined ? (
        <SubjectOfferingFormDialog
          key={dialogOffering?.id ?? 'new'}
          offering={dialogOffering}
          options={options}
          termId={dialogOffering?.academic_term_id ?? Number(termFilter)}
          onCancel={() => setDialogOffering(undefined)}
          onSubmit={handleSave}
        />
      ) : null}

      {professorOffering ? (
        <SubjectOfferingProfessorDialog
          key={professorOffering.id}
          offering={professorOffering}
          options={options}
          onCancel={() => setProfessorOffering(null)}
          onSubmit={handleAssignProfessor}
        />
      ) : null}

      {selectedOfferingId !== null ? (
        <SubjectOfferingDetailsDialog
          offering={detailsOffering}
          isLoading={isDetailLoading}
          error={detailError}
          onClose={closeDetails}
          onRetry={refreshDetails}
        />
      ) : null}

      {confirmDialog && (
        <ConfirmationDialog
          onClose={() => setConfirmDialog(null)}
          title={confirmDialog.title}
          description={confirmDialog.description}
          confirmLabel={confirmDialog.confirmLabel}
          cancelLabel={confirmDialog.cancelLabel}
          destructive={confirmDialog.destructive}
          isLoading={Boolean(busyOfferingId)}
          onConfirm={confirmDialog.onConfirm}
        />
      )}
    </>
  )
}
