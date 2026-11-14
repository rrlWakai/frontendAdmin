export interface PreviewPlacement {
  meetingId: string
  offeringId: string
  subjectCode: string
  subjectTitle: string
  programCode: string
  yearLevel: string
  sectionCode: string
  professor: string
  room: string
  roomType: string
  day: number
  startTime: string
  endTime: string
  meetingType: 'lecture' | 'laboratory'
  combinedGroup?: string
}

export const developmentScheduleFixture = {
  label: 'DEVELOPMENT FIXTURE',
  solverStatus: 'FEASIBLE' as const,
  requiredOfferings: 3,
  requiredMeetings: 3,
  unscheduledMeetings: [] as string[],
  baseline: [
    {
      meetingId: 'sample-meeting-101',
      day: 1,
      startTime: '08:00',
      endTime: '10:00',
      room: 'LT-201',
    },
    {
      meetingId: 'sample-meeting-201',
      day: 3,
      startTime: '09:00',
      endTime: '11:00',
      room: 'LAB-1',
    },
  ],
  candidate: [
    {
      meetingId: 'sample-meeting-101',
      offeringId: 'sample-offering-101',
      subjectCode: 'CS 101',
      subjectTitle: 'Introduction to Computing',
      programCode: 'BSCS',
      yearLevel: 'Year 1',
      sectionCode: '1A',
      professor: 'Dr. Mara Santos',
      room: 'LT-201',
      roomType: 'Lecture hall',
      day: 1,
      startTime: '08:00',
      endTime: '10:00',
      meetingType: 'lecture',
    },
    {
      meetingId: 'sample-meeting-201',
      offeringId: 'sample-offering-201',
      subjectCode: 'CS 202',
      subjectTitle: 'Programming Laboratory',
      programCode: 'BSCS',
      yearLevel: 'Year 2',
      sectionCode: '2A',
      professor: 'Prof. Luis Reyes',
      room: 'LAB-2',
      roomType: 'Computer laboratory',
      day: 4,
      startTime: '10:00',
      endTime: '12:00',
      meetingType: 'laboratory',
    },
    {
      meetingId: 'sample-meeting-301',
      offeringId: 'sample-offering-301',
      subjectCode: 'IT 110',
      subjectTitle: 'Discrete Mathematics',
      programCode: 'BSIT',
      yearLevel: 'Year 1',
      sectionCode: '1B',
      professor: 'Dr. Ana Cruz',
      room: 'RM-204',
      roomType: 'Classroom',
      day: 2,
      startTime: '13:00',
      endTime: '14:30',
      meetingType: 'lecture',
      combinedGroup: 'Combined class: BSIT 1B + BSIT 1C',
    },
  ] satisfies PreviewPlacement[],
  workload: [
    { professor: 'Dr. Mara Santos', type: 'Full-time', target: 'Institutional policy', actual: '8.0 h', deviation: 'Not evaluated' },
    { professor: 'Prof. Luis Reyes', type: 'Part-time', target: '6.0 h', actual: '4.5 h', deviation: '1.5 h below target (soft objective)' },
    { professor: 'Dr. Ana Cruz', type: 'Full-time', target: 'Institutional policy', actual: '3.0 h', deviation: 'Not evaluated' },
  ],
  roomUtilization: [
    { room: 'LT-201', scheduled: '2.0 h', utilization: 'Sample only' },
    { room: 'LAB-2', scheduled: '2.0 h', utilization: 'Sample only' },
    { room: 'RM-204', scheduled: '1.5 h', utilization: 'Sample only' },
  ],
} as const

export type DevelopmentScheduleFixture = typeof developmentScheduleFixture
