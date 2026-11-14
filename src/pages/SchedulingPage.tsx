import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { isAxiosError } from 'axios'
import {
  AlertTriangle,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { Card, CardBody, CardHeader } from '@/components/common/Card'
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { fetchAcademicDirectory } from '@/services/api/academic'
import {
  allocateScheduleRoom,
  assignFacultyToSchedule,
  cancelSchedule,
  cancelScheduleAssignment,
  createFacultyAssignment,
  createSchedule,
  fetchOfferingFacultyAssignments,
  previewScheduleConflicts,
  fetchScheduleConflicts,
  fetchSchedules,
  fetchSchedulingOptions,
  publishSchedule,
  releaseScheduleRoom,
  resolveScheduleConflict,
  updateSchedule,
  waiveScheduleConflict,
} from '@/services/api/scheduling'
import type { AcademicTerm } from '@/types/academic'
import type {
  FacultyAssignmentOption,
  ScheduleConflictPreview,
  ScheduleConflictRecord,
  ScheduleInput,
  ScheduleRecord,
  SchedulingOptions,
} from '@/types/scheduling'
import { cn } from '@/utils/cn'

const IntelligentScheduleWorkspace = lazy(async () => {
  const module = await import('@/components/scheduling/IntelligentScheduleWorkspace')
  return { default: module.IntelligentScheduleWorkspace }
})

const days = [
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
  { value: 7, label: 'Sunday', short: 'Sun' },
]

const selectClass =
  'mt-1.5 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink transition focus:border-maroon-500 focus:outline-none focus:ring-2 focus:ring-maroon-500/15'

function getTodayValue(): number {
  const day = new Date().getDay()
  return day === 0 ? 7 : day
}

function buildWeekDays() {
  const today = new Date()
  const todayValue = getTodayValue()
  const monday = new Date(today)
  monday.setHours(0, 0, 0, 0)
  monday.setDate(today.getDate() - (todayValue - 1))

  return days.map((day) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + (day.value - 1))

    return {
      ...day,
      date: date.getDate(),
      isToday: day.value === todayValue,
    }
  })
}

function getErrorMessage(error: unknown): string {
  if (!isAxiosError(error)) {
    return 'Something went wrong. Please try again.'
  }

  const response = error.response?.data as
    | { message?: string; errors?: Record<string, string[] | string> }
    | undefined
  const details = Object.values(response?.errors ?? {}).flatMap((value) =>
    Array.isArray(value) ? value : [value],
  )

  return details[0] ?? response?.message ?? 'Unable to reach the scheduling service.'
}

function statusTone(status: ScheduleRecord['status']): 'neutral' | 'success' | 'warning' {
  if (status === 'published') return 'success'
  if (status === 'draft') return 'warning'
  return 'neutral'
}

function termStatusTone(status: AcademicTerm['status'] | undefined): 'success' | 'warning' | 'neutral' {
  if (status === 'active') return 'success'
  if (status === 'planned') return 'warning'
  return 'neutral'
}

function formatDay(day: number): string {
  return days.find((item) => item.value === day)?.label ?? 'Unknown day'
}

