import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import { Link, useBlocker } from 'react-router-dom'
import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { Card, CardBody, CardHeader } from '@/components/common/Card'
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { fetchProfessor } from '@/services/api/faculty'
import { CandidateRevisionPanel } from '@/components/scheduling/CandidateRevisionPanel'
import { CandidateTimetableGrid } from '@/components/scheduling/CandidateTimetableGrid'
import { SchedulingConfigurationStage } from '@/components/scheduling/SchedulingConfigurationStage'
import { durationBetween, formatDuration } from '@/components/scheduling/candidateRevisionModel'
import {
  fetchOfferingFacultyAssignments,
  fetchSchedulingCandidate,
  fetchSchedulingReadiness,
  fetchSchedules,
  solveScheduling,
} from '@/services/api/scheduling'
import type { AcademicTerm } from '@/types/academic'
import type {
  CandidateRevisionStatus,
  ScheduleConflictRecord,
  ScheduleRecord,
  SchedulingCandidateDetail,
  SchedulingOptions,
  SchedulingReadiness,
  SchedulingSolveResponse,
} from '@/types/scheduling'
import { getApiErrorMessage } from '@/utils/apiError'
import { cn } from '@/utils/cn'

type WorkspaceStage = 'readiness' | 'generation' | 'review' | 'revision'
type ReadinessState = 'ready' | 'warning' | 'blocked' | 'checking' | 'info'
type BadgeTone = 'neutral' | 'success' | 'warning' | 'info' | 'danger'

interface AssignmentReadiness {
  checkedSignature: string
  checkedOfferings: number
  missing: number
  multiple: number
  unavailable: number
  distinctProfessors: number
  profileFailures: number
  profilesChecked: number
  professorsWithTermWindows: number
  professorsWithoutTermWindows: number
  fullTimeProfessors: number
  partTimeProfessors: number
  professorProfiles: Array<{
    id: number
    name: string
    employmentType: string
    windows: Array<{ day: number; startTime: string; endTime: string; type: string }>
  }>
}

interface IntelligentScheduleWorkspaceProps {
  termId: number | null
  term: AcademicTerm | undefined
  options: SchedulingOptions | null
  optionsLoading: boolean
  loadError?: string | null
  conflicts: ScheduleConflictRecord[]
  onDirtyChange?: (dirty: boolean) => void
}

interface ReadinessCheck {
  title: string
  detail: string
  state: ReadinessState
  link?: { to: string; label: string }
  action?: 'check-assignments'
  actionLabel?: string
}

interface ReadinessCategory {
  id: string
  title: string
  summary: string
  checks: ReadinessCheck[]
  extra?: ReactNode
}

async function fetchTermSchedules(termId: number): Promise<ScheduleRecord[]> {
  const firstPage = await fetchSchedules({
    academic_term_id: termId,
    page: 1,
    per_page: 100,
  })

  if (firstPage.pagination.last_page <= 1) return firstPage.schedules

  const remainingPages = await Promise.all(
    Array.from({ length: firstPage.pagination.last_page - 1 }, (_, index) => (
      fetchSchedules({
        academic_term_id: termId,
        page: index + 2,
        per_page: firstPage.pagination.per_page,
      })
    )),
  )

  return [firstPage, ...remainingPages].flatMap((page) => page.schedules)
}

function termName(term: AcademicTerm | undefined): string {
  return term ? `${term.academic_year} · ${term.name}` : 'No academic term selected'
}

function assignmentSummary(
  offerings: SchedulingOptions['offerings'],
  records: Map<number, { state: 'assigned' | 'missing' | 'multiple' | 'unavailable'; professorIds: number[] }>,
) {
  return offerings.reduce(
    (summary, offering) => {
      const result = records.get(offering.id)
      if (!result || result.state === 'unavailable') summary.unavailable += 1
      else if (result.state === 'missing') summary.missing += 1
      else if (result.state === 'multiple') summary.multiple += 1
      return summary
    },
    { missing: 0, multiple: 0, unavailable: 0 },
  )
}

function formatScheduleDay(day: number): string {
  return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][day - 1] ?? 'Unknown day'
}

function stateTone(state: ReadinessState): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  if (state === 'ready') return 'success'
  if (state === 'warning') return 'warning'
  if (state === 'blocked') return 'danger'
  if (state === 'checking') return 'info'
  return 'neutral'
}

function stateLabel(state: ReadinessState): string {
  if (state === 'ready') return 'Ready'
  if (state === 'warning') return 'Needs attention'
  if (state === 'blocked') return 'Blocked'
  if (state === 'checking') return 'Checking'
  return 'Info'
}

function categoryState(checks: ReadinessCheck[]): ReadinessState {
  if (checks.some((check) => check.state === 'checking')) return 'checking'
  if (checks.some((check) => check.state === 'blocked')) return 'blocked'
  if (checks.some((check) => check.state === 'warning')) return 'warning'
  if (checks.every((check) => check.state === 'ready' || check.state === 'info')) return 'ready'
  return 'info'
}

function solveFailureMessage(error: unknown): string {
  const response = (error as { response?: { status?: number; data?: { code?: string; message?: string } } }).response
  const code = response?.data?.code
  const message = getApiErrorMessage(error, 'Unable to generate a scheduling candidate.')

  if (code === 'scheduling_generation_conflict') {
    return `Another scheduling generation is already running for this term. ${message}`
  }
  if (['stale_source_context', 'generation_lease_expired', 'generation_lease_owner_mismatch', 'solver_response_identity_mismatch'].includes(code ?? '')) {
    return `Generation inputs changed or the generation lease expired. Review readiness, refresh inputs, and try again. ${message}`
  }
  if (response?.status === 503 || response?.status === 502 || code === 'scheduling_service_unavailable') {
    return `The scheduling service could not complete the request. ${message}`
  }

  return message
}

function generationOutcomeMessage(run: SchedulingSolveResponse | null): string | null {
  if (!run || run.candidate) return null

  const detail = run.generation.failure_message
  const code = run.generation.failure_code
  const suffix = [code, detail].filter(Boolean).join(' · ')

  if (run.generation.result_status === 'INFEASIBLE') {
    return `The solver reported infeasibility and no candidate was persisted.${suffix ? ` ${suffix}` : ''}`
  }
  if (run.generation.result_status === 'TIME_LIMIT') {
    return `The solver stopped at its time limit without a complete candidate.${suffix ? ` ${suffix}` : ''}`
  }
  if (run.generation.result_status === 'UNKNOWN' || run.result.result_status === 'UNKNOWN') {
    return `The solver could not establish a result and no candidate was persisted.${suffix ? ` ${suffix}` : ''}`
  }

  return `Generation completed without a persisted candidate.${suffix ? ` ${suffix}` : ''}`
}

function activeCandidateRevision(candidate: SchedulingCandidateDetail | null): CandidateRevisionStatus | null {
  const statuses = candidate?.revisions
    .filter((revision) => ['draft', 'under_review', 'validated', 'needs_revision'].includes(revision.status))
    .sort((left, right) => right.revision_number - left.revision_number) ?? []
  return statuses[0]?.status ?? null
}

