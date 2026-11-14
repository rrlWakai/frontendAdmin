import { describe, expect, it } from 'vitest'
import { developmentScheduleFixture } from '@/components/scheduling/developmentScheduleFixture'
import {
  comparePlacements,
  durationMinutes,
  filterPreviewPlacements,
  isCompleteCandidate,
} from '@/components/scheduling/schedulePreviewModel'

describe('schedule preview model', () => {
  it('distinguishes retained, changed, and new sample placements', () => {
    const comparison = comparePlacements(
      developmentScheduleFixture.baseline,
      developmentScheduleFixture.candidate,
    )

    expect(comparison.map((item) => item.kind)).toEqual(['retained', 'changed', 'new'])
    expect(comparison[1].changes).toEqual([
      'day: Wednesday → Thursday',
      'start: 09:00 → 10:00',
      'end: 11:00 → 12:00',
      'room: LAB-1 → LAB-2',
    ])
  })

  it('accepts only a complete candidate with no unscheduled meetings', () => {
    expect(isCompleteCandidate(
      developmentScheduleFixture.candidate,
      developmentScheduleFixture.requiredOfferings,
      developmentScheduleFixture.requiredMeetings,
      developmentScheduleFixture.unscheduledMeetings,
    )).toBe(true)
    expect(isCompleteCandidate(
      developmentScheduleFixture.candidate.slice(0, 2),
      developmentScheduleFixture.requiredOfferings,
      developmentScheduleFixture.requiredMeetings,
      developmentScheduleFixture.unscheduledMeetings,
    )).toBe(false)
    expect(isCompleteCandidate(
      developmentScheduleFixture.candidate,
      developmentScheduleFixture.requiredOfferings,
      developmentScheduleFixture.requiredMeetings,
      ['sample-meeting-unassigned'],
    )).toBe(false)
  })

  it('filters sample placements by section attributes', () => {
    const filtered = filterPreviewPlacements(developmentScheduleFixture.candidate, {
      program: 'BSCS',
      yearLevel: 'Year 2',
      section: '2A',
      professor: 'Prof. Luis Reyes',
      room: 'LAB-2',
    })

    expect(filtered.map((placement) => placement.meetingId)).toEqual(['sample-meeting-201'])
  })

  it('uses elapsed clock time for variable meeting durations', () => {
    expect(durationMinutes('08:15', '09:45')).toBe(90)
  })
})