export function SchedulingPage() {
  const [workspaceMode, setWorkspaceMode] = useState<'manual' | 'ai'>('manual')
  const [terms, setTerms] = useState<AcademicTerm[]>([])
  const [termId, setTermId] = useState<number | null>(null)
  const [options, setOptions] = useState<SchedulingOptions | null>(null)
  const [schedules, setSchedules] = useState<ScheduleRecord[]>([])
  const [conflicts, setConflicts] = useState<ScheduleConflictRecord[]>([])
  const [conflictPreview, setConflictPreview] = useState<ScheduleConflictPreview[]>([])
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, per_page: 25, total: 0 })
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [dayFilter, setDayFilter] = useState('')
  const [sectionFilter, setSectionFilter] = useState('')
  const [programFilter, setProgramFilter] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [professorFilter, setProfessorFilter] = useState('')
  const [roomFilter, setRoomFilter] = useState('')
  const [page, setPage] = useState(1)
  const [overviewDay, setOverviewDay] = useState(getTodayValue)
  const [selected, setSelected] = useState<ScheduleRecord | null>(null)
  const [assignments, setAssignments] = useState<FacultyAssignmentOption[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [newSchedule, setNewSchedule] = useState<ScheduleInput>({
    subject_offering_id: 0,
    day_of_week: 1,
    start_time: '08:00',
    end_time: '09:00',
    schedule_type: 'lecture',
    modality: 'face_to_face',
  })
  const [editSchedule, setEditSchedule] = useState<Partial<Omit<ScheduleInput, 'subject_offering_id'>>>({})
  const [facultyId, setFacultyId] = useState('')
  const [professorId, setProfessorId] = useState('')
  const [assignmentRole, setAssignmentRole] = useState('lead')
  const [primary, setPrimary] = useState(true)
  const [roomId, setRoomId] = useState('')
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string
    description?: string
    confirmLabel: string
    cancelLabel: string
    destructive: boolean
    inputLabel?: string
    inputPlaceholder?: string
    onConfirm: (value: string) => void | Promise<void>
  } | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250)

    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    let active = true
    void fetchAcademicDirectory<AcademicTerm>('terms', { per_page: 100 })
      .then(({ records }) => {
        if (!active) return
        const schedulableTerms = records.filter((term) => ['active', 'planned'].includes(term.status))
        setTerms(schedulableTerms)
        const preferred = schedulableTerms.find((term) => term.is_current) ?? schedulableTerms[0]
        if (preferred) setTermId(preferred.id)
        else setLoading(false)
      })
      .catch((loadError: unknown) => {
        if (!active) return
        setError(getErrorMessage(loadError))
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const loadDirectory = useCallback(async (preserveError = false) => {
    if (!termId) return

    setLoading(true)
    if (!preserveError) setError(null)
    try {
      const [nextOptions, directory, conflictDirectory] = await Promise.all([
        fetchSchedulingOptions(termId),
        fetchSchedules({
          academic_term_id: termId,
          search: debouncedSearch || undefined,
          status: statusFilter as ScheduleRecord['status'] | '',
          day_of_week: dayFilter ? Number(dayFilter) : undefined,
          section_id: sectionFilter ? Number(sectionFilter) : undefined,
          program_id: programFilter ? Number(programFilter) : undefined,
          subject_id: subjectFilter ? Number(subjectFilter) : undefined,
          professor_id: professorFilter ? Number(professorFilter) : undefined,
          room_id: roomFilter ? Number(roomFilter) : undefined,
          page,
          per_page: 25,
        }),
        fetchScheduleConflicts(termId),
      ])
      setOptions(nextOptions)
      setSchedules(directory.schedules)
      setPagination(directory.pagination)
      setConflicts(conflictDirectory.conflicts)
      setSelected((current) => directory.schedules.find((schedule) => schedule.id === current?.id) ?? current)
    } catch (loadError) {
      setError(getErrorMessage(loadError))
    } finally {
      setLoading(false)
    }
  }, [dayFilter, debouncedSearch, page, professorFilter, programFilter, roomFilter, sectionFilter, statusFilter, subjectFilter, termId])

  useEffect(() => {
    const timer = window.setTimeout(() => void loadDirectory(), 0)

    return () => window.clearTimeout(timer)
  }, [loadDirectory])

  const selectedScheduleId = selected?.id
  const selectedOfferingId = selected?.subject_offering_id
  useEffect(() => {
    if (!selectedOfferingId) return

    let active = true
    void fetchOfferingFacultyAssignments(selectedOfferingId)
      .then((records) => {
        if (active) setAssignments(records)
      })
      .catch((loadError: unknown) => {
        if (active) setError(getErrorMessage(loadError))
      })

    return () => {
      active = false
    }
  }, [selectedScheduleId, selectedOfferingId])

  const activeConflicts = useMemo(
    () => conflicts.filter((conflict) => conflict.status === 'open'),
    [conflicts],
  )

  const weekDays = useMemo(() => buildWeekDays(), [])

  const dayGroups = useMemo(
    () =>
      weekDays.map((day) => ({
        ...day,
        daySchedules: schedules
          .filter((schedule) => schedule.day_of_week === day.value)
          .sort((left, right) => left.start_time.localeCompare(right.start_time)),
      })),
    [schedules, weekDays],
  )

  const overviewSchedules = useMemo(
    () => dayGroups.find((day) => day.value === overviewDay)?.daySchedules ?? [],
    [dayGroups, overviewDay],
  )

  const activeFilterCount = [
    statusFilter,
    dayFilter,
    sectionFilter,
    programFilter,
    subjectFilter,
    professorFilter,
    roomFilter,
  ].filter(Boolean).length

  const hasActiveFilters = activeFilterCount > 0 || debouncedSearch.length > 0

  function resetFilters() {
    setSearch('')
    setStatusFilter('')
    setDayFilter('')
    setSectionFilter('')
    setProgramFilter('')
    setSubjectFilter('')
    setProfessorFilter('')
    setRoomFilter('')
    setPage(1)
    setFiltersOpen(false)
  }

  function manageSchedule(schedule: ScheduleRecord) {
    setSelected(schedule)
    setOverviewDay(schedule.day_of_week)
    setFacultyId('')
    setRoomId('')
    setConflictPreview([])
    setEditSchedule({
      day_of_week: schedule.day_of_week,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      schedule_type: schedule.schedule_type,
      modality: schedule.modality,
    })
  }

  async function performAction(action: () => Promise<unknown>, message: string) {
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      await action()
      setNotice(message)
      await loadDirectory()
    } catch (actionError) {
      const message = getErrorMessage(actionError)
      if (isAxiosError(actionError) && actionError.response?.status === 422) {
        await loadDirectory(true)
      }
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!newSchedule.subject_offering_id) {
      setError('Choose a subject offering before creating a schedule.')
      return
    }
    await performAction(async () => {
      const created = await createSchedule(newSchedule)
      setSelected(created)
      setEditSchedule({
        day_of_week: created.day_of_week,
        start_time: created.start_time,
        end_time: created.end_time,
        schedule_type: created.schedule_type,
        modality: created.modality,
      })
      setFacultyId('')
      setRoomId('')
      setCreateOpen(false)
    }, 'Draft schedule created.')
  }

  async function handleEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected) return
    await performAction(async () => {
      const updated = await updateSchedule(selected.id, editSchedule)
      setSelected(updated)
      setEditSchedule({
        day_of_week: updated.day_of_week,
        start_time: updated.start_time,
        end_time: updated.end_time,
        schedule_type: updated.schedule_type,
        modality: updated.modality,
      })
    }, 'Draft schedule updated.')
  }

  async function handleAddFacultyAssignment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected || !professorId) return
    await performAction(async () => {
      await createFacultyAssignment({
        professor_id: Number(professorId),
        subject_offering_id: selected.subject_offering_id,
        assignment_role: assignmentRole,
      })
      setAssignments(await fetchOfferingFacultyAssignments(selected.subject_offering_id))
      setProfessorId('')
    }, 'Instructor linked to the offering.')
  }

  async function handleAssignFaculty(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected || !facultyId) return
    await performAction(async () => {
      await assignFacultyToSchedule(selected.id, Number(facultyId), primary)
    }, 'Instructor assigned to the draft schedule.')
  }

  async function handleAllocateRoom(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected || !roomId) return
    await performAction(async () => {
      await allocateScheduleRoom(selected.id, Number(roomId))
    }, 'Room allocated to the draft schedule.')
  }

  async function handleConflictAction(
    conflict: ScheduleConflictRecord,
    action: 'resolve' | 'waive',
  ) {
    setConfirmDialog({
      title: action === 'waive' ? 'Waive conflict' : 'Resolve conflict',
      description: action === 'waive'
        ? 'Reason for waiving this conflict:'
        : 'Resolution notes:',
      confirmLabel: action === 'waive' ? 'Waive' : 'Resolve',
      cancelLabel: 'Cancel',
      destructive: false,
      inputLabel: 'Notes',
      inputPlaceholder: action === 'waive' ? 'Reason for waiving...' : 'Resolution notes...',
      onConfirm: async (notes) => {
        setConfirmDialog(null)
        if (!notes?.trim()) return
        await performAction(
          () => action === 'waive'
            ? waiveScheduleConflict(conflict.id, notes.trim())
            : resolveScheduleConflict(conflict.id, notes.trim()),
          action === 'waive' ? 'Conflict waived.' : 'Conflict resolved.',
        )
      },
    })
  }

  const selectedOffering = options?.offerings.find((offering) => offering.id === selected?.subject_offering_id)
  const currentTerm = terms.find((item) => item.id === termId)
  const activeConflictCount = conflicts.filter((conflict) => conflict.status === 'open').length

  return (
    <div>
      <PageHeader
        eyebrow="Academic operations"
        title="Scheduling"
        description="Manage the published timetable manually or prepare a complete-semester schedule with AI."
        actions={(
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-end">
            <label className="block w-full text-xs font-semibold text-ink-muted sm:w-72">
              Academic term
              <select
                value={termId ?? ''}
                onChange={(event) => {
                  setTermId(Number(event.target.value) || null)
                  setPage(1)
                  setSelected(null)
                  setConflictPreview([])
                  setNewSchedule((current) => ({ ...current, subject_offering_id: 0 }))
                }}
                className="mt-1.5 h-10 w-full rounded-lg border border-line bg-white px-3 text-sm font-medium text-ink transition focus:border-maroon-500 focus:outline-none focus:ring-2 focus:ring-maroon-500/15"
              >
                {terms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.academic_year} · {term.name}{term.is_current ? ' (Current)' : ''}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap items-center gap-2 sm:pb-1">
              <Badge tone={termStatusTone(currentTerm?.status)}>
                {currentTerm ? `${currentTerm.status} term` : 'No academic term'}
              </Badge>
              {termId ? (
                activeConflictCount ? (
                  <Badge tone="warning">
                    {activeConflictCount} open conflict{activeConflictCount === 1 ? '' : 's'}
                  </Badge>
                ) : (
                  <Badge tone="success">No open conflicts</Badge>
                )
              ) : null}
            </div>
          </div>
        )}
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex w-fit rounded-xl border border-line bg-surface-soft p-1" role="tablist" aria-label="Scheduling mode">
          <button
            type="button"
            role="tab"
            id="manual-scheduling-tab"
            aria-selected={workspaceMode === 'manual'}
            aria-controls="manual-scheduling-panel"
            onClick={() => {
              setWorkspaceMode('manual')
              setError(null)
            }}
            className={`flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon-600 ${workspaceMode === 'manual' ? 'bg-white text-maroon-800 shadow-sm' : 'text-ink-muted hover:text-ink'}`}
          >
            <CalendarDays className="size-4" aria-hidden="true" />
            Manual scheduling
          </button>
          <button
            type="button"
            role="tab"
            id="intelligent-scheduling-tab"
            aria-selected={workspaceMode === 'ai'}
            aria-controls="intelligent-scheduling-panel"
            onClick={() => {
              setWorkspaceMode('ai')
              setCreateOpen(false)
              setError(null)
              setNotice(null)
            }}
            className={`flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon-600 ${workspaceMode === 'ai' ? 'bg-white text-maroon-800 shadow-sm' : 'text-ink-muted hover:text-ink'}`}
          >
            <Sparkles className="size-4" aria-hidden="true" />
            Intelligent AI scheduling
          </button>
        </div>
        {workspaceMode === 'manual' ? (
          <Button
            onClick={() => {
              setError(null)
              setCreateOpen((open) => !open)
            }}
            leftIcon={<Plus className="size-4" aria-hidden="true" />}
            disabled={!termId || !options?.offerings.length}
          >
            New schedule
          </Button>
        ) : null}
      </div>

      {workspaceMode === 'manual' && error ? (
        <div role="alert" className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>{error}</p>
        </div>
      ) : null}
      {workspaceMode === 'manual' && notice ? (
        <div role="status" className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <Check className="size-4" aria-hidden="true" />
          {notice}
        </div>
      ) : null}

      <div
        id="intelligent-scheduling-panel"
        role="tabpanel"
        aria-labelledby="intelligent-scheduling-tab"
        hidden={workspaceMode !== 'ai'}
      >
        {workspaceMode === 'ai' ? (
          <Suspense fallback={<div role="status" className="flex items-center gap-2 rounded-xl border border-line bg-white px-5 py-8 text-sm text-ink-muted"><RefreshCw className="size-4 animate-spin" aria-hidden="true" />Loading intelligent scheduling workspace…</div>}>
            <IntelligentScheduleWorkspace
              key={termId ?? 'no-term'}
              termId={termId}
              term={terms.find((item) => item.id === termId)}
              options={options}
              optionsLoading={loading}
              loadError={workspaceMode === 'ai' ? error : null}
              conflicts={conflicts}
            />
          </Suspense>
        ) : null}
      </div>
      <div
        id="manual-scheduling-panel"
        role="tabpanel"
        aria-labelledby="manual-scheduling-tab"
        hidden={workspaceMode !== 'manual'}
      >
      {workspaceMode === 'manual' ? (
      <>
      <section className="mb-5 rounded-xl border border-line bg-white" aria-label="Schedule filters">
        <div className="flex flex-col gap-3 p-3 sm:p-4 lg:flex-row lg:items-end">
          <label className="block w-full flex-1 text-xs font-semibold text-ink-muted">
            Search schedules
            <span className="relative mt-1.5 block">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
                placeholder="Subject code, title, or section"
                className="h-11 w-full rounded-lg border border-line bg-white pl-9 pr-3 text-sm text-ink transition focus:border-maroon-500 focus:outline-none focus:ring-2 focus:ring-maroon-500/15"
              />
            </span>
          </label>

          <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
            <Button
              variant="outline"
              onClick={() => setFiltersOpen((open) => !open)}
              leftIcon={<SlidersHorizontal className="size-4" aria-hidden="true" />}
              aria-expanded={filtersOpen}
              aria-controls="advanced-schedule-filters"
            >
              Filters{activeFilterCount ? ` (${activeFilterCount})` : ''}
            </Button>
            {hasActiveFilters ? (
              <Button variant="ghost" onClick={resetFilters}>
                Reset
              </Button>
            ) : null}
            <Button
              variant="ghost"
              onClick={() => void loadDirectory()}
              disabled={loading}
              aria-label="Refresh schedules"
              leftIcon={<RefreshCw className={loading ? 'size-4 animate-spin' : 'size-4'} aria-hidden="true" />}
            >
              Refresh
            </Button>
          </div>
        </div>

        {filtersOpen ? (
          <div id="advanced-schedule-filters" className="border-t border-line p-3 sm:p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <label className="block text-xs font-semibold text-ink-muted">
                Program
                <select value={programFilter} onChange={(event) => { setProgramFilter(event.target.value); setPage(1) }} className={selectClass}>
                  <option value="">All programs</option>
                  {options?.programs.map((program) => <option key={program.id} value={program.id}>{program.code}</option>)}
                </select>
              </label>
              <label className="block text-xs font-semibold text-ink-muted">
                Subject
                <select value={subjectFilter} onChange={(event) => { setSubjectFilter(event.target.value); setPage(1) }} className={selectClass}>
                  <option value="">All subjects</option>
                  {options?.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.code}</option>)}
                </select>
              </label>
              <label className="block text-xs font-semibold text-ink-muted">
                Section
                <select value={sectionFilter} onChange={(event) => { setSectionFilter(event.target.value); setPage(1) }} className={selectClass}>
                  <option value="">All sections</option>
                  {options?.sections.map((section) => <option key={section.id} value={section.id}>{section.code}</option>)}
                </select>
              </label>
              <label className="block text-xs font-semibold text-ink-muted">
                Instructor
                <select value={professorFilter} onChange={(event) => { setProfessorFilter(event.target.value); setPage(1) }} className={selectClass}>
                  <option value="">All instructors</option>
                  {options?.professors.map((professor) => <option key={professor.id} value={professor.id}>{professor.name}</option>)}
                </select>
              </label>
              <label className="block text-xs font-semibold text-ink-muted">
                Room
                <select value={roomFilter} onChange={(event) => { setRoomFilter(event.target.value); setPage(1) }} className={selectClass}>
                  <option value="">All rooms</option>
                  {options?.rooms.map((room) => <option key={room.id} value={room.id}>{room.code}</option>)}
                </select>
              </label>
              <label className="block text-xs font-semibold text-ink-muted">
                Status
                <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1) }} className={selectClass}>
                  <option value="">All statuses</option>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
              <label className="block text-xs font-semibold text-ink-muted">
                Day
                <select value={dayFilter} onChange={(event) => { setDayFilter(event.target.value); setPage(1) }} className={selectClass}>
                  <option value="">All days</option>
                  {days.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}
                </select>
              </label>
            </div>
            <div className="mt-3 flex justify-end">
              <Button variant="ghost" size="sm" onClick={resetFilters}>Clear all filters</Button>
            </div>
          </div>
        ) : null}
      </section>

      {createOpen ? (
        <Card className="mb-5">
          <CardHeader className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-ink">Create draft schedule</h3>
              <p className="mt-1 text-xs text-ink-muted">Instructor and room assignments can be added after saving the draft.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setCreateOpen(false)} aria-label="Close form">
              <X className="size-4" aria-hidden="true" />
            </Button>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-xs font-semibold text-ink-muted sm:col-span-2">
                Subject offering
                <select required value={newSchedule.subject_offering_id || ''} onChange={(event) => setNewSchedule({ ...newSchedule, subject_offering_id: Number(event.target.value) })} className="mt-1.5 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink">
                  <option value="">Choose an offering</option>
                  {options?.offerings.map((offering) => (
                    <option key={offering.id} value={offering.id}>
                      {offering.subject.code} — {offering.subject.title} · {offering.section.code}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-ink-muted">
                Day
                <select value={newSchedule.day_of_week} onChange={(event) => setNewSchedule({ ...newSchedule, day_of_week: Number(event.target.value) })} className="mt-1.5 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink">
                  {days.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold text-ink-muted">
                Type
                <select value={newSchedule.schedule_type} onChange={(event) => setNewSchedule({ ...newSchedule, schedule_type: event.target.value as ScheduleInput['schedule_type'] })} className="mt-1.5 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink">
                  <option value="lecture">Lecture</option>
                  <option value="laboratory">Laboratory</option>
                  <option value="seminar">Seminar</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-ink-muted">
                Start time
                <input required type="time" value={newSchedule.start_time} onChange={(event) => setNewSchedule({ ...newSchedule, start_time: event.target.value })} className="mt-1.5 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink" />
              </label>
              <label className="text-xs font-semibold text-ink-muted">
                End time
                <input required type="time" value={newSchedule.end_time} onChange={(event) => setNewSchedule({ ...newSchedule, end_time: event.target.value })} className="mt-1.5 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink" />
              </label>
              <label className="text-xs font-semibold text-ink-muted">
                Modality
                <select value={newSchedule.modality} onChange={(event) => setNewSchedule({ ...newSchedule, modality: event.target.value as ScheduleInput['modality'] })} className="mt-1.5 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink">
                  <option value="face_to_face">Face-to-face</option>
                  <option value="online">Online</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </label>
              <div className="flex items-end gap-2">
                <Button type="submit" isLoading={saving}>Save draft</Button>
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      ) : null}

      <section className="mb-5 overflow-hidden rounded-xl border border-line bg-white" aria-labelledby="weekly-overview-heading">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <h2 id="weekly-overview-heading" className="text-sm font-semibold text-ink">Weekly overview</h2>
            <span className="text-xs text-ink-muted">Current results</span>
          </div>
          <span className="text-xs text-ink-muted">{schedules.length} on this page</span>
        </div>

        <div className="hidden md:grid md:grid-cols-7">
          {dayGroups.map((day) => {
            const isSelected = day.value === overviewDay

            return (
              <button
                key={day.value}
                type="button"
                onClick={() => setOverviewDay(day.value)}
                aria-pressed={isSelected}
                className={cn(
                  'relative flex flex-col items-start gap-1 border-r border-line px-3 py-3 text-left transition-colors last:border-r-0 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-maroon-600',
                  isSelected ? 'bg-maroon-600 text-white' : 'bg-white text-ink hover:bg-maroon-50',
                )}
              >
                <span className={cn('text-[10px] font-semibold uppercase tracking-[0.14em]', isSelected ? 'text-white/70' : 'text-ink-muted')}>
                  {day.short}
                </span>
                <span className={cn('text-lg font-semibold leading-none', day.isToday ? 'text-gold-400' : isSelected ? 'text-white' : 'text-ink')}>
                  {day.date}
                </span>
                <span className={cn('mt-0.5 text-[11px]', isSelected ? 'text-white/75' : day.daySchedules.length ? 'text-maroon-700' : 'text-ink-muted')}>
                  {day.daySchedules.length} {day.daySchedules.length === 1 ? 'class' : 'classes'}
                </span>
                {day.isToday ? (
                  <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-gold-400" aria-hidden="true" />
                ) : null}
              </button>
            )
          })}
        </div>

        <div className="divide-y divide-line md:hidden">
          {dayGroups.map((day) => {
            const isSelected = day.value === overviewDay

            return (
              <div key={day.value}>
                <button
                  type="button"
                  onClick={() => setOverviewDay(day.value)}
                  aria-expanded={isSelected}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-maroon-600',
                    isSelected ? 'bg-maroon-50' : 'bg-white',
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span className={cn('text-sm font-semibold', day.isToday ? 'text-maroon-700' : 'text-ink')}>{day.label}</span>
                    <span className={cn('text-xs font-medium tabular-nums', day.isToday ? 'text-gold-600' : 'text-ink-muted')}>{day.date}</span>
                    {day.isToday ? <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gold-600">Today</span> : null}
                  </span>
                  <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', isSelected ? 'bg-maroon-600 text-white' : 'bg-surface-soft text-ink-muted')}>
                    {day.daySchedules.length}
                  </span>
                </button>
                {isSelected ? (
                  <div className="border-t border-line bg-surface-soft px-4 py-2">
                    {day.daySchedules.length ? (
                      <ul className="divide-y divide-line">
                        {day.daySchedules.map((schedule) => (
                          <li key={schedule.id}>
                            <button
                              type="button"
                              onClick={() => manageSchedule(schedule)}
                              className="flex w-full items-center justify-between gap-3 py-2.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon-600"
                            >
                              <span className="min-w-0">
                                <span className="block text-sm font-semibold text-ink">
                                  {schedule.offering.subject.code} · {schedule.offering.section.code}
                                </span>
                                <span className="mt-0.5 block text-xs text-ink-muted">
                                  {schedule.start_time}–{schedule.end_time}
                                  {schedule.assignments.filter((item) => item.status === 'active').length
                                    ? ` · ${schedule.assignments.filter((item) => item.status === 'active').map((item) => item.professor.name).join(', ')}`
                                    : ''}
                                </span>
                              </span>
                              <ChevronRight className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="py-2 text-xs text-ink-muted">No classes scheduled.</p>
                    )}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>

        <div className="hidden border-t border-line md:block">
          <div className="flex items-center justify-between px-5 py-2.5">
            <p className="text-xs font-semibold text-ink">{formatDay(overviewDay)} agenda</p>
            <span className="text-[11px] text-ink-muted">{overviewSchedules.length} {overviewSchedules.length === 1 ? 'class' : 'classes'}</span>
          </div>
          {overviewSchedules.length ? (
            <ul className="divide-y divide-line border-t border-line">
              {overviewSchedules.map((schedule) => (
                <li key={schedule.id}>
                  <button
                    type="button"
                    onClick={() => manageSchedule(schedule)}
                    className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-5 py-2.5 text-left transition-colors hover:bg-maroon-50/60 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-maroon-600"
                  >
                    <span className="w-24 shrink-0 text-xs font-medium tabular-nums text-ink">
                      {schedule.start_time}–{schedule.end_time}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                      {schedule.offering.subject.code} · {schedule.offering.section.code}
                    </span>
                    <span className="hidden min-w-0 flex-1 truncate text-xs text-ink-muted lg:block">{schedule.offering.subject.title}</span>
                    <span className="text-xs text-ink-muted">
                      {schedule.assignments.filter((item) => item.status === 'active').map((item) => item.professor.name).join(', ') || 'Unassigned'}
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="border-t border-line px-5 py-4 text-xs text-ink-muted">No classes scheduled for {formatDay(overviewDay)}.</p>
          )}
        </div>
      </section>

      {!loading && termId && options?.offerings.length === 0 ? (
        <Card className="mb-5">
          <EmptyState
            icon={CalendarDays}
            title="No open offerings for this term"
            description="Create or open subject offerings in Academic Structure before scheduling classes."
          />
        </Card>
      ) : null}
      {!loading && terms.length === 0 ? (
        <Card className="mb-5">
          <EmptyState
            icon={CalendarDays}
            title="No schedulable academic terms"
            description="Create an active or planned academic term before managing schedules."
          />
        </Card>
      ) : null}

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-wrap items-center justify-between gap-3 py-3.5">
          <div>
            <h2 className="text-sm font-semibold text-ink">Weekly schedule directory</h2>
            <p className="mt-1 text-xs text-ink-muted">
              {loading
                ? 'Updating results…'
                : `${pagination.total} schedule record${pagination.total === 1 ? '' : 's'} for the selected term`}
              {!loading && hasActiveFilters ? ' · Filtered view' : ''}
            </p>
          </div>
          <Badge tone={activeConflicts.length ? 'warning' : 'success'}>
            {activeConflicts.length ? `${activeConflicts.length} open conflict${activeConflicts.length === 1 ? '' : 's'}` : 'No open conflicts'}
          </Badge>
        </CardHeader>
        {loading ? (
          <div className="flex items-center justify-center gap-2 px-5 py-14 text-sm text-ink-muted">
            <RefreshCw className="size-4 animate-spin" aria-hidden="true" />
            Loading schedules…
          </div>
        ) : schedules.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No schedules found"
            description="Create a draft schedule from an open subject offering, or adjust the search and filters."
            action={<Button onClick={() => setCreateOpen(true)} disabled={!options?.offerings.length} leftIcon={<Plus className="size-4" aria-hidden="true" />}>Create schedule</Button>}
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-y border-line bg-surface-soft text-[10px] uppercase tracking-[0.14em] text-ink-muted">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold lg:px-5">Class</th>
                    <th className="px-4 py-2.5 font-semibold lg:px-5">Day / time</th>
                    <th className="px-4 py-2.5 font-semibold lg:px-5">Instructor / room</th>
                    <th className="px-4 py-2.5 font-semibold lg:px-5">Delivery</th>
                    <th className="px-4 py-2.5 font-semibold lg:px-5">Status</th>
                    <th className="px-4 py-2.5 text-right font-semibold lg:px-5">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {schedules.map((schedule) => (
                    <tr
                      key={schedule.id}
                      className={cn(
                        'transition-colors hover:bg-surface-soft',
                        selected?.id === schedule.id && 'bg-maroon-50/70',
                      )}
                    >
                      <td className="px-4 py-3.5 lg:px-5">
                        <p className="font-semibold text-ink">{schedule.offering.subject.code} · {schedule.offering.section.code}</p>
                        <p className="mt-1 max-w-56 truncate text-xs text-ink-muted">{schedule.offering.subject.title}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 lg:px-5">
                        <p className="font-medium text-ink">{formatDay(schedule.day_of_week)}</p>
                        <p className="mt-1 text-xs tabular-nums text-ink-muted">{schedule.start_time}–{schedule.end_time}</p>
                      </td>
                      <td className="px-4 py-3.5 lg:px-5">
                        <p className="max-w-48 truncate text-ink">{schedule.assignments.filter((item) => item.status === 'active').map((item) => item.professor.name).join(', ') || 'Unassigned'}</p>
                        <p className="mt-1 text-xs text-ink-muted">{schedule.room_allocations.find((item) => item.status === 'active')?.room.code ?? 'No room'}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 capitalize text-ink-muted lg:px-5">{schedule.modality.replaceAll('_', ' ')}</td>
                      <td className="px-4 py-3.5 lg:px-5"><Badge tone={statusTone(schedule.status)}>{schedule.status}</Badge></td>
                      <td className="px-4 py-3.5 text-right lg:px-5">
                        <Button variant="outline" size="sm" onClick={() => manageSchedule(schedule)}>Manage</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-line md:hidden">
              {schedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className={cn('p-4', selected?.id === schedule.id && 'bg-maroon-50/70')}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">{schedule.offering.subject.code} · {schedule.offering.section.code}</p>
                      <p className="mt-0.5 truncate text-xs text-ink-muted">{schedule.offering.subject.title}</p>
                    </div>
                    <Badge tone={statusTone(schedule.status)}>{schedule.status}</Badge>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div>
                      <dt className="text-ink-muted">Day / time</dt>
                      <dd className="mt-0.5 font-medium text-ink">{formatDay(schedule.day_of_week)} · {schedule.start_time}–{schedule.end_time}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-muted">Instructor</dt>
                      <dd className="mt-0.5 truncate font-medium text-ink">{schedule.assignments.filter((item) => item.status === 'active').map((item) => item.professor.name).join(', ') || 'Unassigned'}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-muted">Room</dt>
                      <dd className="mt-0.5 text-ink">{schedule.room_allocations.find((item) => item.status === 'active')?.room.code ?? 'No room'}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-muted">Delivery</dt>
                      <dd className="mt-0.5 capitalize text-ink">{schedule.modality.replaceAll('_', ' ')}</dd>
                    </div>
                  </dl>
                  <div className="mt-3 flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => manageSchedule(schedule)}>Manage</Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2 border-t border-line px-4 py-3 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between lg:px-5">
              <span>Page {pagination.current_page} of {pagination.last_page} · {pagination.total} total</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} aria-label="Previous page"><ChevronLeft className="size-4" aria-hidden="true" /></Button>
                <Button variant="outline" size="sm" disabled={page >= pagination.last_page} onClick={() => setPage((value) => value + 1)} aria-label="Next page"><ChevronRight className="size-4" aria-hidden="true" /></Button>
              </div>
            </div>
          </>
        )}
      </Card>

      {selected ? (
        <Card className="mt-5">
          <CardHeader className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-maroon-600">Schedule #{selected.id}</p>
              <h3 className="mt-1 text-lg font-semibold text-ink">{selected.offering.subject.code} · {selected.offering.section.code}</h3>
              <p className="mt-1 text-xs text-ink-muted">{selected.offering.academic_term.academic_year} · {selected.offering.academic_term.name}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={statusTone(selected.status)}>{selected.status}</Badge>
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)} aria-label="Close schedule details"><X className="size-4" aria-hidden="true" /></Button>
            </div>
          </CardHeader>
          <CardBody className="grid gap-6 xl:grid-cols-2">
            {selected.status === 'draft' ? (
              <form onSubmit={handleEdit} className="space-y-3">
                <h4 className="text-sm font-semibold text-ink">Edit draft</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-ink-muted">Day
                    <select value={editSchedule.day_of_week} onChange={(event) => setEditSchedule({ ...editSchedule, day_of_week: Number(event.target.value) })} className="mt-1 h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink">
                      {days.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-ink-muted">Type
                    <select value={editSchedule.schedule_type} onChange={(event) => setEditSchedule({ ...editSchedule, schedule_type: event.target.value as ScheduleInput['schedule_type'] })} className="mt-1 h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink">
                      <option value="lecture">Lecture</option><option value="laboratory">Laboratory</option><option value="seminar">Seminar</option><option value="other">Other</option>
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-ink-muted">Start
                    <input type="time" required value={editSchedule.start_time} onChange={(event) => setEditSchedule({ ...editSchedule, start_time: event.target.value })} className="mt-1 h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink" />
                  </label>
                  <label className="text-xs font-semibold text-ink-muted">End
                    <input type="time" required value={editSchedule.end_time} onChange={(event) => setEditSchedule({ ...editSchedule, end_time: event.target.value })} className="mt-1 h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink" />
                  </label>
                  <label className="text-xs font-semibold text-ink-muted sm:col-span-2">Modality
                    <select value={editSchedule.modality} onChange={(event) => setEditSchedule({ ...editSchedule, modality: event.target.value as ScheduleInput['modality'] })} className="mt-1 h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink">
                      <option value="face_to_face">Face-to-face</option><option value="online">Online</option><option value="hybrid">Hybrid</option>
                    </select>
                  </label>
                </div>
                <Button type="submit" size="sm" isLoading={saving}>Save changes</Button>
              </form>
            ) : (
              <div className="rounded-xl bg-stone-50 p-4">
                <p className="text-sm font-semibold text-ink">Published schedule is locked</p>
                <p className="mt-1 text-xs leading-5 text-ink-muted">Cancel this record and create a replacement to retain the published schedule history.</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-ink">Instructors</h4>
                <ul className="mt-2 space-y-2">
                  {selected.assignments.filter((item) => item.status === 'active').map((assignment) => (
                    <li key={assignment.id} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm">
                      <span className="text-ink">{assignment.professor.name} {assignment.is_primary ? <span className="text-xs text-maroon-700">(Primary)</span> : null}</span>
                      {selected.status === 'draft' ? <Button variant="ghost" size="sm" onClick={() => void performAction(() => cancelScheduleAssignment(selected.id, assignment.id), 'Instructor removed from schedule.')}>Remove</Button> : null}
                    </li>
                  ))}
                  {selected.assignments.filter((item) => item.status === 'active').length === 0 ? <li className="text-xs text-ink-muted">No instructors assigned.</li> : null}
                </ul>
              </div>

              {selected.status === 'draft' ? (
                <>
                  <form onSubmit={handleAddFacultyAssignment} className="grid gap-2 sm:grid-cols-[1fr_150px_auto]">
                    <label className="text-xs font-semibold text-ink-muted">Professor
                      <select required value={professorId} onChange={(event) => setProfessorId(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink">
                        <option value="">Choose professor</option>
                        {options?.professors.map((professor) => <option key={professor.id} value={professor.id}>{professor.name}</option>)}
                      </select>
                    </label>
                    <label className="text-xs font-semibold text-ink-muted">Offering role
                      <select value={assignmentRole} onChange={(event) => setAssignmentRole(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink">
                        <option value="lead">Lead</option><option value="co_instructor">Co-instructor</option><option value="lab_instructor">Lab instructor</option><option value="substitute">Substitute</option>
                      </select>
                    </label>
                    <span className="flex items-end"><Button type="submit" variant="outline" size="sm" disabled={!selectedOffering || !professorId}>Add to offering</Button></span>
                  </form>
                  <form onSubmit={handleAssignFaculty} className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                    <label className="text-xs font-semibold text-ink-muted">Offering assignment
                      <select required value={facultyId} onChange={(event) => setFacultyId(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink">
                        <option value="">Choose instructor assignment</option>
                        {assignments.filter((assignment) => assignment.status === 'active').map((assignment) => <option key={assignment.id} value={assignment.id}>{assignment.professor.name} · {assignment.assignment_role.replaceAll('_', ' ')}</option>)}
                      </select>
                    </label>
                    <label className="flex items-center gap-2 pt-6 text-xs text-ink-muted"><input type="checkbox" checked={primary} onChange={(event) => setPrimary(event.target.checked)} /> Primary</label>
                    <span className="flex items-end"><Button type="submit" variant="outline" size="sm" disabled={!facultyId}>Assign</Button></span>
                  </form>
                  <div>
                    <h4 className="text-sm font-semibold text-ink">Room</h4>
                    <p className="mt-1 text-xs text-ink-muted">
                      {selected.room_allocations.find((allocation) => allocation.status === 'active')?.room.code ?? 'No active room'}
                    </p>
                    {selected.modality !== 'online' ? (
                      <form onSubmit={handleAllocateRoom} className="mt-2 flex flex-wrap gap-2">
                        <select value={roomId} onChange={(event) => setRoomId(event.target.value)} className="h-10 min-w-48 rounded-lg border border-line bg-white px-3 text-sm text-ink">
                          <option value="">Choose available room</option>
                          {options?.rooms.filter((room) => room.status === 'available').map((room) => <option key={room.id} value={room.id}>{room.code} · {room.capacity} seats</option>)}
                        </select>
                        <Button type="submit" variant="outline" size="sm" disabled={!roomId}>Allocate room</Button>
                        {selected.room_allocations.filter((allocation) => allocation.status === 'active').map((allocation) => (
                          <Button key={allocation.id} type="button" variant="ghost" size="sm" onClick={() => void performAction(() => releaseScheduleRoom(selected.id, allocation.id), 'Room released.')}>Release</Button>
                        ))}
                      </form>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2 border-t border-line pt-4">
                    <Button size="sm" variant="outline" isLoading={saving} onClick={() => void performAction(async () => {
                      setConflictPreview(await previewScheduleConflicts(selected.id))
                    }, 'Conflict preview refreshed.')}>Check conflicts</Button>
                    <Button size="sm" isLoading={saving} onClick={() => void performAction(() => publishSchedule(selected.id), 'Schedule published.')}>Publish</Button>
                    <Button size="sm" variant="outline" isLoading={saving} onClick={() => void performAction(() => cancelSchedule(selected.id), 'Schedule cancelled.')}>Cancel schedule</Button>
                  </div>
                </>
              ) : selected.status === 'published' ? (
                <Button size="sm" variant="danger" isLoading={saving} onClick={() => {
                  setConfirmDialog({
                    title: 'Cancel published schedule',
                    description: 'Cancel this published schedule? Its assignment and room history will be retained.',
                    confirmLabel: 'Cancel schedule',
                    cancelLabel: 'Keep published',
                    destructive: true,
                    onConfirm: () => {
                      setConfirmDialog(null)
                      void performAction(() => cancelSchedule(selected.id), 'Schedule cancelled.')
                    },
                  })
                }}>Cancel published schedule</Button>
              ) : null}
            </div>
            {conflictPreview.length ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 xl:col-span-2" role="status">
                <p className="text-sm font-semibold text-amber-900">Potential conflicts</p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-amber-900">
                  {conflictPreview.map((conflict, index) => (
                    <li key={`${conflict.schedule_id}-${conflict.conflict_type}-${index}`}>
                      {conflict.message} (schedule #{conflict.schedule_id})
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      <Card className="mt-5">
        <CardHeader className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-ink">Conflict register</h3>
            <p className="mt-1 text-xs text-ink-muted">Detected overlaps remain recorded for review.</p>
          </div>
          <Badge tone={activeConflicts.length ? 'danger' : 'success'}>{activeConflicts.length} open</Badge>
        </CardHeader>
        {conflicts.length === 0 ? (
          <EmptyState icon={Check} title="No conflicts recorded" description="Conflicts detected during publication attempts will appear here." />
        ) : (
          <div className="divide-y divide-line">
            {conflicts.map((conflict) => (
              <div key={conflict.id} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={conflict.status === 'open' ? 'danger' : conflict.status === 'waived' ? 'warning' : 'success'}>{conflict.status}</Badge>
                    <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{conflict.conflict_type} · {conflict.resource ?? 'Resource'}</span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-ink">
                    {conflict.schedules.map((schedule) => `${schedule.subject_code} / ${schedule.section_code}`).join(' ↔ ')}
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {conflict.schedules.map((schedule) => `${formatDay(schedule.day_of_week)} ${schedule.start_time}–${schedule.end_time}`).join(' · ')}
                  </p>
                  {conflict.resolution_notes ? <p className="mt-1 text-xs text-ink-muted">Note: {conflict.resolution_notes}</p> : null}
                </div>
                {conflict.status === 'open' ? (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => void handleConflictAction(conflict, 'resolve')}>Resolve</Button>
                    <Button variant="secondary" size="sm" onClick={() => void handleConflictAction(conflict, 'waive')}>Waive</Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>

      <p className="mt-4 flex items-center gap-2 text-xs leading-5 text-ink-muted">
        <Clock3 className="size-3.5 shrink-0" aria-hidden="true" />
        Schedules repeat weekly through the academic term; time values use local campus time.
      </p>

      {confirmDialog && (
        <ConfirmationDialog
          onClose={() => setConfirmDialog(null)}
          variant={confirmDialog.inputLabel ? 'prompt' : 'confirm'}
          title={confirmDialog.title}
          description={confirmDialog.description}
          confirmLabel={confirmDialog.confirmLabel}
          cancelLabel={confirmDialog.cancelLabel}
          destructive={confirmDialog.destructive}
          inputLabel={confirmDialog.inputLabel}
          inputPlaceholder={confirmDialog.inputPlaceholder}
          isLoading={saving}
          onConfirm={confirmDialog.onConfirm}
        />
      )}
      </>
      ) : null}
      </div>
    </div>
  )
}