export function IntelligentScheduleWorkspace({
  termId,
  term,
  options,
  optionsLoading,
  loadError,
  conflicts,
  onDirtyChange,
}: IntelligentScheduleWorkspaceProps) {
  const [stage, setStage] = useState<WorkspaceStage>('readiness')
  const [inventory, setInventory] = useState<ScheduleRecord[] | null>(null)
  const [inventoryLoading, setInventoryLoading] = useState(true)
  const [inventoryError, setInventoryError] = useState<string | null>(null)
  const [inventoryVersion, setInventoryVersion] = useState(0)
  const [readiness, setReadiness] = useState<SchedulingReadiness | null>(null)
  const [readinessLoading, setReadinessLoading] = useState(true)
  const [readinessError, setReadinessError] = useState<string | null>(null)
  const [readinessVersion, setReadinessVersion] = useState(0)
  const [assignmentReadiness, setAssignmentReadiness] = useState<AssignmentReadiness | null>(null)
  const [assignmentLoading, setAssignmentLoading] = useState(false)
  const [checkedOfferingCount, setCheckedOfferingCount] = useState(0)
  const [assignmentError, setAssignmentError] = useState<string | null>(null)
  const [replacementDraftIds, setReplacementDraftIds] = useState<number[]>([])
  const [keepDay, setKeepDay] = useState(true)
  const [keepStartTime, setKeepStartTime] = useState(true)
  const [keepRoom, setKeepRoom] = useState(true)
  const [solving, setSolving] = useState(false)
  const [solveError, setSolveError] = useState<string | null>(null)
  const [latestRun, setLatestRun] = useState<SchedulingSolveResponse | null>(null)
  const [candidateDetail, setCandidateDetail] = useState<SchedulingCandidateDetail | null>(null)
  const [candidateLoading, setCandidateLoading] = useState(false)
  const [candidateError, setCandidateError] = useState<string | null>(null)
  const [generationNotice, setGenerationNotice] = useState<string | null>(null)
  const [showConfiguration, setShowConfiguration] = useState(false)
  const [hasUnsavedEdits, setHasUnsavedEdits] = useState(false)
  const [resetTermId, setResetTermId] = useState(termId)
  if (resetTermId !== termId) {
    setResetTermId(termId)
    setLatestRun(null)
    setCandidateDetail(null)
    setCandidateError(null)
    setGenerationNotice(null)
    setSolveError(null)
    setInventory(null)
    setReadiness(null)
    setStage('readiness')
    setShowConfiguration(false)
    setHasUnsavedEdits(false)
  }
  if (!termId && (inventoryLoading || readinessLoading || inventoryError || readinessError)) {
    setInventory(null)
    setInventoryLoading(false)
    setInventoryError(null)
    setReadiness(null)
    setReadinessLoading(false)
    setReadinessError(null)
  }

  const routeBlocker = useBlocker(({ currentLocation, nextLocation }) => (
    hasUnsavedEdits && currentLocation.pathname !== nextLocation.pathname
  ))

  useEffect(() => {
    if (!hasUnsavedEdits) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [hasUnsavedEdits])

  useEffect(() => {
    onDirtyChange?.(false)
  }, [termId, onDirtyChange])

  const loadCandidate = useCallback(async (candidateUuid: string) => {
    setCandidateLoading(true)
    setCandidateError(null)
    try {
      const detail = await fetchSchedulingCandidate(candidateUuid)
      setCandidateDetail(detail)
      return detail
    } catch (failure) {
      setCandidateDetail(null)
      setCandidateError(getApiErrorMessage(failure, 'Unable to load the persisted scheduling candidate.'))
      return null
    } finally {
      setCandidateLoading(false)
    }
  }, [])

  const handleDirtyChange = useCallback((dirty: boolean) => {
    setHasUnsavedEdits(dirty)
    onDirtyChange?.(dirty)
  }, [onDirtyChange])

  const offeringSignature = options?.offerings
    .map((offering) => offering.id)
    .sort((left, right) => left - right)
    .join(',') ?? ''
  const hasCurrentAssignmentCheck = Boolean(
    assignmentReadiness && assignmentReadiness.checkedSignature === offeringSignature,
  )

  useEffect(() => {
    if (!termId) return
    let active = true

    void Promise.resolve().then(async () => {
      setInventoryLoading(true)
      setInventoryError(null)
      try {
        const records = await fetchTermSchedules(termId)
        if (active) setInventory(records)
      } catch (failure) {
        if (active) {
          setInventory(null)
          setInventoryError(getApiErrorMessage(failure, 'Unable to load the selected term’s complete schedule inventory.'))
        }
      } finally {
        if (active) setInventoryLoading(false)
      }
    })

    return () => { active = false }
  }, [inventoryVersion, termId])

  useEffect(() => {
    if (!termId) return
    let active = true

    void Promise.resolve().then(async () => {
      setReadinessLoading(true)
      setReadinessError(null)
      try {
        const result = await fetchSchedulingReadiness(termId)
        if (active) setReadiness(result)
      } catch (failure) {
        if (active) {
          setReadiness(null)
          setReadinessError(getApiErrorMessage(failure, 'Unable to validate class assignments against the active curriculum.'))
        }
      } finally {
        if (active) setReadinessLoading(false)
      }
    })

    return () => { active = false }
  }, [readinessVersion, termId])

  const checkAssignments = useCallback(async () => {
    if (!options?.offerings.length) return

    setAssignmentLoading(true)
    setAssignmentError(null)
    setCheckedOfferingCount(0)
    setAssignmentReadiness(null)

    const records = new Map<number, {
      state: 'assigned' | 'missing' | 'multiple' | 'unavailable'
      professorIds: number[]
    }>()
    const batchSize = 8
    let completed = 0

    for (let offset = 0; offset < options.offerings.length; offset += batchSize) {
      const batch = options.offerings.slice(offset, offset + batchSize)
      const results = await Promise.allSettled(
        batch.map((offering) => fetchOfferingFacultyAssignments(offering.id)),
      )

      results.forEach((result, index) => {
        const offering = batch[index]
        if (result.status === 'rejected') {
          records.set(offering.id, { state: 'unavailable', professorIds: [] })
          return
        }
        const activeAssignments = result.value.filter((assignment) => assignment.status === 'active')
        const distinctProfessorIds = [...new Set(activeAssignments.map((assignment) => assignment.professor_id))]
        records.set(offering.id, {
          state: distinctProfessorIds.length === 0
            ? 'missing'
            : distinctProfessorIds.length > 1
              ? 'multiple'
              : 'assigned',
          professorIds: distinctProfessorIds,
        })
      })

      completed += batch.length
      setCheckedOfferingCount(completed)
    }

    const summary = assignmentSummary(options.offerings, records)
    const professorIds = [...new Set([...records.values()].flatMap((item) => item.professorIds))]
    let profilesChecked = 0
    let profileFailures = 0
    let professorsWithTermWindows = 0
    let professorsWithoutTermWindows = 0
    let fullTimeProfessors = 0
    let partTimeProfessors = 0
    const professorProfiles: AssignmentReadiness['professorProfiles'] = []

    for (let offset = 0; offset < professorIds.length; offset += batchSize) {
      const batch = professorIds.slice(offset, offset + batchSize)
      const results = await Promise.allSettled(batch.map((id) => fetchProfessor(id)))
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          profileFailures += 1
          return
        }
        const professor = result.value
        profilesChecked += 1
        const termWindows = professor.availability.filter((window) => window.academic_term_id === termId)
        if (termWindows.length) {
          professorsWithTermWindows += 1
        } else {
          professorsWithoutTermWindows += 1
        }
        if (professor.employment_type === 'full_time') fullTimeProfessors += 1
        if (professor.employment_type === 'part_time') partTimeProfessors += 1
        professorProfiles.push({
          id: batch[index],
          name: professor.name,
          employmentType: professor.employment_type,
          windows: termWindows.map((window) => ({
            day: window.day_of_week,
            startTime: window.start_time,
            endTime: window.end_time,
            type: window.availability_type,
          })).sort((left, right) => left.day - right.day || left.startTime.localeCompare(right.startTime)),
        })
      })
    }

    setAssignmentReadiness({
      checkedSignature: offeringSignature,
      checkedOfferings: options.offerings.length,
      ...summary,
      distinctProfessors: professorIds.length,
      profileFailures,
      profilesChecked,
      professorsWithTermWindows,
      professorsWithoutTermWindows,
      fullTimeProfessors,
      partTimeProfessors,
      professorProfiles,
    })
    if (summary.unavailable || profileFailures) {
      setAssignmentError(
        `${summary.unavailable} class assignment record${summary.unavailable === 1 ? '' : 's'} and ${profileFailures} professor profile${profileFailures === 1 ? '' : 's'} could not be checked. These inputs remain unverified.`,
      )
    }
    setAssignmentLoading(false)
  }, [offeringSignature, options, termId])

  const publishedSchedules = inventory?.filter((schedule) => schedule.status === 'published') ?? []
  const draftSchedules = inventory?.filter((schedule) => schedule.status === 'draft') ?? []
  const selectedReplacementDraftCount = replacementDraftIds.filter((id) => draftSchedules.some((draft) => draft.id === id)).length
  const activeConflicts = conflicts.filter((conflict) => conflict.status === 'open')
  const configuredOfferings = options?.offerings ?? []
  const programCount = new Set(configuredOfferings.map((offering) => offering.section.program.id)).size
  const yearLevelCount = new Set(configuredOfferings.map((offering) => offering.section.year_level.id)).size
  const sectionCount = new Set(configuredOfferings.map((offering) => offering.section.id)).size
  const availableRooms = options?.rooms.filter((room) => room.status === 'available') ?? []
  const invalidRooms = availableRooms.filter((room) => (
    !Number.isFinite(room.capacity) || room.capacity <= 0 || !room.room_type.trim()
  ))

  const assignmentProblemCount = assignmentReadiness
    ? assignmentReadiness.missing + assignmentReadiness.multiple + assignmentReadiness.unavailable
    : 0
  const assignmentCheckState: ReadinessState = assignmentLoading
    ? 'checking'
    : !hasCurrentAssignmentCheck
      ? 'blocked'
      : assignmentProblemCount
        ? 'blocked'
        : 'ready'
  const assignmentDetail = assignmentLoading
    ? `Checking active assignment records: ${checkedOfferingCount} of ${configuredOfferings.length} open class assignments.`
    : assignmentReadiness === null
      ? 'Professor assignments have not been checked for the configured class assignments. The AI never selects or redistributes professors.'
      : !hasCurrentAssignmentCheck
        ? `Assignment results for ${assignmentReadiness.checkedOfferings} class assignments are outdated. Recheck assignments for the current term.`
        : `${assignmentReadiness.missing} unassigned · ${assignmentReadiness.multiple} with multiple distinct professors · ${assignmentReadiness.unavailable} that could not be verified. Exactly one distinct professor is required per ordinary class assignment.`

  const readinessIssues = readiness?.issues ?? []
  const schedulerServiceStatus = readiness?.scheduler_service
  const schedulerState = readiness?.scheduler_status
  const integrationChecks: ReadinessCheck[] = [
    {
      title: 'Scheduling engine liveness',
      detail: readinessLoading
        ? 'Checking the scheduling engine process…'
        : schedulerServiceStatus?.live.ok
          ? 'The deployed scheduling engine is reachable.'
          : schedulerState?.diagnostic ?? 'The deployed scheduling engine did not pass its liveness check.',
      state: readinessLoading
        ? 'checking'
        : schedulerServiceStatus?.live.ok
          ? 'ready'
          : 'blocked',
    },
    {
      title: 'Scheduling engine readiness',
      detail: readinessLoading
        ? 'Checking authenticated solver readiness…'
        : schedulerServiceStatus?.ready.ok
          ? 'The OR-Tools solver is ready to accept contract requests.'
          : schedulerState?.diagnostic ?? 'The solver is not ready or the shared service credentials were rejected.',
      state: readinessLoading
        ? 'checking'
        : schedulerServiceStatus?.ready.ok
          ? 'ready'
          : 'blocked',
    },
  ]
  const readinessIssue = (code: string) => readinessIssues.find((issue) => issue.code === code)
  const timeGridIssue = readinessIssue('time_grid_not_configured')
  const meetingPlanIssue = readinessIssue('meeting_plans_not_configured')
  const fullTimePolicyIssue = readinessIssue('full_time_workday_policy_not_configured')
  const partTimeTargetIssue = readinessIssue('part_time_targets_not_configured')
  const roomConfigurationIssue = readinessIssue('room_configuration_invalid')
  const usableRoomsIssue = readinessIssue('usable_rooms_missing') ?? readinessIssue('available_rooms_missing')
  const combinedClassesIssue = readinessIssue('combined_classes_not_configured')
  const publishedBaselineIssue = readinessIssue('published_baseline_unlinked')
  const meetingBlockingCount = (readiness?.layers.generation_data.issues ?? [])
    .filter((issue) => issue.category === 'meetings' && issue.severity === 'blocking')
    .length

  const curriculumIssues = readinessIssues.filter((issue) => (
    issue.code === 'offering_subject_not_in_curriculum' || issue.code.startsWith('curriculum_')
  ))
  const curriculumBlockingCount = curriculumIssues.filter((issue) => issue.severity === 'blocking').length
  const curriculumWarningCount = curriculumIssues.filter((issue) => issue.severity === 'warning').length
  const missingOfferingScopes = curriculumIssues.filter((issue) => issue.code === 'curriculum_offering_missing').length
  const missingMappingScopes = curriculumIssues.filter((issue) => issue.code === 'curriculum_mapping_missing').length
  const unrecognizedSemester = curriculumIssues.some((issue) => issue.code === 'curriculum_semester_unrecognized')
  const curriculumCheckState: ReadinessState = readinessLoading
    ? 'checking'
    : readinessError || !readiness
      ? 'blocked'
      : configuredOfferings.length === 0
        ? 'blocked'
        : curriculumBlockingCount
          ? 'blocked'
          : curriculumWarningCount
            ? 'warning'
            : 'ready'
  const curriculumDetail = readinessLoading
    ? 'Validating open class assignments against the active curriculum…'
    : readinessError
      ? readinessError
      : !readiness
        ? 'Curriculum validation is unavailable, so the class assignment set cannot be confirmed.'
        : configuredOfferings.length === 0
          ? 'No open class assignments are available to validate against the curriculum.'
          : curriculumBlockingCount
            ? `${curriculumBlockingCount} curriculum validation issue${curriculumBlockingCount === 1 ? '' : 's'} found. Open class assignments must match an active mapping for the section program, year level, semester, and major.`
            : curriculumWarningCount
              ? [
                  missingMappingScopes
                    ? `${missingMappingScopes} program/year/semester scope${missingMappingScopes === 1 ? '' : 's'} have no active curriculum mapping.`
                    : null,
                  missingOfferingScopes
                    ? `${missingOfferingScopes} section scope${missingOfferingScopes === 1 ? '' : 's'} have mapped subjects without an open class assignment.`
                    : null,
                  unrecognizedSemester
                    ? 'The term semester is not recognized, so curriculum mappings cannot be matched.'
                    : null,
                ].filter(Boolean).join(' ')
              : `${configuredOfferings.length} open class assignments match active curriculum mappings. Only this validated set may be consumed by generation.`

  const academicChecks: ReadinessCheck[] = [
    {
      title: 'Academic term',
      state: term ? 'ready' : 'blocked',
      detail: term ? `${termName(term)} · ${term.status}` : 'Select an active or planned academic term.',
      link: { to: '/academic/terms', label: 'Open academic terms' },
    },
    {
      title: 'Programs, year levels, and sections',
      state: optionsLoading ? 'checking' : loadError ? 'blocked' : configuredOfferings.length ? 'ready' : 'blocked',
      detail: optionsLoading
        ? 'Loading the configured academic structure…'
        : loadError
          ? loadError
          : configuredOfferings.length
            ? `${programCount} programs · ${yearLevelCount} year levels · ${sectionCount} sections are represented in the returned class assignments.`
            : 'No configured class assignments were returned for this term.',
      link: { to: '/academic/sections', label: 'Review sections' },
    },
    {
      title: 'Required class assignments',
      state: optionsLoading || readinessLoading
        ? 'checking'
        : loadError || readinessError
          ? 'blocked'
          : configuredOfferings.length
            ? missingMappingScopes || missingOfferingScopes
              ? 'warning'
              : 'ready'
            : 'blocked',
      detail: optionsLoading || readinessLoading
        ? 'Loading open class assignments and curriculum coverage…'
        : loadError || readinessError
          ? (loadError || readinessError || 'Curriculum coverage could not be confirmed.')
          : configuredOfferings.length
            ? missingMappingScopes
              ? `${configuredOfferings.length} open class assignments are available, but ${missingMappingScopes} program/year/semester scope${missingMappingScopes === 1 ? '' : 's'} have no active curriculum mapping, so required coverage cannot be confirmed.`
              : missingOfferingScopes
                ? `${configuredOfferings.length} open class assignments are available, but ${missingOfferingScopes} section scope${missingOfferingScopes === 1 ? '' : 's'} have mapped subjects without an open class assignment.`
                : `${configuredOfferings.length} open class assignments cover every subject mapped to the active curriculum scopes for this term.`
            : 'No open class assignments are available. Create or open class assignments before scheduling.',
      link: { to: '/academic/subject-offerings', label: 'Review class assignments' },
    },
    {
      title: 'Validated class assignment set',
      state: curriculumCheckState,
      detail: curriculumDetail,
      link: { to: '/academic/curriculum', label: 'Review curriculum mappings' },
    },
  ]

  const meetingChecks: ReadinessCheck[] = [
    {
      title: 'Approved term time grid',
      state: readinessLoading ? 'checking' : readinessError ? 'blocked' : timeGridIssue ? 'blocked' : 'ready',
      detail: readinessLoading
        ? 'Checking the approved term time grid…'
        : readinessError
          ? readinessError
          : timeGridIssue?.message ?? 'An approved term time grid is available for applicable days, operating hours, timezone, and valid start times.',
    },
    {
      title: 'Lecture and laboratory meeting plans',
      state: readinessLoading ? 'checking' : readinessError ? 'blocked' : meetingPlanIssue ? 'blocked' : 'ready',
      detail: readinessLoading
        ? 'Checking approved class assignment meeting plans…'
        : readinessError
          ? readinessError
          : meetingPlanIssue?.message ?? 'Approved meeting plans are available for frequency, duration, modality, room type, and mandatory occurrences.',
      link: { to: '/academic/subject-offerings', label: 'Review class assignments' },
    },
  ]

  const facultyChecks: ReadinessCheck[] = [
    {
      title: 'One distinct professor per class assignment',
      state: assignmentCheckState,
      detail: assignmentDetail,
      link: { to: '/academic/subject-offerings', label: 'Review faculty assignments' },
      action: 'check-assignments',
      actionLabel: hasCurrentAssignmentCheck ? 'Recheck assignments' : 'Check assignments',
    },
    {
      title: 'Employment type and recurring availability',
      state: !hasCurrentAssignmentCheck
        ? 'info'
        : (assignmentReadiness?.profileFailures ?? 0) > 0
          ? 'blocked'
          : 'info',
      detail: hasCurrentAssignmentCheck && assignmentReadiness
        ? `${assignmentReadiness.profilesChecked} profiles checked · ${assignmentReadiness.fullTimeProfessors} full-time · ${assignmentReadiness.partTimeProfessors} part-time · ${assignmentReadiness.professorsWithTermWindows} with term availability · ${assignmentReadiness.professorsWithoutTermWindows} with none (unrestricted). Date-specific exceptions are not available yet.`
        : 'Run the assignment check to inspect professor employment types and recurring term availability.',
      link: { to: '/faculty', label: 'Review faculty records' },
    },
    {
      title: 'Full-time workday policy and exceptions',
      state: readinessLoading ? 'checking' : fullTimePolicyIssue ? 'blocked' : 'ready',
      detail: readinessLoading
        ? 'Checking the full-time workday policy…'
        : fullTimePolicyIssue?.message ?? 'The term-scoped full-time workday policy and authorized exceptions are available.',
    },
    {
      title: 'Part-time workload targets',
      state: readinessLoading ? 'checking' : partTimeTargetIssue ? 'blocked' : 'info',
      detail: readinessLoading
        ? 'Checking part-time workload targets…'
        : partTimeTargetIssue?.message ?? 'Weekly targets use actual teaching hours and remain soft objectives. A target deviation is never a hard scheduling failure.',
      link: { to: '/faculty', label: 'Review faculty records' },
    },
  ]

  const facilityChecks: ReadinessCheck[] = [
    {
      title: 'Room configuration and capacity',
      state: optionsLoading || readinessLoading
        ? 'checking'
        : usableRoomsIssue
          ? 'blocked'
          : roomConfigurationIssue
            ? 'warning'
            : availableRooms.length === 0
              ? 'blocked'
              : 'ready',
      detail: optionsLoading || readinessLoading
        ? 'Loading room inventory and readiness checks…'
        : usableRoomsIssue?.message
          ?? roomConfigurationIssue?.message
          ?? (availableRooms.length === 0
            ? 'No rooms are marked available for this term.'
            : `${availableRooms.length} available rooms${invalidRooms.length ? ` · ${invalidRooms.length} with invalid capacity or room type` : ''}.`),
      link: { to: '/rooms', label: 'Review room inventory' },
    },
    {
      title: 'Explicit combined-class groups',
      state: readinessLoading ? 'checking' : combinedClassesIssue ? 'info' : 'ready',
      detail: combinedClassesIssue?.message ?? 'Explicit combined-class groups are available.',
    },
  ]

  const timetableChecks: ReadinessCheck[] = [
    {
      title: 'Published baseline',
      state: inventoryLoading || readinessLoading
        ? 'checking'
        : inventoryError || !inventory
          ? 'blocked'
          : publishedBaselineIssue
            ? 'warning'
            : 'ready',
      detail: inventoryLoading || readinessLoading
        ? 'Loading the complete schedule inventory and baseline checks…'
        : inventoryError
          ? inventoryError
          : publishedBaselineIssue?.message
            ?? `${publishedSchedules.length} published schedule record${publishedSchedules.length === 1 ? '' : 's'} remain active${publishedSchedules.length ? ' as the comparison baseline' : ''}.`,
    },
    {
      title: 'Existing drafts',
      state: inventoryLoading ? 'checking' : inventoryError || !inventory ? 'blocked' : 'info',
      detail: inventoryLoading
        ? 'Loading draft schedules…'
        : inventoryError
          ? 'Draft inventory could not be loaded.'
          : `${draftSchedules.length} draft schedule record${draftSchedules.length === 1 ? '' : 's'} are preserved. No draft is selected for replacement by default.`,
    },
    {
      title: 'Open schedule conflicts',
      state: activeConflicts.length ? 'warning' : 'ready',
      detail: activeConflicts.length
        ? `${activeConflicts.length} open conflict${activeConflicts.length === 1 ? '' : 's'} exist in the current manual timetable. They do not describe a new candidate.`
        : 'No open conflicts are recorded for the current timetable.',
    },
  ]

  const availabilityExtra = hasCurrentAssignmentCheck && assignmentReadiness?.professorProfiles.length ? (
    <details className="mt-1 rounded-lg border border-line bg-white">
      <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon-600">
        View recurring availability ({assignmentReadiness.professorProfiles.length} professors)
      </summary>
      <div className="space-y-2 border-t border-line px-3 py-2">
        {assignmentReadiness.professorProfiles.map((professor) => (
          <div key={professor.id} className="border-b border-line pb-2 last:border-b-0 last:pb-0">
            <p className="text-xs font-semibold text-ink">{professor.name} · {professor.employmentType.replaceAll('_', ' ')}</p>
            {professor.windows.length ? (
              <ul className="mt-1 grid gap-1 text-[11px] text-ink-muted sm:grid-cols-2">
                {professor.windows.map((window, index) => (
                  <li key={`${professor.id}-${window.day}-${window.startTime}-${index}`}>
                    {formatScheduleDay(window.day)} · {window.startTime}–{window.endTime} · {window.type}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-[11px] text-ink-muted">No term availability is defined, so the professor is treated as unrestricted.</p>
            )}
          </div>
        ))}
      </div>
    </details>
  ) : undefined

  const categories: ReadinessCategory[] = [
    {
      id: 'integration',
      title: 'Scheduling service',
      summary: readinessLoading
        ? 'Checking deployed scheduling engine health…'
        : schedulerServiceStatus?.live.ok && schedulerServiceStatus.ready.ok
          ? 'Deployed engine is live and ready.'
          : 'The scheduling engine cannot accept generation requests.',
      checks: integrationChecks,
    },
    {
      id: 'academic',
      title: 'Academic configuration',
      summary: optionsLoading
        ? 'Loading programs, sections, and class assignments…'
        : loadError
          ? 'Scheduling options could not be loaded.'
          : `${programCount} programs · ${yearLevelCount} year levels · ${sectionCount} sections`,
      checks: academicChecks,
    },
    {
      id: 'meetings',
      title: 'Meeting requirements',
      summary: readinessLoading
        ? 'Checking time grid and meeting-plan readiness…'
        : meetingBlockingCount
          ? `${meetingBlockingCount} meeting configuration issue${meetingBlockingCount === 1 ? '' : 's'} must be resolved.`
          : 'Time grid and approved meeting plans are available.',
      checks: meetingChecks,
    },
    {
      id: 'faculty',
      title: 'Faculty',
      summary: !hasCurrentAssignmentCheck
        ? 'Professor assignments have not been checked.'
        : assignmentProblemCount
          ? `${assignmentProblemCount} of ${assignmentReadiness?.checkedOfferings ?? configuredOfferings.length} class assignments need attention.`
          : `${assignmentReadiness?.distinctProfessors ?? 0} professors assigned without assignment issues.`,
      checks: facultyChecks,
      extra: availabilityExtra,
    },
    {
      id: 'facilities',
      title: 'Facilities',
      summary: optionsLoading
        ? 'Loading room inventory…'
        : `${availableRooms.length} available rooms${invalidRooms.length ? ` · ${invalidRooms.length} invalid` : ''}`,
      checks: facilityChecks,
    },
    {
      id: 'timetable',
      title: 'Existing timetable',
      summary: inventoryLoading
        ? 'Loading published and draft schedules…'
        : inventoryError
          ? 'Schedule inventory could not be loaded.'
          : `${publishedSchedules.length} published · ${draftSchedules.length} drafts${activeConflicts.length ? ` · ${activeConflicts.length} open conflicts` : ''}`,
      checks: timetableChecks,
    },
  ]

  const allChecks = categories.flatMap((category) => category.checks)
  const blockingCount = allChecks.filter((check) => check.state === 'blocked').length
  const warningCount = allChecks.filter((check) => check.state === 'warning').length
  const readinessState: ReadinessState = optionsLoading || inventoryLoading || assignmentLoading || readinessLoading
    ? 'checking'
    : blockingCount
      ? 'blocked'
      : warningCount
        ? 'warning'
        : 'ready'

  const generationAvailable = readiness?.generation_available ?? false
  const generationReason = !term
    ? 'Select an active or planned academic term to continue.'
    : solving
      ? 'Requesting a complete-semester candidate from the scheduling service…'
      : optionsLoading || inventoryLoading || assignmentLoading || readinessLoading
        ? 'Waiting for scheduling inputs to finish loading.'
        : !readiness
          ? 'Scheduling readiness is unavailable, so generation cannot start.'
          : !readiness.integration_ready
            ? 'The scheduling service is not connected. Configure the scheduler URL and API key before generating.'
            : !readiness.generation_data_ready
              ? 'Scheduling inputs are incomplete. Resolve the blocking readiness issues before generating.'
              : blockingCount
                ? `${blockingCount} blocking requirement${blockingCount === 1 ? '' : 's'} must be resolved before generation.`
                : 'All readiness checks passed.'
  const generationReady = Boolean(term) && !solving && !blockingCount && generationAvailable

  const handleGenerate = useCallback(async () => {
    if (!termId || !generationReady) return

    setSolving(true)
    setSolveError(null)
    setGenerationNotice(null)

    try {
      const run = await solveScheduling({ academic_term_id: termId })
      setLatestRun(run)
      if (run.candidate?.uuid) {
        await loadCandidate(run.candidate.uuid)
        setStage('review')
      } else {
        setCandidateDetail(null)
        setGenerationNotice(generationOutcomeMessage(run))
        setStage('generation')
      }
    } catch (failure) {
      setSolveError(solveFailureMessage(failure))
    } finally {
      setSolving(false)
    }
  }, [generationReady, loadCandidate, termId])

  const requestStageChange = useCallback((next: WorkspaceStage) => {
    if (hasUnsavedEdits && next !== stage && !window.confirm('Leave this revision stage? Unsaved edits will be discarded.')) return
    setStage(next)
  }, [hasUnsavedEdits, stage])

  async function handleCheckAssignments() {
    try {
      await checkAssignments()
    } catch (failure) {
      setAssignmentError(getApiErrorMessage(failure, 'Unable to validate class assignments.'))
      setAssignmentLoading(false)
    }
  }

  function toggleReplacementDraft(id: number) {
    setReplacementDraftIds((current) => (
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    ))
  }

  const stageStatus: Record<WorkspaceStage, string> = {
    readiness: stateLabel(readinessState),
    generation: solving
      ? 'Running'
      : latestRun?.generation.result_status ?? latestRun?.generation.status ?? 'Not generated',
    review: latestRun?.candidate ? `${latestRun.candidate.assignment_count} placements` : 'No candidate',
    revision: activeCandidateRevision(candidateDetail)
      ? `Active ${activeCandidateRevision(candidateDetail)?.replaceAll('_', ' ')}`
      : 'No revision',
  }

  return (
    <div className="space-y-4">
      <WorkspaceSteps stage={stage} onChange={requestStageChange} status={stageStatus} />

      {stage === 'readiness' ? (
        <>
          <OverviewStage
            term={term}
            optionsLoading={optionsLoading}
            loadError={loadError}
            programCount={programCount}
            sectionCount={sectionCount}
            offeringCount={configuredOfferings.length}
            hasCurrentAssignmentCheck={hasCurrentAssignmentCheck}
            assignmentReadiness={assignmentReadiness}
            readinessState={readinessState}
            blockingCount={blockingCount}
            warningCount={warningCount}
            categories={categories}
            assignmentLoading={assignmentLoading}
            assignmentError={assignmentError}
            hasConfiguredOfferings={configuredOfferings.length > 0}
            canGenerate={generationReady}
            generationReason={generationReason}
            onGenerate={() => void handleGenerate()}
            isGenerating={solving}
            solveError={solveError}
            onCheckAssignments={() => void handleCheckAssignments()}
            onRefreshInventory={() => {
              setInventoryVersion((value) => value + 1)
              setReadinessVersion((value) => value + 1)
            }}
            inventoryLoading={inventoryLoading}
            configurationOpen={showConfiguration}
            onToggleConfiguration={() => setShowConfiguration((value) => !value)}
          />
          {showConfiguration ? (
            <SchedulingConfigurationStage
              key={termId ?? 'no-term'}
              termId={termId}
              onConfigurationChanged={() => {
                setReadinessVersion((value) => value + 1)
                setInventoryVersion((value) => value + 1)
              }}
            />
          ) : null}
        </>
      ) : null}

      {stage === 'generation' ? (
        <GenerationStage
          term={term}
          inventoryLoading={inventoryLoading}
          inventoryError={inventoryError}
          publishedCount={publishedSchedules.length}
          draftSchedules={draftSchedules}
          replacementDraftIds={replacementDraftIds}
          selectedReplacementDraftCount={selectedReplacementDraftCount}
          onToggleReplacementDraft={toggleReplacementDraft}
          keepDay={keepDay}
          keepStartTime={keepStartTime}
          keepRoom={keepRoom}
          onKeepDayChange={setKeepDay}
          onKeepStartTimeChange={setKeepStartTime}
          onKeepRoomChange={setKeepRoom}
          canGenerate={generationReady}
          generationReason={generationReason}
          onGenerate={() => void handleGenerate()}
          isGenerating={solving}
          solveError={solveError}
          latestRun={latestRun}
          generationNotice={generationNotice}
        />
      ) : null}

      {stage === 'review' ? (
        <ReviewStage
          run={latestRun}
          candidateDetail={candidateDetail}
          candidateLoading={candidateLoading}
          candidateError={candidateError}
          options={options}
          publishedCount={publishedSchedules.length}
          onGoToGeneration={() => requestStageChange('generation')}
          onGoToRevision={() => requestStageChange('revision')}
        />
      ) : null}

      {stage === 'revision' ? (
        candidateDetail ? (
          <CandidateRevisionPanel
            candidate={candidateDetail}
            options={options}
            onDirtyChange={handleDirtyChange}
            onCandidateChanged={async () => {
              const uuid = latestRun?.candidate?.uuid
              if (uuid) await loadCandidate(uuid)
            }}
          />
        ) : (
          <Card>
            <EmptyState
              icon={CalendarDays}
              title="No persisted candidate to revise"
              description="Generate a candidate first. Revisions are created against the persisted candidate and its original snapshot."
              action={(
                <Button variant="outline" onClick={() => requestStageChange('generation')} leftIcon={<ArrowRight className="size-4" aria-hidden="true" />}>
                  Go to generation
                </Button>
              )}
            />
          </Card>
        )
      ) : null}

      {routeBlocker.state === 'blocked' ? (
        <ConfirmationDialog
          title="Discard unsaved revision changes?"
          description="You have unsaved candidate revision edits. If you leave this page, those edits will be lost."
          confirmLabel="Leave page"
          cancelLabel="Stay"
          destructive
          onClose={() => routeBlocker.reset()}
          onConfirm={() => routeBlocker.proceed()}
        />
      ) : null}
    </div>
  )
}

function WorkspaceSteps({
  stage,
  onChange,
  status,
}: {
  stage: WorkspaceStage
  onChange: (stage: WorkspaceStage) => void
  status: Record<WorkspaceStage, string>
}) {
  const steps: Array<{ id: WorkspaceStage; label: string }> = [
    { id: 'readiness', label: 'Readiness' },
    { id: 'generation', label: 'Generation' },
    { id: 'review', label: 'Candidate review' },
    { id: 'revision', label: 'Revision and validation' },
  ]

  return (
    <nav aria-label="Intelligent scheduling stages" className="overflow-x-auto border-b border-line">
      <ol className="flex min-w-max items-stretch gap-1">
        {steps.map((step, index) => {
          const active = stage === step.id

          return (
            <li key={step.id}>
              <button
                type="button"
                aria-current={active ? 'step' : undefined}
                onClick={() => onChange(step.id)}
                className={cn(
                  'flex items-center gap-2.5 border-b-2 px-3 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-maroon-600',
                  active
                    ? 'border-maroon-600 text-maroon-800'
                    : 'border-transparent text-ink-muted hover:text-ink',
                )}
              >
                <span className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold',
                  active ? 'border-maroon-200 bg-maroon-50 text-maroon-700' : 'border-line bg-white text-ink-muted',
                )}>
                  {index + 1}
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold">
                    {step.label}
                  </span>
                  <span className="mt-0.5 block whitespace-nowrap text-[11px] font-medium text-ink-muted">
                    {status[step.id]}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function OverviewStage({
  term,
  optionsLoading,
  loadError,
  programCount,
  sectionCount,
  offeringCount,
  hasCurrentAssignmentCheck,
  assignmentReadiness,
  readinessState,
  blockingCount,
  warningCount,
  categories,
  assignmentLoading,
  assignmentError,
  hasConfiguredOfferings,
  canGenerate,
  generationReason,
  onGenerate,
  isGenerating,
  solveError,
  onCheckAssignments,
  onRefreshInventory,
  inventoryLoading,
  configurationOpen,
  onToggleConfiguration,
}: {
  term: AcademicTerm | undefined
  optionsLoading: boolean
  loadError?: string | null
  programCount: number
  sectionCount: number
  offeringCount: number
  hasCurrentAssignmentCheck: boolean
  assignmentReadiness: AssignmentReadiness | null
  readinessState: ReadinessState
  blockingCount: number
  warningCount: number
  categories: ReadinessCategory[]
  assignmentLoading: boolean
  assignmentError: string | null
  hasConfiguredOfferings: boolean
  canGenerate: boolean
  generationReason: string
  onGenerate: () => void
  isGenerating: boolean
  solveError: string | null
  onCheckAssignments: () => void
  onRefreshInventory: () => void
  inventoryLoading: boolean
  configurationOpen: boolean
  onToggleConfiguration: () => void
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-5">
        <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-ink">Semester summary</h2>
              <p className="mt-0.5 text-xs text-ink-muted">Complete-semester scope across configured programs, year levels, and sections.</p>
            </div>
            <Badge tone="neutral">Complete semester</Badge>
          </CardHeader>
          <CardBody>
            <dl className="grid grid-cols-2 gap-y-4 sm:grid-cols-4 sm:divide-x sm:divide-line">
              <SummaryMetric label="Programs" value={optionsLoading ? '—' : `${programCount}`} />
              <SummaryMetric label="Sections" value={optionsLoading ? '—' : `${sectionCount}`} />
              <SummaryMetric
                label="Required class assignments"
                value={optionsLoading ? '—' : `${offeringCount}`}
                detail="Open class assignments returned"
              />
              <SummaryMetric
                label="Assigned professors"
                value={!hasCurrentAssignmentCheck ? 'Not checked' : `${assignmentReadiness?.distinctProfessors ?? 0}`}
              />
            </dl>
            <p className="mt-4 border-t border-line pt-3 text-[11px] leading-4 text-ink-muted">
              Counts come from the current scheduling options. CCSync returns open class assignments and cannot yet confirm the complete required class assignment set.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex flex-wrap items-start justify-between gap-3 py-4">
            <div>
              <h2 className="text-sm font-semibold text-ink">Scheduling readiness</h2>
              <p className="mt-0.5 text-xs text-ink-muted">
                {blockingCount} blocking · {warningCount} warning{warningCount === 1 ? '' : 's'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={stateTone(readinessState)}>{stateLabel(readinessState)}</Badge>
              <Button
                type="button"
                size="sm"
                variant="outline"
                isLoading={assignmentLoading}
                disabled={optionsLoading || !hasConfiguredOfferings}
                onClick={onCheckAssignments}
              >
                {hasCurrentAssignmentCheck ? 'Recheck assignments' : 'Check assignments'}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={onToggleConfiguration}>
                {configurationOpen ? 'Hide configuration' : 'Open configuration'}
              </Button>
            </div>
          </CardHeader>
          <div className="divide-y divide-line">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-[11px] text-ink-muted sm:px-5">
              <span>Expand a category to inspect individual checks.</span>
              <Button variant="ghost" size="sm" onClick={onRefreshInventory} disabled={inventoryLoading} className="h-7 px-2 text-[11px]">
                <RefreshCw className={cn('size-3.5', inventoryLoading && 'animate-spin')} aria-hidden="true" />
                Refresh inputs
              </Button>
            </div>
            {loadError ? (
              <div role="alert" className="flex items-start gap-2 px-4 py-3 text-xs text-red-800 sm:px-5">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <p>Scheduling options could not be fully loaded. {loadError}</p>
              </div>
            ) : null}
            {assignmentError ? (
              <div role="alert" className="flex items-start gap-2 px-4 py-3 text-xs text-red-800 sm:px-5">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <p>{assignmentError}</p>
              </div>
            ) : null}
            {categories.map((category) => (
              <ReadinessCategoryRow
                key={category.id}
                category={category}
                assignmentLoading={assignmentLoading}
                onCheckAssignments={onCheckAssignments}
              />
            ))}
          </div>
        </Card>
      </div>

      <div className="space-y-5">
        <Card>
          <CardHeader className="py-4">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-maroon-50 text-maroon-700">
                <Sparkles className="size-4" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-ink">Generate timetable</h2>
                <p className="mt-0.5 text-xs text-ink-muted">One complete-semester run</p>
              </div>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <div>
              <Badge tone={stateTone(readinessState)}>{stateLabel(readinessState)}</Badge>
              <p className="mt-2 text-sm font-medium text-ink">
                {blockingCount
                  ? `${blockingCount} blocking requirement${blockingCount === 1 ? '' : 's'} must be resolved.`
                  : warningCount
                    ? `${warningCount} warning${warningCount === 1 ? '' : 's'} to review.`
                    : 'All readiness checks passed.'}
              </p>
              <p className="mt-1 text-xs leading-5 text-ink-muted">
                {term ? 'Creates a complete timetable for the configured term.' : 'Select an academic term to begin.'}
              </p>
            </div>
            <Button
              type="button"
              className="w-full"
              disabled={!canGenerate}
              isLoading={isGenerating}
              onClick={onGenerate}
              leftIcon={<Sparkles className="size-4" aria-hidden="true" />}
            >
              Generate complete-semester timetable
            </Button>
            <p className="text-[11px] leading-4 text-ink-muted">{generationReason}</p>
            {solveError ? (
              <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-800">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {solveError}
              </p>
            ) : null}
            <div className="rounded-lg border border-line bg-surface-soft p-3 text-xs leading-5 text-ink-muted">
              The current published timetable remains active. Professor assignments are never changed by the AI.
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

function SummaryMetric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="px-0 sm:px-4 sm:first:pl-0 sm:last:pr-0">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tabular-nums text-ink">{value}</dd>
      {detail ? <dd className="mt-0.5 text-[11px] leading-4 text-ink-muted">{detail}</dd> : null}
    </div>
  )
}

function ReadinessCategoryRow({
  category,
  assignmentLoading,
  onCheckAssignments,
}: {
  category: ReadinessCategory
  assignmentLoading: boolean
  onCheckAssignments: () => void
}) {
  const state = categoryState(category.checks)

  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-soft focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-maroon-600 sm:px-5 [&::-webkit-details-marker]:hidden">
        <span className={cn('mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border', stateClasses(state))}>
          <StateIcon state={state} className="size-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-ink">{category.title}</span>
            <Badge tone={stateTone(state)}>{stateLabel(state)}</Badge>
          </span>
          <span className="mt-0.5 block text-xs leading-5 text-ink-muted">{category.summary}</span>
        </span>
        <ChevronDown className="mt-1 size-4 shrink-0 text-ink-muted transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="border-t border-line bg-surface-soft/60 px-4 py-1 sm:px-5">
        <ul className="divide-y divide-line">
          {category.checks.map((check) => (
            <li key={check.title} className="py-2.5">
              <div className="flex items-start gap-2">
                <span className={cn('mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border', stateClasses(check.state))}>
                  <StateIcon state={check.state} className="size-3" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-semibold text-ink">{check.title}</p>
                    {check.state === 'blocked' ? (
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-red-700">Blocking</span>
                    ) : check.state === 'warning' ? (
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-700">Warning</span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs leading-5 text-ink-muted">{check.detail}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-3">
                    {check.link ? (
                      <Link
                        to={check.link.to}
                        className="text-xs font-semibold text-maroon-700 underline decoration-maroon-200 underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon-600"
                      >
                        {check.link.label}
                      </Link>
                    ) : null}
                    {check.action === 'check-assignments' ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="-ml-2 h-7 px-2 text-[11px]"
                        isLoading={assignmentLoading}
                        onClick={onCheckAssignments}
                      >
                        {check.actionLabel ?? 'Check assignments'}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
        {category.extra}
      </div>
    </details>
  )
}

function GenerationStage({
  term,
  inventoryLoading,
  inventoryError,
  publishedCount,
  draftSchedules,
  replacementDraftIds,
  selectedReplacementDraftCount,
  onToggleReplacementDraft,
  keepDay,
  keepStartTime,
  keepRoom,
  onKeepDayChange,
  onKeepStartTimeChange,
  onKeepRoomChange,
  canGenerate,
  generationReason,
  onGenerate,
  isGenerating,
  solveError,
  latestRun,
  generationNotice,
}: {
  term: AcademicTerm | undefined
  inventoryLoading: boolean
  inventoryError: string | null
  publishedCount: number
  draftSchedules: ScheduleRecord[]
  replacementDraftIds: number[]
  selectedReplacementDraftCount: number
  onToggleReplacementDraft: (id: number) => void
  keepDay: boolean
  keepStartTime: boolean
  keepRoom: boolean
  onKeepDayChange: (value: boolean) => void
  onKeepStartTimeChange: (value: boolean) => void
  onKeepRoomChange: (value: boolean) => void
  canGenerate: boolean
  generationReason: string
  onGenerate: () => void
  isGenerating: boolean
  solveError: string | null
  latestRun: SchedulingSolveResponse | null
  generationNotice: string | null
}) {
  const baselineValue = inventoryLoading
    ? 'Loading published records…'
    : inventoryError
      ? 'Unavailable'
      : publishedCount
        ? `${publishedCount} published record${publishedCount === 1 ? '' : 's'}`
        : 'No published timetable'

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-5">
        <Card>
          <CardHeader className="py-4">
            <h2 className="text-sm font-semibold text-ink">Semester scope</h2>
            <p className="mt-0.5 text-xs text-ink-muted">Generation always covers the entire configured term.</p>
          </CardHeader>
          <CardBody>
            <dl>
              <DefinitionRow label="Academic term" value={termName(term)} />
              <DefinitionRow
                label="Scope"
                value="All configured programs, year levels, sections, and required class assignments"
              />
              <DefinitionRow
                label="Published baseline"
                value={baselineValue}
                detail="Used only as a soft optimization baseline."
              />
              <DefinitionRow
                label="Generation behaviour"
                value="One complete-semester run"
                detail="The whole term is scheduled together. Sections cannot be generated independently."
              />
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="py-4">
            <h2 className="text-sm font-semibold text-ink">Latest generation</h2>
            <p className="mt-0.5 text-xs text-ink-muted">Outcome returned by the backend for this term.</p>
          </CardHeader>
          <CardBody>
            {generationNotice ? (
              <p role="status" className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-950">
                {generationNotice}
              </p>
            ) : null}
            {latestRun ? (
              <dl>
                <DefinitionRow label="Generation" value={latestRun.generation.uuid} detail={`Status: ${latestRun.generation.status}`} />
                <DefinitionRow label="Solver outcome" value={`${latestRun.result.solver_status} · ${latestRun.result.result_status}`} />
                <DefinitionRow label="Execution duration" value={`${latestRun.result.solver_execution_ms} ms`} detail={`Completed: ${latestRun.result.completed_at}`} />
                <DefinitionRow
                  label="Validation"
                  value={latestRun.result.validation_summary.independent_validation_status}
                  detail={`${latestRun.result.validation_summary.scheduled_meeting_count} scheduled · ${latestRun.result.validation_summary.represented_offering_count} of ${latestRun.result.validation_summary.required_offering_count} offerings represented`}
                />
                {latestRun.generation.failure_code || latestRun.generation.failure_message ? (
                  <DefinitionRow
                    label="Failure detail"
                    value={latestRun.generation.failure_code ?? 'Not coded'}
                    detail={latestRun.generation.failure_message ?? undefined}
                  />
                ) : null}
                <DefinitionRow label="Persisted candidate" value={latestRun.candidate ? `${latestRun.candidate.uuid} · version ${latestRun.candidate.version}` : 'None'} />
              </dl>
            ) : (
              <p className="text-xs text-ink-muted">No generation has been run in this workspace for the selected term.</p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="py-4">
            <h2 className="text-sm font-semibold text-ink">Optimization preferences</h2>
            <p className="mt-0.5 text-xs leading-5 text-ink-muted">
              These preferences are not supported by the current scheduling contract.
            </p>
          </CardHeader>
          <CardBody className="space-y-3">
            <PreferenceCheckbox checked={keepDay} onChange={onKeepDayChange} disabled>
              Prefer previous meeting day
            </PreferenceCheckbox>
            <PreferenceCheckbox checked={keepStartTime} onChange={onKeepStartTimeChange} disabled>
              Prefer previous start time
            </PreferenceCheckbox>
            <PreferenceCheckbox checked={keepRoom} onChange={onKeepRoomChange} disabled>
              Prefer previous room
            </PreferenceCheckbox>
            <p className="border-t border-line pt-3 text-[11px] leading-4 text-ink-muted">
              These preferences are shown as unavailable and are not sent to the scheduling service. Hard constraints and fixed professor assignments always take priority.
            </p>
          </CardBody>
        </Card>

        <Card>
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-maroon-600 [&::-webkit-details-marker]:hidden">
              <div>
                <h2 className="text-sm font-semibold text-ink">Advanced settings</h2>
                <p className="mt-0.5 text-xs text-ink-muted">Configuration values are managed in the Configuration stage.</p>
              </div>
              <span className="flex items-center gap-2">
                <Badge tone="neutral">Managed elsewhere</Badge>
                <ChevronDown className="size-4 text-ink-muted transition-transform group-open:rotate-180" aria-hidden="true" />
              </span>
            </summary>
            <div className="space-y-3 border-t border-line p-5">
              <UnavailableSetting label="Operating days and hours" detail="Stored in the approved term-scoped time grid and used automatically when a request is built." />
              <UnavailableSetting label="Time grid and valid start boundaries" detail="Stored as fixed slots in the approved time grid; not edited in this stage." />
              <UnavailableSetting label="Solver time limit and runtime settings" detail="Configured on the backend and supplied through the frozen contract." />
            </div>
          </details>
        </Card>

        <Card>
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-maroon-600 [&::-webkit-details-marker]:hidden">
              <div>
                <h2 className="text-sm font-semibold text-ink">Existing drafts</h2>
                <p className="mt-0.5 text-xs text-ink-muted">No draft is selected for replacement by default.</p>
              </div>
              <span className="flex items-center gap-2">
                <span className="text-xs font-medium text-ink-muted">{draftSchedules.length}</span>
                <ChevronDown className="size-4 text-ink-muted transition-transform group-open:rotate-180" aria-hidden="true" />
              </span>
            </summary>
            <div className="space-y-2 border-t border-line p-5">
              {inventoryLoading ? (
                <p className="flex items-center gap-2 text-xs text-ink-muted">
                  <RefreshCw className="size-4 animate-spin" aria-hidden="true" />
                  Loading draft schedule records…
                </p>
              ) : inventoryError ? (
                <p role="alert" className="text-xs text-red-700">{inventoryError}</p>
              ) : draftSchedules.length ? (
                <>
                  {draftSchedules.map((schedule) => (
                    <label key={schedule.id} className="flex items-start gap-2 rounded-lg border border-line p-2.5 text-xs">
                      <input
                        type="checkbox"
                        checked={replacementDraftIds.includes(schedule.id)}
                        onChange={() => onToggleReplacementDraft(schedule.id)}
                        className="mt-0.5 accent-maroon-700"
                      />
                      <span className="min-w-0">
                        <span className="block font-semibold text-ink">
                          {schedule.offering.subject.code} · {schedule.offering.section.code} · Draft #{schedule.id}
                        </span>
                        <span className="mt-0.5 block text-ink-muted">
                          {formatScheduleDay(schedule.day_of_week)} · {schedule.start_time}–{schedule.end_time} · {schedule.offering.section.program.code}
                        </span>
                      </span>
                    </label>
                  ))}
                  <p className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] leading-4 text-amber-950">
                    {selectedReplacementDraftCount} draft{selectedReplacementDraftCount === 1 ? '' : 's'} selected locally. No draft is deleted, overwritten, or constrained by this selection.
                  </p>
                </>
              ) : (
                <p className="text-xs text-ink-muted">No existing draft schedules for this term.</p>
              )}
            </div>
          </details>
        </Card>
      </div>

      <div className="space-y-5">
        <Card>
          <CardHeader className="py-4">
            <h2 className="text-sm font-semibold text-ink">Start generation</h2>
            <p className="mt-0.5 text-xs text-ink-muted">Complete-semester run</p>
          </CardHeader>
          <CardBody className="space-y-3">
            <Badge tone={canGenerate ? 'success' : 'warning'}>{isGenerating ? 'Running' : canGenerate ? 'Ready to run' : 'Unavailable'}</Badge>
            <p className="text-xs leading-5 text-ink-muted">{generationReason}</p>
            <Button
              type="button"
              className="w-full"
              disabled={!canGenerate}
              isLoading={isGenerating}
              onClick={onGenerate}
              leftIcon={<Sparkles className="size-4" aria-hidden="true" />}
            >
              Generate complete-semester timetable
            </Button>
            {solveError ? (
              <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-800">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {solveError}
              </p>
            ) : null}
            <p className="text-[11px] leading-4 text-ink-muted">
              A feasible candidate is persisted for review. Nothing is published or written to official schedule records.
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

function DefinitionRow({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="grid gap-1 border-b border-line py-3 last:border-b-0 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-xs font-semibold text-ink-muted">{label}</dt>
      <dd className="text-sm text-ink">
        {value}
        {detail ? <span className="mt-0.5 block text-xs leading-5 text-ink-muted">{detail}</span> : null}
      </dd>
    </div>
  )
}

function UnavailableSetting({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-line bg-surface-soft p-3">
      <div>
        <p className="text-xs font-semibold text-ink">{label}</p>
        <p className="mt-0.5 text-[11px] leading-4 text-ink-muted">{detail}</p>
      </div>
      <Badge tone="neutral">Unavailable</Badge>
    </div>
  )
}

function PreferenceCheckbox({
  checked,
  onChange,
  disabled = false,
  children,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
  children: string
}) {
  return (
    <label className={cn('flex items-start gap-2 text-xs text-ink', disabled && 'opacity-60')}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 accent-maroon-700"
      />
      {children}
    </label>
  )
}

function ReviewStage({
  run,
  candidateDetail,
  candidateLoading,
  candidateError,
  options,
  publishedCount,
  onGoToGeneration,
  onGoToRevision,
}: {
  run: SchedulingSolveResponse | null
  candidateDetail: SchedulingCandidateDetail | null
  candidateLoading: boolean
  candidateError: string | null
  options: SchedulingOptions | null
  publishedCount: number
  onGoToGeneration: () => void
  onGoToRevision: () => void
}) {
  if (!run?.candidate) {
    return (
      <Card>
        <EmptyState
          icon={CalendarDays}
          title="No persisted candidate to review"
          description="Run generation to create a candidate for this term. A persisted candidate is required before revisions can be created."
          action={(
            <Button variant="outline" onClick={onGoToGeneration} leftIcon={<ArrowRight className="size-4" aria-hidden="true" />}>
              Go to generation
            </Button>
          )}
        />
        <div className="border-t border-line px-6 py-4">
          <p className="text-xs leading-5 text-ink-muted">
            {publishedCount
              ? `${publishedCount} published schedule record${publishedCount === 1 ? '' : 's'} remain active and are unaffected.`
              : 'No published timetable exists for this term yet.'}
          </p>
        </div>
      </Card>
    )
  }

  const result = run.result
  const summary = result.validation_summary
  const tone: BadgeTone = summary.complete_candidate && summary.independent_validation_status === 'passed' && run.generation.result_status === 'FEASIBLE'
    ? 'success'
    : 'warning'
  const roomUsage = new Map<string, { room: string; minutes: number; placements: number }>()
  for (const assignment of result.assignments) {
    const roomId = assignment.room_id ?? 'unassigned'
    const room = options?.rooms.find((item) => String(item.id) === roomId)?.code ?? (assignment.room_id ? roomId : 'No room assigned')
    const current = roomUsage.get(roomId) ?? { room, minutes: 0, placements: 0 }
    current.minutes += durationBetween(assignment.start_time, assignment.end_time)
    current.placements += 1
    roomUsage.set(roomId, current)
  }
  const roomRows = [...roomUsage.values()].sort((left, right) => right.minutes - left.minutes)

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-2 py-4">
          <div>
            <h2 className="text-sm font-semibold text-ink">Generated candidate</h2>
            <p className="mt-0.5 text-xs leading-5 text-ink-muted">
              Original solver output persisted for this generation. Review revisions are separate and do not overwrite it.
            </p>
          </div>
          <Badge tone={tone}>{run.generation.result_status ?? result.result_status}</Badge>
        </CardHeader>
        <CardBody>
          <dl>
            <DefinitionRow label="Candidate" value={run.candidate.uuid} detail={`Version ${run.candidate.version} · ${run.candidate.assignment_count} placements`} />
            <DefinitionRow label="Generation" value={run.generation.uuid} detail={`${run.generation.status} · completed ${run.generation.completed_at ?? 'not recorded'}`} />
            <DefinitionRow label="Solver outcome" value={`${result.solver_status} · ${result.result_status}`} detail={`Execution ${result.solver_execution_ms} ms`} />
            <DefinitionRow
              label="Scheduled meetings"
              value={`${summary.scheduled_meeting_count} of ${summary.required_mandatory_meeting_count} required`}
              detail={`${summary.desired_meeting_count} meetings requested in total.`}
            />
            <DefinitionRow label="Offerings represented" value={`${summary.represented_offering_count} of ${summary.required_offering_count}`} />
            <DefinitionRow label="Independent validation" value={summary.independent_validation_status} />
            <DefinitionRow
              label="Published baseline"
              value={publishedCount ? `${publishedCount} active record${publishedCount === 1 ? '' : 's'}` : 'None'}
              detail="Reference context only; generation never overwrites published records."
            />
            <DefinitionRow
              label="Objective value"
              value={result.objective_value === null || result.objective_value === undefined ? 'Not reported' : result.objective_value.toFixed(2)}
            />
            <DefinitionRow label="Revisions" value={candidateLoading ? 'Loading…' : `${candidateDetail?.revisions.length ?? 0}`} />
          </dl>
          {candidateError ? (
            <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-800">{candidateError}</p>
          ) : null}
        </CardBody>
      </Card>

      <CandidateTimetableGrid
        assignments={result.assignments}
        parentAssignments={null}
        options={options}
        diagnostics={result.diagnostics}
        validationErrors={summary.validation_errors}
        selectedId={null}
        onSelect={() => undefined}
      />

      <Card>
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-maroon-600 [&::-webkit-details-marker]:hidden">
            <div>
              <h2 className="text-sm font-semibold text-ink">Diagnostics and workload</h2>
              <p className="mt-0.5 text-xs text-ink-muted">
                {result.diagnostics.length} diagnostics · {result.warnings.length} warnings · {result.workload_metrics.length} professor metrics · {roomRows.length} rooms used
              </p>
            </div>
            <ChevronDown className="size-4 text-ink-muted transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="space-y-3 border-t border-line p-5">
            {result.diagnostics.length ? (
              <ul className="space-y-2">
                {result.diagnostics.map((diagnostic) => (
                  <li key={`${diagnostic.code}-${diagnostic.message}`} className="rounded-lg border border-line bg-surface-soft p-3 text-xs leading-5 text-ink">
                    <p className="font-semibold">{diagnostic.code} · {diagnostic.evidence}</p>
                    <p className="mt-0.5 text-ink-muted">{diagnostic.message}</p>
                  </li>
                ))}
              </ul>
            ) : <p className="text-xs text-ink-muted">No solver diagnostics were returned.</p>}
            {result.warnings.length ? (
              <ul className="space-y-1">
                {result.warnings.map((warning) => (
                  <li key={`${warning.code}-${warning.message}`} className="text-xs leading-5 text-amber-900">{warning.message}</li>
                ))}
              </ul>
            ) : null}
            {result.workload_metrics.length ? (
              <div className="overflow-x-auto rounded-lg border border-line">
                <table className="w-full min-w-[560px] text-left text-xs">
                  <thead className="bg-surface-soft text-ink-muted">
                    <tr><th className="px-3 py-2">Professor</th><th className="px-3 py-2">Assigned</th><th className="px-3 py-2">Target</th><th className="px-3 py-2">Deviation</th></tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {result.workload_metrics.map((metric) => (
                      <tr key={metric.professor_id}>
                        <td className="px-3 py-2 font-medium text-ink">{metric.professor_id}</td>
                        <td className="px-3 py-2">{metric.assigned_teaching_minutes} min</td>
                        <td className="px-3 py-2">{metric.weekly_target_minutes === null ? 'Not set' : `${metric.weekly_target_minutes} min`}</td>
                        <td className="px-3 py-2">{metric.signed_target_deviation_minutes ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            {roomRows.length ? (
              <div className="overflow-x-auto rounded-lg border border-line">
                <table className="w-full min-w-[480px] text-left text-xs">
                  <thead className="bg-surface-soft text-ink-muted">
                    <tr><th className="px-3 py-2">Room</th><th className="px-3 py-2">Placements</th><th className="px-3 py-2">Scheduled time</th></tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {roomRows.map((row) => (
                      <tr key={row.room}>
                        <td className="px-3 py-2 font-medium text-ink">{row.room}</td>
                        <td className="px-3 py-2">{row.placements}</td>
                        <td className="px-3 py-2">{formatDuration(row.minutes)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </details>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button onClick={onGoToRevision} leftIcon={<ArrowRight className="size-4" aria-hidden="true" />}>
          Open revision and validation
        </Button>
        <Button variant="outline" onClick={onGoToGeneration}>
          Back to generation
        </Button>
      </div>
    </div>
  )
}

function stateClasses(state: ReadinessState): string {
  if (state === 'ready') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (state === 'warning') return 'border-amber-200 bg-amber-50 text-amber-700'
  if (state === 'blocked') return 'border-red-200 bg-red-50 text-red-700'
  return 'border-line bg-white text-ink-muted'
}

function StateIcon({ state, className }: { state: ReadinessState; className?: string }) {
  if (state === 'ready') return <Check className={className} aria-hidden="true" />
  if (state === 'checking') return <RefreshCw className={cn(className, 'animate-spin')} aria-hidden="true" />
  if (state === 'warning' || state === 'blocked') return <AlertTriangle className={className} aria-hidden="true" />
  return <CircleHelp className={className} aria-hidden="true" />
}
