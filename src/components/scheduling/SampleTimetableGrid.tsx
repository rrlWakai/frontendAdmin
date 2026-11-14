import { useMemo, useState } from 'react'
import type { PreviewPlacement } from '@/components/scheduling/developmentScheduleFixture'
import { Card, CardBody, CardHeader } from '@/components/common/Card'
import { durationMinutes, filterPreviewPlacements, timeToMinutes } from '@/components/scheduling/schedulePreviewModel'

const days = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 7, label: 'Sunday' },
]

function formatTime(value: number): string {
  const hours = Math.floor(value / 60)
  const minutes = value % 60
  const suffix = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12

  return `${displayHours}:${String(minutes).padStart(2, '0')} ${suffix}`
}

interface SampleTimetableGridProps {
  placements: readonly PreviewPlacement[]
}

export function SampleTimetableGrid({ placements }: SampleTimetableGridProps) {
  const [program, setProgram] = useState('')
  const [yearLevel, setYearLevel] = useState('')
  const [section, setSection] = useState('')
  const [professor, setProfessor] = useState('')
  const [room, setRoom] = useState('')
  const [selected, setSelected] = useState<PreviewPlacement | null>(null)

  const filtered = useMemo(
    () => filterPreviewPlacements(placements, { program, yearLevel, section, professor, room }),
    [placements, program, professor, room, section, yearLevel],
  )

  const programs = [...new Set(placements.map((placement) => placement.programCode))].sort()
  const yearLevels = [...new Set(placements.map((placement) => placement.yearLevel))].sort()
  const sections = [...new Set(placements.map((placement) => placement.sectionCode))].sort()
  const professors = [...new Set(placements.map((placement) => placement.professor))].sort()
  const rooms = [...new Set(placements.map((placement) => placement.room))].sort()
  const firstMeeting = Math.min(...filtered.map((placement) => timeToMinutes(placement.startTime)))
  const lastMeeting = Math.max(...filtered.map((placement) => timeToMinutes(placement.endTime)))
  const startBoundary = Number.isFinite(firstMeeting) ? Math.floor(firstMeeting / 60) * 60 : 8 * 60
  const endBoundary = Number.isFinite(lastMeeting) ? Math.ceil(lastMeeting / 60) * 60 : startBoundary + 60
  const pixelsPerMinute = 1.15
  const timelineHeight = (endBoundary - startBoundary) * pixelsPerMinute
  const hourMarks = Array.from(
    { length: Math.floor((endBoundary - startBoundary) / 60) + 1 },
    (_, index) => startBoundary + index * 60,
  )
  const selectClass = 'h-10 min-w-32 rounded-lg border border-line bg-white px-2.5 text-xs text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon-600'

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-ink">Master timetable preview</h3>
            <p className="mt-1 text-xs text-ink-muted">Variable meeting durations are positioned from their actual start and end times.</p>
          </div>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
            Sample data
          </span>
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5" aria-label="Sample timetable filters">
          <label className="text-xs font-medium text-ink-muted">
            Program
            <select className={`${selectClass} mt-1 w-full`} value={program} onChange={(event) => setProgram(event.target.value)}>
              <option value="">All programs</option>
              {programs.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-ink-muted">
            Year level
            <select className={`${selectClass} mt-1 w-full`} value={yearLevel} onChange={(event) => setYearLevel(event.target.value)}>
              <option value="">All year levels</option>
              {yearLevels.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-ink-muted">
            Section
            <select className={`${selectClass} mt-1 w-full`} value={section} onChange={(event) => setSection(event.target.value)}>
              <option value="">All sections</option>
              {sections.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-ink-muted">
            Professor
            <select className={`${selectClass} mt-1 w-full`} value={professor} onChange={(event) => setProfessor(event.target.value)}>
              <option value="">All professors</option>
              {professors.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-ink-muted">
            Room
            <select className={`${selectClass} mt-1 w-full`} value={room} onChange={(event) => setRoom(event.target.value)}>
              <option value="">All rooms</option>
              {rooms.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
        </div>

        <div className="overflow-x-auto rounded-lg border border-line">
          <div className="min-w-[900px]">
            <div className="grid border-b border-line bg-surface-soft" style={{ gridTemplateColumns: '58px repeat(7, minmax(110px, 1fr))' }}>
              <div className="border-r border-line px-2 py-3 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Time</div>
              {days.map((day) => (
                <div key={day.value} className="border-r border-line px-2 py-3 text-xs font-semibold text-ink last:border-r-0">
                  {day.label}
                </div>
              ))}
            </div>
            <div className="grid" style={{ gridTemplateColumns: '58px repeat(7, minmax(110px, 1fr))' }}>
              <div className="relative border-r border-line" style={{ height: timelineHeight }}>
                {hourMarks.map((time) => (
                  <span
                    key={time}
                    className="absolute right-1 z-10 -translate-y-1/2 bg-white px-0.5 text-[10px] tabular-nums text-ink-muted"
                    style={{ top: (time - startBoundary) * pixelsPerMinute }}
                  >
                    {formatTime(time)}
                  </span>
                ))}
              </div>
              {days.map((day) => (
                <div key={day.value} className="relative border-r border-line last:border-r-0" style={{ height: timelineHeight }}>
                  {hourMarks.map((time) => (
                    <div
                      key={time}
                      className="pointer-events-none absolute inset-x-0 border-t border-dashed border-line"
                      style={{ top: (time - startBoundary) * pixelsPerMinute }}
                      aria-hidden="true"
                    />
                  ))}
                  {filtered.filter((placement) => placement.day === day.value).map((placement) => {
                    const start = timeToMinutes(placement.startTime)
                    const end = timeToMinutes(placement.endTime)
                    const isLab = placement.meetingType === 'laboratory'
                    const label = `${placement.subjectCode}, ${placement.subjectTitle}, ${placement.sectionCode}, ${placement.professor}, ${placement.room}, ${formatTime(start)} to ${formatTime(end)}, ${placement.meetingType}${placement.combinedGroup ? `, ${placement.combinedGroup}` : ''}`

                    return (
                      <button
                        key={placement.meetingId}
                        type="button"
                        onClick={() => setSelected(placement)}
                        aria-label={label}
                        title={label}
                        className={`absolute inset-x-1 z-10 overflow-hidden rounded-md border p-1.5 text-left text-[10px] leading-tight shadow-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-maroon-700 ${isLab ? 'border-blue-300 bg-blue-50 text-blue-950' : 'border-maroon-200 bg-maroon-50 text-maroon-950'}`}
                        style={{
                          top: (start - startBoundary) * pixelsPerMinute + 2,
                          height: Math.max(durationMinutes(placement.startTime, placement.endTime) * pixelsPerMinute - 4, 28),
                        }}
                      >
                        <span className="block truncate font-bold">{placement.subjectCode} · {placement.sectionCode}</span>
                        <span className="block truncate">{formatTime(start)}–{formatTime(end)} · {isLab ? 'Laboratory' : 'Lecture'}</span>
                        <span className="hidden truncate sm:block">{placement.room} · {placement.professor}</span>
                        {placement.combinedGroup ? <span className="mt-0.5 block truncate font-semibold">Combined class</span> : null}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-xs text-ink-muted" aria-label="Meeting type legend">
          <span className="flex items-center gap-2"><span className="size-3 rounded-sm border border-maroon-200 bg-maroon-50" aria-hidden="true" /> Lecture</span>
          <span className="flex items-center gap-2"><span className="size-3 rounded-sm border border-blue-300 bg-blue-50" aria-hidden="true" /> Laboratory</span>
          <span className="flex items-center gap-2"><span className="size-3 rounded-sm border border-dashed border-ink-muted" aria-hidden="true" /> Combined group label</span>
        </div>

        {filtered.length === 0 ? (
          <p role="status" className="text-sm text-ink-muted">No sample meetings match these filters.</p>
        ) : null}
        {selected ? (
          <div className="rounded-lg border border-line bg-surface-soft p-4" role="status">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">{selected.subjectCode} · {selected.subjectTitle}</p>
                <p className="mt-1 text-xs text-ink-muted">{days.find((day) => day.value === selected.day)?.label} · {formatTime(timeToMinutes(selected.startTime))}–{formatTime(timeToMinutes(selected.endTime))}</p>
              </div>
              <button type="button" className="text-xs font-semibold text-maroon-700 underline focus-visible:outline-2 focus-visible:outline-maroon-600" onClick={() => setSelected(null)}>Close details</button>
            </div>
            <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
              <div><dt className="text-ink-muted">Section</dt><dd className="font-medium text-ink">{selected.programCode} · {selected.yearLevel} · {selected.sectionCode}</dd></div>
              <div><dt className="text-ink-muted">Professor</dt><dd className="font-medium text-ink">{selected.professor}</dd></div>
              <div><dt className="text-ink-muted">Room</dt><dd className="font-medium text-ink">{selected.room} · {selected.roomType}</dd></div>
              <div><dt className="text-ink-muted">Meeting type</dt><dd className="font-medium capitalize text-ink">{selected.meetingType}</dd></div>
              {selected.combinedGroup ? <div className="sm:col-span-2 lg:col-span-4"><dt className="text-ink-muted">Explicit combined group</dt><dd className="font-medium text-ink">{selected.combinedGroup}</dd></div> : null}
            </dl>
          </div>
        ) : null}
      </CardBody>
    </Card>
  )
}
