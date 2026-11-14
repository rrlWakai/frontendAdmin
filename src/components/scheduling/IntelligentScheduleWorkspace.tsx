import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Check, CircleHelp, Clock3, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { Card, CardBody, CardHeader } from '@/components/common/Card'
import { DevelopmentCandidatePreview } from '@/components/scheduling/DevelopmentCandidatePreview'
import { fetchProfessor } from '@/services/api/faculty'
import { fetchOfferingFacultyAssignments, fetchSchedules } from '@/services/api/scheduling'
import type { AcademicTerm } from '@/types/academic'
import type {
  ScheduleConflictRecord,
  ScheduleRecord,
  SchedulingOptions,
} from '@/types/scheduling'
import { getApiErrorMessage } from '@/utils/apiError'

type ReadinessState = 'ready' | 'warning' | 'blocked' | 'info' | 'checking'

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
}

interface IntelligentScheduleWorkspaceProps {
  termId: number | null
  term: AcademicTerm | undefined
  options: SchedulingOptions | null
  optionsLoading: boolean
  conflicts: ScheduleConflictRecord[]
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

export function IntelligentScheduleWorkspace({
  termId,
  term,
  options,
  optionsLoading,
  conflicts,
}: IntelligentScheduleWorkspaceProps) {
  const [inventory, setInventory] = useState<ScheduleRecord[] | null>(null)
  const [inventoryLoading, setInventoryLoading] = useState(false)
  const [inventoryError, setInventoryError] = useState<string | null>(null)
  const [inventoryVersion, setInventoryVersion] = useState(0)
  const [assignmentReadiness, setAssignmentReadiness] = useState<AssignmentReadiness | null>(null)
  const [assignmentLoading, setAssignmentLoading] = useState(false)
  const [checkedOfferingCount, setCheckedOfferingCount] = useState(0)
  const [assignmentError, setAssignmentError] = useState<string | null>(null)
  const [replacementDraftIds, setReplacementDraftIds] = useState<number[]>([])
  const [samplePreviewOpen, setSamplePreviewOpen] = useState(false)
  const [keepDay, setKeepDay] = useState(true)
  const [keepStartTime, setKeepStartTime] = useState(true)
  const [keepRoom, setKeepRoom] = useState(true)
  const [minimalChangeWeight, setMinimalChangeWeight] = useState('')

  const offeringSignature = useMemo(
    () => options?.offerings.map((offering) => offering.id).sort((left, right) => left - right).join(',') ?? '',
    [options],
  )
  const hasCurrentAssignmentCheck = Boolean(
    assignmentReadiness && assignmentReadiness.checkedSignature === offeringSignature,
  )

  useEffect(() => {
    let active = true
    if (!termId) return () => { active = false }

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

    for (let offset = 0; offset < professorIds.length; offset += batchSize) {
      const batch = professorIds.slice(offset, offset + batchSize)
      const results = await Promise.allSettled(batch.map((id) => fetchProfessor(id)))
      results.forEach((result) => {
        if (result.status === 'rejected') {
          profileFailures += 1
          return
        }
        profilesChecked += 1
        if (result.value.availability.some((window) => window.academic_term_id === termId)) {
          professorsWithTermWindows += 1
        } else {
          professorsWithoutTermWindows += 1
        }
        if (result.value.employment_type === 'full_time') fullTimeProfessors += 1
        if (result.value.employment_type === 'part_time') partTimeProfessors += 1
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

  const offeringsState: ReadinessState = optionsLoading
    ? 'checking'
    : !options
      ? 'blocked'
      : configuredOfferings.length
        ? 'warning'
        : 'blocked'
  const assignmentState: ReadinessState = assignmentLoading
    ? 'checking'
    : !hasCurrentAssignmentCheck
      ? 'blocked'
      : assignmentReadiness?.missing || assignmentReadiness?.multiple || assignmentReadiness?.unavailable
        ? 'blocked'
        : 'ready'
  const blockers = [
    !term ? 'Select an active or planned academic term.' : null,
    offeringsState === 'blocked' ? 'No configured offerings are available for this term.' : null,
    !hasCurrentAssignmentCheck ? 'Check active professor assignments for every configured offering.' : null,
    assignmentState === 'blocked' && hasCurrentAssignmentCheck ? 'Resolve missing, ambiguous, or unreadable offering assignments.' : null,
    hasCurrentAssignmentCheck && assignmentReadiness?.profileFailures ? 'Resolve unreadable professor profiles before availability can be validated.' : null,
    !inventory || inventoryLoading ? 'Load the complete published and draft schedule inventory.' : null,
    'The current scheduling options API does not certify the complete required-offering set; returned open offerings cannot prove semester coverage.',
    configuredOfferings.length > 0 ? 'Approved meeting plans and occurrence counts are not exposed by the current API.' : null,
    'Institutional operating days, hours, and valid start boundaries are not exposed by the current API.',
    'Term-associated full-time policies and authorized exceptions are not exposed by the current API.',
    'Part-time actual-hour workload targets are not exposed by the current API.',
    availableRooms.length === 0 ? 'No available rooms are listed for this term.' : null,
    invalidRooms.length ? `${invalidRooms.length} available room record${invalidRooms.length === 1 ? ' has' : 's have'} invalid capacity or room type data.` : null,
  ].filter((item): item is string => Boolean(item))

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

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-maroon-700">Intelligent AI scheduling</p>
            <h2 className="mt-1 text-lg font-semibold text-ink">Complete-semester scheduling workspace</h2>
            <p className="mt-1 text-xs text-ink-muted">{termName(term)} · All configured programs, year levels, sections, and offerings</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={publishedSchedules.length ? 'success' : 'neutral'}>
              {inventoryLoading ? 'Loading timetable' : publishedSchedules.length ? 'Published baseline exists' : inventory ? 'No published baseline' : 'Baseline unverified'}
            </Badge>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setInventoryVersion((value) => value + 1)}
              disabled={inventoryLoading}
              leftIcon={<RefreshCw className={`size-4 ${inventoryLoading ? 'animate-spin' : ''}`} aria-hidden="true" />}
            >
              Refresh inventory
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <OverviewMetric label="Programs in open offerings" value={optionsLoading ? '—' : `${programCount}`} />
            <OverviewMetric label="Year levels in open offerings" value={optionsLoading ? '—' : `${yearLevelCount}`} />
            <OverviewMetric label="Sections in open offerings" value={optionsLoading ? '—' : `${sectionCount}`} />
            <OverviewMetric label="Open offerings returned" value={optionsLoading ? '—' : `${configuredOfferings.length}`} />
            <OverviewMetric label="Required meetings" value="Not available" detail="Meeting-plan data is not exposed" />
            <OverviewMetric label="Assigned professors" value={hasCurrentAssignmentCheck && assignmentReadiness ? `${assignmentReadiness.distinctProfessors}` : 'Not checked'} />
            <OverviewMetric label="Available rooms" value={optionsLoading ? '—' : `${availableRooms.length}`} detail={invalidRooms.length ? `${invalidRooms.length} with invalid capacity/type` : 'Room suitability needs meeting plans'} />
            <OverviewMetric label="Prior generation" value="Not available" detail="No generation history API" />
          </div>
          <p className="mt-4 flex items-start gap-2 border-t border-line pt-4 text-xs leading-5 text-ink-muted">
            <CircleHelp className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            The current scheduling options API returns open offerings for manual scheduling; it does not certify the complete required-offering set. CCSync has no authoritative curriculum model, so this page does not infer or add subjects.
          </p>
          <p className="mt-2 text-[11px] leading-4 text-ink-muted">
            This inventory is a live paginated API read, not an immutable generation snapshot; concurrent changes must be revalidated by the future Laravel integration.
          </p>
        </CardBody>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
        <Card>
          <CardHeader className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-ink">Scheduling readiness</h3>
              <p className="mt-1 text-xs text-ink-muted">Blocking inputs are distinguished from warnings and informational gaps.</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              isLoading={assignmentLoading}
              disabled={optionsLoading || !configuredOfferings.length}
              onClick={() => void handleCheckAssignments()}
            >
              {hasCurrentAssignmentCheck ? 'Recheck assignments' : 'Check assignments'}
            </Button>
          </CardHeader>
          <CardBody className="space-y-2">
            <ReadinessItem
              state={term ? 'ready' : 'blocked'}
              title="Academic term"
              detail={term ? `${termName(term)} · ${term.status}` : 'Select an active or planned term.'}
              link={{ to: '/academic/terms', label: 'Academic terms' }}
            />
            <ReadinessItem
              state={offeringsState}
              title="Programs, year levels, sections, and configured offerings"
              detail={optionsLoading ? 'Loading existing scheduling options…' : `${programCount} programs · ${yearLevelCount} year levels · ${sectionCount} sections represented in ${configuredOfferings.length} open offerings. This API response cannot confirm complete semester coverage.`}
              link={{ to: '/academic/subject-offerings', label: 'Subject offerings' }}
            />
            <ReadinessItem
              state="blocked"
              title="Lecture and laboratory meeting plans"
              detail="The current API does not expose offering-level meeting frequency, duration, or approved room requirements. Subject catalog hours are not treated as a meeting plan."
              link={{ to: '/academic/subject-offerings', label: 'Review offerings' }}
            />
            <ReadinessItem
              state={assignmentLoading ? 'checking' : !hasCurrentAssignmentCheck ? 'blocked' : assignmentState}
              title="One distinct assigned professor per ordinary offering"
              detail={assignmentLoading
                ? `Checking active assignment records: ${checkedOfferingCount} of ${configuredOfferings.length} open offerings.`
                : hasCurrentAssignmentCheck && assignmentReadiness
                  ? `${assignmentReadiness.checkedOfferings} open offerings checked · ${assignmentReadiness.missing} unassigned · ${assignmentReadiness.multiple} with multiple distinct professors · ${assignmentReadiness.unavailable} unreadable.`
                  : 'Assignment completeness has not been checked for the open offerings returned by the API. The AI workflow does not select or redistribute professors.'}
              link={{ to: '/academic/subject-offerings', label: 'Review assignments' }}
            />
            {assignmentError ? (
              <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{assignmentError}</p>
            ) : null}
            <ReadinessItem
              state={hasCurrentAssignmentCheck && assignmentReadiness?.profileFailures === 0 ? 'info' : 'warning'}
              title="Faculty availability and employment type"
              detail={hasCurrentAssignmentCheck && assignmentReadiness
                ? `${assignmentReadiness.profilesChecked} profiles checked (${assignmentReadiness.fullTimeProfessors} full-time · ${assignmentReadiness.partTimeProfessors} part-time) · ${assignmentReadiness.professorsWithTermWindows} with term windows · ${assignmentReadiness.professorsWithoutTermWindows} with no term windows (unrestricted under the approved rule) · ${assignmentReadiness.profileFailures} unreadable. Date-specific exceptions are not represented.`
                : 'Existing faculty profiles expose recurring term availability and employment type, but those records have not been loaded.'}
              link={{ to: '/faculty', label: 'Faculty records' }}
            />
            <ReadinessItem
              state="blocked"
              title="Full-time workday policy and exceptions"
              detail="Monday–Wednesday is the approved standard, but the term-associated policy and authorized exception data are not available through the current scheduling APIs."
            />
            <ReadinessItem
              state="blocked"
              title="Part-time weekly workload targets"
              detail="Targets must be in actual teaching hours and remain soft objectives. No term-associated per-professor target is exposed; missing targets are an input gap, not a hard workload conflict."
              link={{ to: '/faculty', label: 'Faculty records' }}
            />
            <ReadinessItem
              state={availableRooms.length && invalidRooms.length === 0 ? 'warning' : 'blocked'}
              title="Room configuration and suitability"
              detail={optionsLoading
                ? 'Loading room inventory…'
                : `${availableRooms.length} rooms marked available${invalidRooms.length ? ` · ${invalidRooms.length} with invalid capacity or room type` : ''}. Capacity and required room type cannot be checked without meeting plans.`}
              link={{ to: '/rooms', label: 'Room inventory' }}
            />
            <ReadinessItem
              state="warning"
              title="Explicit combined-class groups"
              detail="No combined-class configuration is exposed by the current scheduling APIs. Groups are never inferred from matching subject or section names."
            />
            <ReadinessItem
              state={inventoryLoading ? 'checking' : inventoryError || !inventory ? 'blocked' : 'ready'}
              title="Published baseline and existing drafts"
              detail={inventoryLoading
                ? 'Loading all schedule pages for the selected term…'
                : inventoryError
                  ? inventoryError
                  : `${publishedSchedules.length} published schedule records remain active as the comparison baseline · ${draftSchedules.length} draft records are preserved unless explicitly selected below.`}
            />
            {activeConflicts.length ? (
              <ReadinessItem
                state="warning"
                title="Existing manual schedule conflicts"
                detail={`${activeConflicts.length} open conflict${activeConflicts.length === 1 ? '' : 's'} are present in the current conflict register. They describe the active/manual timetable, not a new candidate.`}
              />
            ) : null}
          </CardBody>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-ink">Generation configuration</h3>
              <p className="mt-1 text-xs text-ink-muted">Complete-term scope only; no professor assignment controls are provided.</p>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="rounded-lg border border-maroon-100 bg-maroon-50 p-3">
                <p className="text-sm font-semibold text-maroon-900">Entire academic term</p>
                <p className="mt-1 text-xs leading-5 text-maroon-900/80">All configured programs, year levels, sections, and subject offerings. Individual filters are for review only.</p>
              </div>
              <ConfigUnavailable label="Operating days, hours, and valid start boundaries" detail="Institution-configured and term-associated values are not available." />
              <ConfigUnavailable label="Meeting plans and room requirements" detail="Frequency, duration, meeting type, and required room type are not available." />
              <ConfigUnavailable label="Solver time limit and execution settings" detail="No connected generation API exposes supported runtime settings." />
              <fieldset className="space-y-2">
                <legend className="text-xs font-semibold text-ink">Minimal-change preferences</legend>
                <PreferenceCheckbox checked={keepDay} onChange={setKeepDay}>Prefer the previous meeting day</PreferenceCheckbox>
                <PreferenceCheckbox checked={keepStartTime} onChange={setKeepStartTime}>Prefer the previous start time</PreferenceCheckbox>
                <PreferenceCheckbox checked={keepRoom} onChange={setKeepRoom}>Prefer the previous room</PreferenceCheckbox>
                <label className="block text-xs text-ink-muted">
                  Minimal-change objective weight
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={minimalChangeWeight}
                    onChange={(event) => setMinimalChangeWeight(event.target.value)}
                    placeholder="Unset — no approved default"
                    className="mt-1 h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon-600"
                    aria-describedby="minimal-change-weight-help"
                  />
                </label>
                <p id="minimal-change-weight-help" className="text-[11px] leading-4 text-ink-muted">
                  Preferences are local UI state only; no weight is preselected or saved. The backend does not yet accept these settings.
                </p>
                <p className="text-[11px] leading-4 text-ink-muted">Previous placements are comparison context, not hard constraints. Hard constraints and fixed professor assignments always take priority.</p>
              </fieldset>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="font-semibold text-ink">Draft replacement scope</h3>
              <p className="mt-1 text-xs text-ink-muted">No draft is selected by default. Published schedules are never selectable for replacement here.</p>
            </CardHeader>
            <CardBody>
              {inventoryLoading ? (
                <p className="flex items-center gap-2 text-xs text-ink-muted"><RefreshCw className="size-4 animate-spin" aria-hidden="true" /> Loading draft schedule records…</p>
              ) : inventoryError ? (
                <p role="alert" className="text-xs text-red-700">{inventoryError}</p>
              ) : draftSchedules.length ? (
                <div className="space-y-2">
                  {draftSchedules.map((schedule) => (
                    <label key={schedule.id} className="flex items-start gap-2 rounded-lg border border-line p-2.5 text-xs">
                      <input
                        type="checkbox"
                        checked={replacementDraftIds.includes(schedule.id)}
                        onChange={() => toggleReplacementDraft(schedule.id)}
                        className="mt-0.5 accent-maroon-700"
                      />
                      <span className="min-w-0">
                        <span className="block font-semibold text-ink">{schedule.offering.subject.code} · {schedule.offering.section.code} · Draft #{schedule.id}</span>
                        <span className="mt-0.5 block text-ink-muted">{formatScheduleDay(schedule.day_of_week)} · {schedule.start_time}–{schedule.end_time} · {schedule.offering.section.program.code}</span>
                      </span>
                    </label>
                  ))}
                  <p className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] leading-4 text-amber-950">
                    {selectedReplacementDraftCount} draft{selectedReplacementDraftCount === 1 ? '' : 's'} explicitly selected for a future replacement workflow. This selection is local only; it does not delete, overwrite, or constrain any schedule.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-ink-muted">{inventory ? 'No existing draft schedules for this term.' : 'Drafts cannot be reviewed until the complete schedule inventory loads.'}</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="font-semibold text-ink">Generation execution</h3>
              <p className="mt-1 text-xs text-ink-muted">No live solver request or progress stream is connected.</p>
            </CardHeader>
            <CardBody className="space-y-3">
              <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950">
                <Clock3 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <p>{blockers.length} readiness blocker{blockers.length === 1 ? '' : 's'} remain. Candidate generation is unavailable until the missing configuration and Laravel integration are implemented.</p>
              </div>
              <ul className="list-inside list-disc space-y-1 text-xs text-ink-muted">
                {blockers.slice(0, 5).map((blocker) => <li key={blocker}>{blocker}</li>)}
              </ul>
              {blockers.length > 5 ? <p className="text-[11px] text-ink-muted">And {blockers.length - 5} additional blocker{blockers.length - 5 === 1 ? '' : 's'}.</p> : null}
              <Button type="button" disabled leftIcon={<Sparkles className="size-4" aria-hidden="true" />}>
                Generate complete-term candidate
              </Button>
              <p className="text-[11px] leading-4 text-ink-muted">This disabled action is not wired to Python or a Laravel endpoint. There is no generation identifier, live progress, cancellation, persistence, approval, or publication in this milestone.</p>
            </CardBody>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-ink">Candidate review and publication</h3>
            <p className="mt-1 text-xs text-ink-muted">The current published timetable remains active and unchanged throughout candidate preparation and review.</p>
          </div>
          <Badge tone="neutral">No live candidate</Badge>
        </CardHeader>
        <CardBody className="grid gap-3 sm:grid-cols-3">
          <LifecycleSummary title="Generated candidate" detail="No generation API is connected." tone="info" />
          <LifecycleSummary title="Draft / approved candidate" detail="Persistence and exact approver-role mapping are not implemented." tone="warning" />
          <LifecycleSummary title="Published timetable" detail={`${publishedSchedules.length} published schedule records remain unchanged.`} tone="success" />
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-900">Isolated frontend fixture</p>
            <h3 className="mt-1 font-semibold text-ink">Sample results and baseline comparison</h3>
            <p className="mt-1 text-xs text-ink-muted">Use the synthetic preview to inspect timetable filters, variable meeting durations, retained/changed metrics, and lifecycle presentation.</p>
          </div>
          <Button type="button" variant={samplePreviewOpen ? 'outline' : 'secondary'} size="sm" onClick={() => setSamplePreviewOpen((open) => !open)}>
            {samplePreviewOpen ? 'Hide sample preview' : 'View sample preview'}
          </Button>
        </CardHeader>
        {samplePreviewOpen ? (
          <CardBody>
            <DevelopmentCandidatePreview />
          </CardBody>
        ) : null}
      </Card>

      <p className="flex items-start gap-2 text-xs leading-5 text-ink-muted">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        The AI workflow does not assign or redistribute professors. Existing published placements can be re-optimized by the eventual solver; they are not fixed by default. No action on this page changes active schedules.
      </p>
    </div>
  )
}

function OverviewMetric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface-soft p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums text-ink">{value}</p>
      {detail ? <p className="mt-1 text-[11px] leading-4 text-ink-muted">{detail}</p> : null}
    </div>
  )
}

function ReadinessItem({
  state,
  title,
  detail,
  link,
}: {
  state: ReadinessState
  title: string
  detail: string
  link?: { to: string; label: string }
}) {
  const tone = state === 'ready' ? 'success' : state === 'warning' ? 'warning' : state === 'blocked' ? 'danger' : state === 'checking' ? 'info' : 'neutral'
  const statusLabel = state === 'ready' ? 'Ready' : state === 'warning' ? 'Warning' : state === 'blocked' ? 'Blocking' : state === 'checking' ? 'Checking' : 'Info'
  const Icon = state === 'ready' ? Check : state === 'checking' ? RefreshCw : state === 'info' ? CircleHelp : AlertTriangle

  return (
    <div className="rounded-lg border border-line p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Icon className={`size-4 shrink-0 ${state === 'checking' ? 'animate-spin' : ''}`} aria-hidden="true" />
        <p className="min-w-0 flex-1 text-sm font-semibold text-ink">{title}</p>
        <Badge tone={tone}>{statusLabel}</Badge>
      </div>
      <p className="mt-1.5 text-xs leading-5 text-ink-muted">{detail}</p>
      {link ? <Link className="mt-2 inline-flex text-xs font-semibold text-maroon-700 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon-600" to={link.to}>{link.label}</Link> : null}
    </div>
  )
}

function ConfigUnavailable({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-line bg-surface-soft p-3">
      <div><p className="text-xs font-semibold text-ink">{label}</p><p className="mt-1 text-[11px] leading-4 text-ink-muted">{detail}</p></div>
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
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-0.5 accent-maroon-700" />
      {children}
    </label>
  )
}

function LifecycleSummary({
  title,
  detail,
  tone,
}: {
  title: string
  detail: string
  tone: 'info' | 'warning' | 'success'
}) {
  const label = tone === 'info' ? 'Not generated' : tone === 'warning' ? 'Unavailable' : 'Protected'
  return (
    <div className="rounded-lg border border-line p-3">
      <Badge tone={tone}>{label}</Badge>
      <p className="mt-2 text-sm font-semibold text-ink">{title}</p>
      <p className="mt-1 text-xs leading-5 text-ink-muted">{detail}</p>
    </div>
  )
}
