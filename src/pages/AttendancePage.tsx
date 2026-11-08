import { useEffect, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, ClipboardCheck, Search } from 'lucide-react'
import { AttendanceSessionDialog } from '@/components/attendance/AttendanceSessionDialog'
import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { Card, CardBody } from '@/components/common/Card'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { useAuth } from '@/hooks/useAuth'
import {
  fetchAttendanceMonitoring,
  fetchAttendanceOptions,
  fetchAttendanceSessions,
} from '@/services/api/attendance'
import type {
  AttendanceFilters,
  AttendanceOptions,
  AttendanceRecordItem,
  AttendanceSession,
  AttendanceSummary,
} from '@/types/attendance'
import { getApiErrorMessage } from '@/utils/apiError'

type ViewMode = 'sessions' | 'records'

const emptySummary: AttendanceSummary = {
  present: 0,
  absent: 0,
  late: 0,
  excused: 0,
  total: 0,
}

export function AttendancePage() {
  const { user } = useAuth()
  const [mode, setMode] = useState<ViewMode>('sessions')
  const [options, setOptions] = useState<AttendanceOptions | null>(null)
  const [sessions, setSessions] = useState<AttendanceSession[]>([])
  const [records, setRecords] = useState<AttendanceRecordItem[]>([])
  const [summary, setSummary] = useState(emptySummary)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [searchInput, setSearchInput] = useState('')
  const [filters, setFilters] = useState<AttendanceFilters>({})
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null)
  const [isLoadingOptions, setIsLoadingOptions] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [optionsError, setOptionsError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshVersion, setRefreshVersion] = useState(0)

  useEffect(() => {
    let active = true
    void fetchAttendanceOptions()
      .then((result) => {
        if (active) setOptions(result)
      })
      .catch((failure: unknown) => {
        if (active) setOptionsError(getApiErrorMessage(failure, 'Unable to load attendance filters.'))
      })
      .finally(() => {
        if (active) setIsLoadingOptions(false)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    const requestFilters = { ...filters, page, per_page: 25 }

    void Promise.resolve()
      .then(() => {
        if (!active) return
        setIsLoading(true)
        setError(null)
        return mode === 'sessions'
          ? fetchAttendanceSessions(requestFilters).then((result) => {
              if (!active) return
              setSessions(result.sessions)
              setLastPage(result.pagination.last_page)
              setTotal(result.pagination.total)
            })
          : fetchAttendanceMonitoring(requestFilters).then((result) => {
              if (!active) return
              setRecords(result.records)
              setSummary(result.summary)
              setLastPage(result.pagination.last_page)
              setTotal(result.pagination.total)
            })
      })
      .catch((failure: unknown) => {
        if (active) setError(getApiErrorMessage(failure, 'Unable to load attendance data.'))
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [filters, mode, page, refreshVersion])

  function setFilter<K extends keyof AttendanceFilters>(key: K, value: AttendanceFilters[K]) {
    setPage(1)
    setFilters((current) => ({ ...current, [key]: value || undefined }))
  }

  function refresh() {
    setRefreshVersion((version) => version + 1)
  }

  const visibleSections = options?.sections.filter((section) =>
    (!filters.program_id || section.program_id === filters.program_id) &&
    (!filters.academic_term_id || section.academic_term_id === filters.academic_term_id),
  ) ?? []

  return (
    <>
      <PageHeader
        eyebrow="Academic operations"
        title="Attendance"
        description="Monitor class meetings and student attendance within your authorized program scope."
        actions={<Badge tone="info">Stage 6</Badge>}
      />

      {optionsError ? (
        <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {optionsError}
        </div>
      ) : null}

      {mode === 'records' ? (
        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ['Present', summary.present],
            ['Absent', summary.absent],
            ['Late', summary.late],
            ['Excused', summary.excused],
            ['Records', summary.total],
          ].map(([label, value]) => (
            <Card key={label} className="px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                {label}
              </p>
              <p className="mt-1 font-display text-2xl font-semibold text-ink">{value}</p>
            </Card>
          ))}
        </div>
      ) : null}

      <Card>
        <CardBody>
          <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Attendance views">
            {(['sessions', 'records'] as const).map((view) => (
              <Button
                key={view}
                type="button"
                role="tab"
                aria-selected={mode === view}
                variant={mode === view ? 'primary' : 'outline'}
                onClick={() => {
                  setMode(view)
                  setPage(1)
                  setFilters((current) => ({ ...current, status: undefined }))
                }}
              >
                {view === 'sessions' ? 'Sessions' : 'Student records'}
              </Button>
            ))}
          </div>

          <form
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
            onSubmit={(event) => {
              event.preventDefault()
              setFilter('search', searchInput.trim() || undefined)
            }}
          >
            <label className="space-y-1.5 text-sm font-medium text-ink">
              Search
              <span className="relative block">
                <Search className="absolute left-3 top-3 size-4 text-ink-muted" aria-hidden="true" />
                <input
                  type="search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Student, subject, or section"
                  className="h-10 w-full rounded-lg border border-line bg-white pl-9 pr-3 text-sm font-normal"
                />
              </span>
            </label>
            <FilterSelect
              label="Academic term"
              value={filters.academic_term_id}
              onChange={(value) => setFilter('academic_term_id', value)}
              options={options?.terms.map((term) => ({
                id: term.id,
                label: `${term.academic_year} · ${term.name}`,
              })) ?? []}
            />
            <FilterSelect
              label="Program"
              value={filters.program_id}
              onChange={(value) => {
                setPage(1)
                setFilters((current) => ({
                  ...current,
                  program_id: value,
                  section_id: undefined,
                }))
              }}
              options={options?.programs.map((program) => ({
                id: program.id,
                label: `${program.code} · ${program.name}`,
              })) ?? []}
            />
            <FilterSelect
              label="Section"
              value={filters.section_id}
              onChange={(value) => setFilter('section_id', value)}
              options={visibleSections.map((section) => ({
                id: section.id,
                label: `${section.code}${section.name ? ` · ${section.name}` : ''}`,
              }))}
            />
            <FilterSelect
              label="Subject"
              value={filters.subject_id}
              onChange={(value) => setFilter('subject_id', value)}
              options={options?.subjects.map((subject) => ({
                id: subject.id,
                label: `${subject.code} · ${subject.title}`,
              })) ?? []}
            />
            <FilterSelect
              label="Professor"
              value={filters.professor_id}
              onChange={(value) => setFilter('professor_id', value)}
              options={options?.professors.map((professor) => ({
                id: professor.id,
                label: professor.name,
              })) ?? []}
            />
            <FilterSelect<string>
              label="Status"
              value={filters.status}
              onChange={(value) => setFilter('status', value)}
              options={(mode === 'sessions'
                ? ['open', 'submitted', 'cancelled']
                : ['present', 'absent', 'late', 'excused']
              ).map((status, index) => ({ id: index + 1, label: status, value: status }))}
            />
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1.5 text-sm font-medium text-ink">
                From
                <input
                  type="date"
                  value={filters.from_date ?? ''}
                  onChange={(event) => setFilter('from_date', event.target.value)}
                  className="h-10 w-full rounded-lg border border-line bg-white px-2 text-sm font-normal"
                />
              </label>
              <label className="space-y-1.5 text-sm font-medium text-ink">
                To
                <input
                  type="date"
                  value={filters.to_date ?? ''}
                  onChange={(event) => setFilter('to_date', event.target.value)}
                  className="h-10 w-full rounded-lg border border-line bg-white px-2 text-sm font-normal"
                />
              </label>
            </div>
            <div className="flex items-end">
              <Button type="submit" variant="outline" className="w-full">
                <Search className="size-4" aria-hidden="true" />
                Apply search
              </Button>
            </div>
          </form>

          {error ? (
            <div role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p>{error}</p>
              <Button className="mt-3" size="sm" variant="outline" onClick={refresh}>
                Retry
              </Button>
            </div>
          ) : isLoading || isLoadingOptions ? (
            <div role="status" className="py-16 text-center text-sm text-ink-muted">
              Loading attendance…
            </div>
          ) : mode === 'sessions' ? (
            sessions.length === 0 ? (
              <div className="mt-5">
                <EmptyState
                  icon={CalendarDays}
                  title="No attendance sessions found"
                  description="Sessions will appear after a Professor records attendance for a published class schedule."
                />
              </div>
            ) : (
              <div className="mt-5 overflow-x-auto rounded-lg border border-line">
                <table className="w-full min-w-[780px] text-left text-sm">
                  <thead className="bg-stone-50 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    <tr>
                      <th className="px-4 py-3">Class meeting</th>
                      <th className="px-4 py-3">Program / term</th>
                      <th className="px-4 py-3">Professor</th>
                      <th className="px-4 py-3">Date / time</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Records</th>
                      <th className="px-4 py-3 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {sessions.map((session) => (
                      <tr key={session.id}>
                        <td className="px-4 py-4">
                          <p className="font-semibold text-ink">{session.offering.subject.code} · {session.offering.subject.title}</p>
                          <p className="mt-1 text-xs text-ink-muted">{session.offering.section.code}</p>
                        </td>
                        <td className="px-4 py-4 text-xs text-ink-muted">
                          <p>{session.offering.section.program.code}</p>
                          <p className="mt-1">{session.offering.academic_term.academic_year} · {session.offering.academic_term.name}</p>
                        </td>
                        <td className="px-4 py-4 text-ink-muted">
                          {session.professors.map((professor) => professor.name).join(', ') || '—'}
                        </td>
                        <td className="px-4 py-4 text-xs text-ink-muted">
                          <p>{session.class_date}</p>
                          <p className="mt-1">{session.schedule.start_time}–{session.schedule.end_time}</p>
                        </td>
                        <td className="px-4 py-4">
                          <Badge tone={session.status === 'submitted' ? 'success' : session.status === 'cancelled' ? 'danger' : 'neutral'}>
                            {session.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-ink-muted">{session.record_count ?? 0}</td>
                        <td className="px-4 py-4 text-right">
                          <Button size="sm" variant="outline" onClick={() => setSelectedSessionId(session.id)}>
                            Review
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : records.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                icon={ClipboardCheck}
                title="No attendance records found"
                description="Try adjusting the filters or check again after a class session is submitted."
              />
            </div>
          ) : (
            <div className="mt-5 overflow-x-auto rounded-lg border border-line">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-stone-50 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  <tr>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Subject / section</th>
                    <th className="px-4 py-3">Program / term</th>
                    <th className="px-4 py-3">Class date</th>
                    <th className="px-4 py-3">Attendance</th>
                    <th className="px-4 py-3 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {records.map(({ attendance, session }) => (
                    <tr key={attendance.id}>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-ink">{attendance.student.name}</p>
                        <p className="mt-1 text-xs text-ink-muted">{attendance.student.student_number}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p>{session.offering.subject.code} · {session.offering.section.code}</p>
                        <p className="mt-1 text-xs text-ink-muted">{session.offering.subject.title}</p>
                      </td>
                      <td className="px-4 py-4 text-xs text-ink-muted">
                        <p>{session.offering.section.program.code}</p>
                        <p className="mt-1">{session.offering.academic_term.academic_year} · {session.offering.academic_term.name}</p>
                      </td>
                      <td className="px-4 py-4 text-ink-muted">
                        {session.class_date}
                        {session.status === 'cancelled' ? (
                          <p className="mt-1 text-xs text-amber-700">Session cancelled</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-4">
                        <Badge tone={attendance.status === 'present' ? 'success' : attendance.status === 'absent' ? 'danger' : 'neutral'}>
                          {attendance.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Button size="sm" variant="outline" onClick={() => setSelectedSessionId(session.id)}>
                          Review
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!isLoading && !error && total > 0 ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-ink-muted">
                {total} record{total === 1 ? '' : 's'} · Page {page} of {lastPage}
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
                  disabled={page >= lastPage}
                  onClick={() => setPage((current) => Math.min(lastPage, current + 1))}
                >
                  Next
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          ) : null}
        </CardBody>
      </Card>

      {selectedSessionId !== null ? (
        <AttendanceSessionDialog
          sessionId={selectedSessionId}
          canCorrect={user?.role === 'administrator'}
          onClose={() => setSelectedSessionId(null)}
          onSaved={refresh}
        />
      ) : null}
    </>
  )
}

interface FilterSelectOption<T extends string | number> {
  id: number
  label: string
  value?: T
}

interface FilterSelectProps<T extends string | number> {
  label: string
  value?: T
  options: FilterSelectOption<T>[]
  onChange: (value: T | undefined) => void
}

function FilterSelect<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: FilterSelectProps<T>) {
  return (
    <label className="space-y-1.5 text-sm font-medium text-ink">
      {label}
      <select
        value={value ?? ''}
        onChange={(event) => {
          const option = options.find((item) => String(item.id) === event.target.value)
          onChange(option ? option.value ?? (option.id as T) : undefined)
        }}
        className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm font-normal"
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
