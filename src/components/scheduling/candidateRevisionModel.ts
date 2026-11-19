import type { SchedulerAssignment, SchedulerDiagnostic, SchedulingOptions } from '@/types/scheduling'

export const REVIEW_WEEKDAYS = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
] as const

export type PlacementChange = 'generated' | 'unchanged' | 'changed' | 'new' | 'removed'
export type PlacementEditField = 'day_of_week' | 'start_time' | 'end_time' | 'room_id'

export function timeToMinutes(value: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  if (!match) return Number.NaN

  return Number(match[1]) * 60 + Number(match[2])
}

export function formatTime(value: string): string {
  const minutes = timeToMinutes(value)
  if (!Number.isFinite(minutes)) return value

  const hours = Math.floor(minutes / 60)
  const suffix = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12

  return `${displayHours}:${String(minutes % 60).padStart(2, '0')} ${suffix}`
}

export function durationBetween(start: string, end: string): number {
  return timeToMinutes(end) - timeToMinutes(start)
}

export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return 'Invalid duration'

  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  if (!hours) return `${remainder} min`
  if (!remainder) return `${hours} hr`

  return `${hours} hr ${remainder} min`
}

export function applyPlacementEdit(
  assignment: SchedulerAssignment,
  field: PlacementEditField,
  value: string,
): SchedulerAssignment {
  if (field === 'day_of_week') {
    const day = Number(value)
    if (!Number.isInteger(day) || day < 1 || day > 5) return assignment

    return { ...assignment, day_of_week: day }
  }

  if (field === 'room_id') {
    return { ...assignment, room_id: value.trim() === '' ? null : value }
  }

  if (!/^\d{2}:\d{2}$/.test(value)) return assignment

  const next = { ...assignment, [field]: value }
  const duration = durationBetween(next.start_time, next.end_time)
  next.duration_minutes = Number.isFinite(duration) && duration > 0 ? duration : 0

  return next
}

function hasPlacementChanged(current: SchedulerAssignment, parent: SchedulerAssignment): boolean {
  return current.day_of_week !== parent.day_of_week
    || current.start_time !== parent.start_time
    || current.end_time !== parent.end_time
    || current.room_id !== parent.room_id
}

export function compareAssignments(
  assignments: SchedulerAssignment[],
  parentAssignments: SchedulerAssignment[] | null,
): { changes: Map<string, PlacementChange>; removed: SchedulerAssignment[] } {
  const changes = new Map<string, PlacementChange>()

  if (parentAssignments === null) {
    assignments.forEach((assignment) => changes.set(assignment.meeting_instance_id, 'generated'))
    return { changes, removed: [] }
  }

  const parentById = new Map(parentAssignments.map((assignment) => [assignment.meeting_instance_id, assignment]))
  const currentIds = new Set(assignments.map((assignment) => assignment.meeting_instance_id))

  assignments.forEach((assignment) => {
    const parent = parentById.get(assignment.meeting_instance_id)
    if (!parent) changes.set(assignment.meeting_instance_id, 'new')
    else changes.set(assignment.meeting_instance_id, hasPlacementChanged(assignment, parent) ? 'changed' : 'unchanged')
  })

  return {
    changes,
    removed: parentAssignments.filter((assignment) => !currentIds.has(assignment.meeting_instance_id)),
  }
}

export function assignmentSearchIds(assignment: SchedulerAssignment): Set<string> {
  return new Set([
    assignment.meeting_instance_id,
    assignment.source_requirement_id,
    assignment.professor_id,
    ...(assignment.room_id ? [assignment.room_id] : []),
    ...assignment.subject_offering_ids,
    ...assignment.section_ids,
    ...assignment.professor_assignments.flatMap((professorAssignment) => [
      professorAssignment.subject_offering_id,
      professorAssignment.faculty_assignment_id,
    ]),
  ])
}

export function diagnosticsForAssignment(
  diagnostics: SchedulerDiagnostic[],
  validationErrors: string[],
  assignment: SchedulerAssignment,
): { diagnostics: SchedulerDiagnostic[]; errors: string[] } {
  const ids = assignmentSearchIds(assignment)
  const matchesId = (value: string | null | undefined): boolean => Boolean(value && ids.has(value))

  return {
    diagnostics: diagnostics.filter((diagnostic) => (
      diagnostic.meeting_requirement_ids.some(matchesId)
      || diagnostic.related_entity_ids.some(matchesId)
    )),
    errors: validationErrors.filter((error) => (
      [...ids].some((id) => error.includes(id))
    )),
  }
}

export function assignmentLabels(assignment: SchedulerAssignment, options: SchedulingOptions | null) {
  const firstOfferingId = assignment.subject_offering_ids[0]
  const firstSectionId = assignment.section_ids[0]
  const offering = options?.offerings.find((item) => String(item.id) === firstOfferingId)
  const section = options?.sections.find((item) => String(item.id) === firstSectionId)
  const professor = options?.professors.find((item) => String(item.id) === assignment.professor_id)
  const room = options?.rooms.find((item) => String(item.id) === assignment.room_id)
  const program = options?.programs.find((item) => item.id === section?.program_id)

  return {
    subject: offering ? `${offering.subject.code} · ${offering.subject.title}` : `Offering ${firstOfferingId ?? 'unknown'}`,
    section: section
      ? `${program?.code ?? `Program ${section.program_id}`} · ${section.name ?? section.code}`
      : `Section ${firstSectionId ?? 'unknown'}`,
    professor: professor?.name ?? `Professor ${assignment.professor_id}`,
    room: room ? `${room.code}${room.building ? ` · ${room.building}` : ''}` : assignment.room_id ?? 'No room assigned',
  }
}
