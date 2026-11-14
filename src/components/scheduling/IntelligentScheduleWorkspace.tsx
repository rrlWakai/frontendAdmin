import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  LockKeyhole,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { Card, CardBody, CardHeader } from '@/components/common/Card'
import { EmptyState } from '@/components/common/EmptyState'
import { fetchProfessor } from '@/services/api/faculty'
import { fetchOfferingFacultyAssignments, fetchSchedules } from '@/services/api/scheduling'
import type { AcademicTerm } from '@/types/academic'
import type {
  ScheduleConflictRecord,
  ScheduleRecord,
  SchedulingOptions,
} from '@/types/scheduling'
import { getApiErrorMessage } from '@/utils/apiError'
import { cn } from '@/utils/cn'

type WorkspaceStage = 'overview' | 'generation' | 'review' | 'approval'
type ReadinessState = 'ready' | 'warning' | 'blocked' | 'checking' | 'info'
type BadgeTone = 'neutral' | 'success' | 'warning' | 'info' | 'danger'

const GENERATION_SERVICE_CONNECTED = false

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

export function IntelligentScheduleWorkspace({
  termId,
  term,
  options,
  optionsLoading,
  loadError,
  conflicts,
}: IntelligentScheduleWorkspaceProps) {
  const [stage, setStage] = useState<WorkspaceStage>('overview')
  const [inventory, setInventory] = useState<ScheduleRecord[] | null>(null)
  const [inventoryLoading, setInventoryLoading] = useState(true)
  const [inventoryError, setInventoryError] = useState<string | null>(null)
  const [inventoryVersion, setInventoryVersion] = useState(0)
  const [assignmentReadiness, setAssignmentReadiness] = useState<AssignmentReadiness | null>(null)
  const [assignmentLoading, setAssignmentLoading] = useState(false)
  const [checkedOfferingCount, setCheckedOfferingCount] = useState(0)
  const [assignmentError, setAssignmentError] = useState<string | null>(null)
  const [replacementDraftIds, setReplacementDraftIds] = useState<number[]>([])
  const [keepDay, setKeepDay] = useState(true)
  const [keepStartTime, setKeepStartTime] = useState(true)
  const [keepRoom, setKeepRoom] = useState(true)

  const offeringSignature = options?.offerings
    .map((offering) => offering.id)
    .sort((left, right) => left - right)
    .join(',') ?? ''
  const hasCurrentAssignmentCheck = Boolean(
    assignmentReadiness && assignmentReadiness.checkedSignature === offeringSignature,
  )

  useEffect(() => {
    let active = true
    if (!termId) {
      setInventory(null)
      setInventoryLoading(false)
      return () => { active = false }
    }

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
        `${summary.unavailable} offering assignment record${summary.unavailable === 1 ? '' : 's'} and ${profileFailures} professor profile${profileFailures === 1 ? '' : 's'} could not be checked. These inputs remain unverified.`,
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
    ? `Checking active assignment records: ${checkedOfferingCount} of ${configuredOfferings.length} open offerings.`
    : !hasCurrentAssignmentCheck
      ? 'Professor assignments have not been checked for the configured offerings. The AI never selects or redistributes professors.'
      : assignmentReadiness && assignmentProblemCount
        ? `${assignmentReadiness.missing} unassigned · ${assignmentReadiness.multiple} with multiple distinct professors · ${assignmentReadiness.unavailable} that could not be verified. Exactly one distinct professor is required per ordinary offering.`
        : `${assignmentReadiness?.checkedOfferings ?? 0} offerings each have exactly one distinct assigned professor.`

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
            ? `${programCount} programs · ${yearLevelCount} year levels · ${sectionCount} sections are represented in the returned offerings.`
            : 'No configured offerings were returned for this term.',
      link: { to: '/academic/sections', label: 'Review sections' },
    },
    {
      title: 'Required subject offerings',
      state: optionsLoading ? 'checking' : loadError ? 'blocked' : configuredOfferings.length ? 'warning' : 'blocked',
      detail: optionsLoading
        ? 'Loading open subject offerings…'
        : loadError
          ? loadError
          : configuredOfferings.length
            ? `${configuredOfferings.length} open offerings are available. CCSync cannot yet confirm the complete required-offering set.`
            : 'No open offerings are available. Create or open subject offerings before scheduling.',
      link: { to: '/academic/subject-offerings', label: 'Review subject offerings' },
    },
  ]

  const meetingChecks: ReadinessCheck[] = [
    {
      title: 'Lecture and laboratory meeting plans',
      state: 'blocked',
      detail: 'Meeting frequency, duration, and meeting type are not available yet.',
      link: { to: '/academic/subject-offerings', label: 'Review offerings' },
    },
    {
      title: 'Frequency, duration, and required room type',
      state: 'blocked',
      detail: 'Approved meeting requirements must come from offering data. Subject catalog hours are not treated as a meeting plan.',
    },
  ]

  const facultyChecks: ReadinessCheck[] = [
    {
      title: 'One distinct professor per offering',
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
      state: 'blocked',
      detail: 'Monday–Wednesday is the approved standard working pattern. The term-associated policy and authorized exceptions are not available yet.',
    },
    {
      title: 'Part-time workload targets',
      state: 'info',
      detail: 'Weekly targets use actual teaching hours and remain soft objectives. A target deviation is never a hard scheduling failure. Targets are not available yet.',
      link: { to: '/faculty', label: 'Review faculty records' },
    },
  ]

  const facilityChecks: ReadinessCheck[] = [
    {
      title: 'Room configuration and capacity',
      state: optionsLoading
        ? 'checking'
        : availableRooms.length === 0
          ? 'blocked'
          : 'warning',
      detail: optionsLoading
        ? 'Loading room inventory…'
        : availableRooms.length === 0
          ? 'No rooms are marked available for this term.'
          : `${availableRooms.length} available rooms${invalidRooms.length ? ` · ${invalidRooms.length} with invalid capacity or room type` : ''}. Capacity and room type suitability cannot be verified without approved meeting plans.`,
      link: { to: '/rooms', label: 'Review room inventory' },
    },
    {
      title: 'Explicit combined-class groups',
      state: 'info',
      detail: 'Only explicitly configured combined classes are used. No combined-class configuration is available yet.',
    },
  ]

  const timetableChecks: ReadinessCheck[] = [
    {
      title: 'Published baseline',
      state: inventoryLoading ? 'checking' : inventoryError || !inventory ? 'blocked' : 'ready',
      detail: inventoryLoading
        ? 'Loading the complete schedule inventory…'
        : inventoryError
          ? inventoryError
          : `${publishedSchedules.length} published schedule record${publishedSchedules.length === 1 ? '' : 's'} remain active${publishedSchedules.length ? ' as the comparison baseline' : ''}.`,
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
      id: 'academic',
      title: 'Academic configuration',
      summary: optionsLoading
        ? 'Loading programs, sections, and offerings…'
        : loadError
          ? 'Scheduling options could not be loaded.'
          : `${programCount} programs · ${yearLevelCount} year levels · ${sectionCount} sections`,
      checks: academicChecks,
    },
    {
      id: 'meetings',
      title: 'Meeting requirements',
      summary: 'Lecture and laboratory meeting plans are not available yet.',
      checks: meetingChecks,
    },
    {
      id: 'faculty',
      title: 'Faculty',
      summary: !hasCurrentAssignmentCheck
        ? 'Professor assignments have not been checked.'
        : assignmentProblemCount
          ? `${assignmentProblemCount} of ${assignmentReadiness?.checkedOfferings ?? configuredOfferings.length} offerings need attention.`
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
  const readinessState: ReadinessState = optionsLoading || inventoryLoading || assignmentLoading
    ? 'checking'
    : blockingCount
      ? 'blocked'
      : warningCount
        ? 'warning'
        : 'ready'

  const generationReason = !term
    ? 'Select an active or planned academic term to continue.'
    : optionsLoading || inventoryLoading || assignmentLoading
      ? 'Waiting for scheduling inputs to finish loading.'
      : blockingCount
        ? `${blockingCount} blocking requirement${blockingCount === 1 ? '' : 's'} must be resolved before generation.`
        : !GENERATION_SERVICE_CONNECTED
          ? 'Generation is not available in this release.'
          : 'All readiness checks passed.'
  const generationReady = Boolean(term) && readinessState === 'ready' && GENERATION_SERVICE_CONNECTED

  async function handleCheckAssignments() {
    try {
      await checkAssignments()
    } catch (failure) {
      setAssignmentError(getApiErrorMessage(failure, 'Unable to validate offering assignments.'))
      setAssignmentLoading(false)
    }
  }

  function toggleReplacementDraft(id: number) {
    setReplacementDraftIds((current) => (
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    ))
  }

  const stageStatus: Record<WorkspaceStage, string> = {
    overview: stateLabel(readinessState),
    generation: blockingCount ? `${blockingCount} blocking` : 'Configured',
    review: 'No candidate',
    approval: 'No candidate',
  }

  return (
    <div className="space-y-4">
      <WorkspaceSteps stage={stage} onChange={setStage} status={stageStatus} />

      {stage === 'overview' ? (
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
          onCheckAssignments={() => void handleCheckAssignments()}
          onRefreshInventory={() => setInventoryVersion((value) => value + 1)}
          inventoryLoading={inventoryLoading}
        />
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
        />
      ) : null}

      {stage === 'review' ? (
        <ReviewStage publishedCount={publishedSchedules.length} onGoToGeneration={() => setStage('generation')} />
      ) : null}

      {stage === 'approval' ? (
        <ApprovalStage
          publishedCount={publishedSchedules.length}
          draftCount={draftSchedules.length}
          inventoryLoading={inventoryLoading}
          inventoryError={inventoryError}
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
  const steps: Array<{ id: WorkspaceStage; label: string; locked?: boolean }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'generation', label: 'Generation' },
    { id: 'review', label: 'Timetable review', locked: true },
    { id: 'approval', label: 'Approval', locked: true },
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
                    {step.locked ? <LockKeyhole className="size-3.5" aria-hidden="true" /> : null}
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
  onCheckAssignments,
  onRefreshInventory,
  inventoryLoading,
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
  onCheckAssignments: () => void
  onRefreshInventory: () => void
  inventoryLoading: boolean
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
                label="Required offerings"
                value={optionsLoading ? '—' : `${offeringCount}`}
                detail="Open offerings returned"
              />
              <SummaryMetric
                label="Assigned professors"
                value={!hasCurrentAssignmentCheck ? 'Not checked' : `${assignmentReadiness?.distinctProfessors ?? 0}`}
              />
            </dl>
            <p className="mt-4 border-t border-line pt-3 text-[11px] leading-4 text-ink-muted">
              Counts come from the current scheduling options. CCSync returns open offerings and cannot yet confirm the complete required-offering set.
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
            </div>
          </CardHeader>
          <div className="divide-y divide-line">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-[11px] text-ink-muted sm:px-5">
              <span>Expand a category to inspect individual checks.</span>
              <Button variant="ghost" size="sm" onClick={onRefreshInventory} disabled={inventoryLoading} className="h-7 px-2 text-[11px]">
                <RefreshCw className={cn('size-3.5', inventoryLoading && 'animate-spin')} aria-hidden="true" />
                Refresh inventory
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
              leftIcon={<Sparkles className="size-4" aria-hidden="true" />}
            >
              Generate complete-semester timetable
            </Button>
            <p className="text-[11px] leading-4 text-ink-muted">{generationReason}</p>
            <div className="rounded-lg border border-line bg-surface-soft p-3 text-xs leading-5 text-ink-muted">
              The current published timetable remains active. Professor assignments are never changed by the AI.
            </div>
            <p className="text-[11px] leading-4 text-ink-muted">
              Generation is not available in this release, so the action stays disabled even when inputs are complete.
            </p>
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
                value="All configured programs, year levels, sections, and required offerings"
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
            <h2 className="text-sm font-semibold text-ink">Optimization preferences</h2>
            <p className="mt-0.5 text-xs leading-5 text-ink-muted">
              Prefer the previous timetable&apos;s day, time, and room when a valid alternative is available.
            </p>
          </CardHeader>
          <CardBody className="space-y-3">
            <PreferenceCheckbox checked={keepDay} onChange={onKeepDayChange}>
              Prefer previous meeting day
            </PreferenceCheckbox>
            <PreferenceCheckbox checked={keepStartTime} onChange={onKeepStartTimeChange}>
              Prefer previous start time
            </PreferenceCheckbox>
            <PreferenceCheckbox checked={keepRoom} onChange={onKeepRoomChange}>
              Prefer previous room
            </PreferenceCheckbox>
            <p className="border-t border-line pt-3 text-[11px] leading-4 text-ink-muted">
              These are soft preferences, not guarantees. Hard constraints and fixed professor assignments always take priority, and previous placements can still change.
            </p>
          </CardBody>
        </Card>

        <Card>
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-maroon-600 [&::-webkit-details-marker]:hidden">
              <div>
                <h2 className="text-sm font-semibold text-ink">Advanced settings</h2>
                <p className="mt-0.5 text-xs text-ink-muted">Operating hours, time grid, and solver options.</p>
              </div>
              <span className="flex items-center gap-2">
                <Badge tone="neutral">Not available</Badge>
                <ChevronDown className="size-4 text-ink-muted transition-transform group-open:rotate-180" aria-hidden="true" />
              </span>
            </summary>
            <div className="space-y-3 border-t border-line p-5">
              <UnavailableSetting label="Operating days and hours" detail="Institution-configured and term-associated values are not available yet." />
              <UnavailableSetting label="Time grid and valid start boundaries" detail="Time-grid configuration is not available yet." />
              <UnavailableSetting label="Solver time limit and runtime settings" detail="Runtime settings are not available yet." />
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
            <Badge tone={canGenerate ? 'success' : 'warning'}>{canGenerate ? 'Ready to run' : 'Unavailable'}</Badge>
            <p className="text-xs leading-5 text-ink-muted">{generationReason}</p>
            <Button
              type="button"
              className="w-full"
              disabled={!canGenerate}
              leftIcon={<Sparkles className="size-4" aria-hidden="true" />}
            >
              Generate complete-semester timetable
            </Button>
            <p className="text-[11px] leading-4 text-ink-muted">
              Execution progress and solver status appear here only while a run is active. Generation is not available in this release.
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
  children,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  children: string
}) {
  return (
    <label className="flex items-start gap-2 text-xs text-ink">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 accent-maroon-700"
      />
      {children}
    </label>
  )
}

function ReviewStage({
  publishedCount,
  onGoToGeneration,
}: {
  publishedCount: number
  onGoToGeneration: () => void
}) {
  return (
    <Card>
      <EmptyState
        icon={CalendarDays}
        title="No generated timetable to review"
        description="A generated candidate will appear here as a filterable weekly timetable. The current published timetable remains active while no candidate exists."
        action={(
          <Button variant="outline" onClick={onGoToGeneration} leftIcon={<ArrowRight className="size-4" aria-hidden="true" />}>
            Go to generation setup
          </Button>
        )}
      />
      <div className="border-t border-line px-6 py-4">
        <p className="text-xs leading-5 text-ink-muted">
          The review stage will include the master timetable, unscheduled-meeting diagnostics, professor workload, room utilization, and a published-baseline comparison.
          {publishedCount ? ` ${publishedCount} published schedule record${publishedCount === 1 ? '' : 's'} are currently active.` : ''}
        </p>
      </div>
    </Card>
  )
}

function ApprovalStage({
  publishedCount,
  draftCount,
  inventoryLoading,
  inventoryError,
}: {
  publishedCount: number
  draftCount: number
  inventoryLoading: boolean
  inventoryError: string | null
}) {
  const publishedBadge = inventoryLoading
    ? 'Checking'
    : inventoryError
      ? 'Unavailable'
      : publishedCount
        ? 'Active'
        : 'None'
  const publishedTone: BadgeTone = inventoryLoading
    ? 'info'
    : inventoryError
      ? 'neutral'
      : publishedCount
        ? 'success'
        : 'neutral'
  const publishedDetail = inventoryLoading
    ? 'Loading the published timetable…'
    : inventoryError
      ? 'The published timetable could not be loaded.'
      : publishedCount
        ? `${publishedCount} published schedule record${publishedCount === 1 ? '' : 's'} remain active.`
        : 'No published timetable exists for this term yet.'

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="py-4">
          <h2 className="text-sm font-semibold text-ink">Candidate lifecycle</h2>
          <p className="mt-0.5 text-xs leading-5 text-ink-muted">
            A candidate moves through generation, review, approval, and publication. Only the published timetable affects live records.
          </p>
        </CardHeader>
        <ol className="divide-y divide-line">
          <LifecycleRow
            index={1}
            title="Generated candidate"
            badge="Not generated"
            tone="neutral"
            detail="No complete-semester generation has produced a candidate."
          />
          <LifecycleRow
            index={2}
            title="Draft candidate"
            badge="Unavailable"
            tone="neutral"
            detail={`Saving a candidate is not available yet. ${draftCount} existing draft schedule record${draftCount === 1 ? '' : 's'} are preserved and are not selected for replacement by default.`}
          />
          <LifecycleRow
            index={3}
            title="Approved candidate"
            badge="Unavailable"
            tone="neutral"
            detail="Approval actions and authorized approver roles are not available yet."
          />
          <LifecycleRow
            index={4}
            title="Published timetable"
            badge={publishedBadge}
            tone={publishedTone}
            detail={publishedDetail}
          />
        </ol>
      </Card>

      <p className="flex items-start gap-2 text-xs leading-5 text-ink-muted">
        <LockKeyhole className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        The current published timetable remains active while a candidate is reviewed. Nothing on this page overwrites, deletes, or automatically replaces published schedules or drafts.
      </p>
    </div>
  )
}

function LifecycleRow({
  index,
  title,
  badge,
  tone,
  detail,
}: {
  index: number
  title: string
  badge: string
  tone: BadgeTone
  detail: string
}) {
  return (
    <li className="flex items-start gap-3 px-5 py-4">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-line bg-surface-soft text-xs font-semibold text-ink-muted">
        {index}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-ink">{title}</p>
          <Badge tone={tone}>{badge}</Badge>
        </div>
        <p className="mt-1 text-xs leading-5 text-ink-muted">{detail}</p>
      </div>
    </li>
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
