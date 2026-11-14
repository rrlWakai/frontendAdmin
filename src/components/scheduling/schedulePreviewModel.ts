import type { PreviewPlacement } from '@/components/scheduling/developmentScheduleFixture'

export interface BaselinePlacement {
  meetingId: string
  day: number
  startTime: string
  endTime: string
  room: string
}

export interface PlacementComparison {
  placement: PreviewPlacement
  previous: BaselinePlacement | undefined
  changes: string[]
  kind: 'retained' | 'changed' | 'new'
}

export interface PlacementFilters {
  program?: string
  yearLevel?: string
  section?: string
  professor?: string
  room?: string
}

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

export function durationMinutes(startTime: string, endTime: string): number {
  return timeToMinutes(endTime) - timeToMinutes(startTime)
}

export function filterPreviewPlacements(
  placements: readonly PreviewPlacement[],
  filters: PlacementFilters,
): PreviewPlacement[] {
  return placements.filter((placement) => (
    (!filters.program || placement.programCode === filters.program)
    && (!filters.yearLevel || placement.yearLevel === filters.yearLevel)
    && (!filters.section || placement.sectionCode === filters.section)
    && (!filters.professor || placement.professor === filters.professor)
    && (!filters.room || placement.room === filters.room)
  ))
}

export function comparePlacements(
  baseline: readonly BaselinePlacement[],
  candidate: readonly PreviewPlacement[],
): PlacementComparison[] {
  const previousByMeeting = new Map(baseline.map((placement) => [placement.meetingId, placement]))

  return candidate.map((placement) => {
    const previous = previousByMeeting.get(placement.meetingId)
    if (!previous) return { placement, previous, changes: [], kind: 'new' }

    const changes: string[] = []
    if (previous.day !== placement.day) changes.push(`day: ${days[previous.day - 1]} → ${days[placement.day - 1]}`)
    if (previous.startTime !== placement.startTime) changes.push(`start: ${previous.startTime} → ${placement.startTime}`)
    if (previous.endTime !== placement.endTime) changes.push(`end: ${previous.endTime} → ${placement.endTime}`)
    if (previous.room !== placement.room) changes.push(`room: ${previous.room} → ${placement.room}`)

    return {
      placement,
      previous,
      changes,
      kind: changes.length ? 'changed' : 'retained',
    }
  })
}

export function isCompleteCandidate(
  candidate: readonly PreviewPlacement[],
  requiredOfferings: number,
  requiredMeetings: number,
  unscheduledMeetings: readonly string[],
): boolean {
  const scheduledOfferingCount = new Set(candidate.map((placement) => placement.offeringId)).size
  return (
    scheduledOfferingCount === requiredOfferings
    && candidate.length === requiredMeetings
    && unscheduledMeetings.length === 0
  )
}
