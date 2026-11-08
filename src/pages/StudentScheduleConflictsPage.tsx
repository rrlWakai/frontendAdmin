import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { Card, CardBody } from '@/components/common/Card'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import {
  fetchStudentScheduleConflictOptions,
  fetchStudentScheduleConflicts,
} from '@/services/api/studentScheduleConflicts'
import type {
  StudentScheduleConflict,
  StudentScheduleConflictFilters,
  StudentScheduleConflictOptions,
  StudentScheduleConflictPage,
} from '@/types/studentScheduleConflicts'
import { getApiErrorMessage } from '@/utils/apiError'

const emptyResult: StudentScheduleConflictPage = {
  academic_term: null,
  summary: { students_checked: 0, students_with_conflicts: 0, conflict_pairs: 0 },
  conflicts: [],
  pagination: { current_page: 1, last_page: 1, per_page: 25, total: 0 },
}

export function StudentScheduleConflictsPage() {
  const [options, setOptions] = useState<StudentScheduleConflictOptions | null>(null)
  const [termId, setTermId] = useState<number | undefined>()
  const [filters, setFilters] = useState<StudentScheduleConflictFilters>({})
  const [searchInput, setSearchInput] = useState('')
  const [result, setResult] = useState(emptyResult)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [optionsError, setOptionsError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    void fetchStudentScheduleConflictOptions(termId)
      .then((nextOptions) => {
        if (!active) return
        setOptions(nextOptions)
        setOptionsError(null)
        if (termId === undefined && nextOptions.selected_term) {
          setTermId(nextOptions.selected_term.id)
          setFilters((current) => ({ ...current, academic_term_id: nextOptions.selected_term?.id }))
        }
      })
      .catch((failure: unknown) => {
        if (active) setOptionsError(getApiErrorMessage(failure, 'Unable to load conflict filters.'))
      })
      .finally(() => {
        if (active) setLoadingOptions(false)
      })

    return () => {
      active = false
    }
  }, [termId])

  useEffect(() => {
    let active = true
    void Promise.resolve()
      .then(() => {
        if (!active) return
        setLoading(true)
        setError(null)
        return fetchStudentScheduleConflicts({
          ...filters,
          academic_term_id: termId,
          page: filters.page ?? 1,
          per_page: 25,
        }).then((nextResult) => {
          if (!active) return
          setResult(nextResult)
          if (selectedId && !nextResult.conflicts.some((conflict) => conflict.id === selectedId)) {
            setSelectedId(null)
          }
        })
      })
      .catch((failure: unknown) => {
        if (active) setError(getApiErrorMessage(failure, 'Unable to load student schedule conflicts.'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [filters, selectedId, termId])

  const visibleSections = useMemo(
    () => options?.sections.filter((section) =>
      (!filters.program_id || section.program_id === filters.program_id)
      && (!filters.year_level_id || section.year_level_id === filters.year_level_id),
    ) ?? [],
    [filters.program_id, filters.year_level_id, options?.sections],
  )

  function setFilter<K extends keyof StudentScheduleConflictFilters>(
    key: K,
    value: StudentScheduleConflictFilters[K],
  ) {
    setFilters((current) => ({ ...current, [key]: value || undefined, page: 1 }))
  }

  function changeTerm(value: string) {
    const nextTermId = value ? Number(value) : undefined
    setTermId(nextTermId)
    setFilters((current) => ({
      ...current,
      academic_term_id: nextTermId,
      program_id: undefined,
      year_level_id: undefined,
      section_id: undefined,
      page: 1,
    }))
  }

  return (
    <>
      <PageHeader
        eyebrow="Academic operations"
        title="Student schedule conflicts"
        description="Find overlapping classes from students’ active subject enrollments without changing their schedules or registrations."
        actions={<Badge tone="warning">Read-only report</Badge>}
      />

      {optionsError ? (
        <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {optionsError}
        </div>
      ) : null}
      {error ? (
        <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {[
          ['Students checked', result.summary.students_checked],
          ['Students with conflicts', result.summary.students_with_conflicts],
          ['Conflict pairs', result.summary.conflict_pairs],
        ].map(([label, value]) => (
          <Card key={label} className="px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">{label}</p>
            <p className="mt-1 font-display text-2xl font-semibold text-ink">{loading ? '—' : value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardBody>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <label className="space-y-1.5 text-sm font-medium text-ink">
              Academic term
              <select
                value={termId ?? ''}
                onChange={(event) => changeTerm(event.target.value)}
                disabled={loadingOptions}
                className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm"
              >
                <option value="">Select a term</option>
                {options?.terms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.name} · {term.academic_year}{term.is_current ? ' (Current)' : ''}
                  </option>
                ))}
              </select>
            </label>
            <FilterSelect
              label="Program"
              value={filters.program_id}
              onChange={(value) => {
                setFilter('program_id', value)
                setFilters((current) => ({ ...current, section_id: undefined }))
              }}
              options={options?.programs.map((program) => ({
                id: program.id,
                label: `${program.code} · ${program.name}`,
              })) ?? []}
              disabled={loadingOptions}
            />
            <FilterSelect
              label="Year level"
              value={filters.year_level_id}
              onChange={(value) => {
                setFilter('year_level_id', value)
                setFilters((current) => ({ ...current, section_id: undefined }))
              }}
              options={options?.year_levels.map((level) => ({ id: level.id, label: level.name })) ?? []}
              disabled={loadingOptions}
            />
            <FilterSelect
              label="Section"
              value={filters.section_id}
              onChange={(value) => setFilter('section_id', value)}
              options={visibleSections.map((section) => ({
                id: section.id,
                label: section.name ? `${section.code} · ${section.name}` : section.code,
              }))}
              disabled={loadingOptions}
            />
            <form
              className="space-y-1.5 text-sm font-medium text-ink"
              onSubmit={(event) => {
                event.preventDefault()
                setFilter('search', searchInput.trim() || undefined)
              }}
            >
              Student search
              <span className="relative block">
                <Search className="absolute left-3 top-3 size-4 text-ink-muted" aria-hidden="true" />
                <input
                  type="search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Name or student number"
                  className="h-10 w-full rounded-lg border border-line bg-white pl-9 pr-3 text-sm font-normal"
                />
              </span>
            </form>
          </div>

          <div className="mt-6 border-t border-line pt-5">
            {loading ? (
              <p className="py-10 text-center text-sm text-ink-muted" role="status">Checking enrolled schedules…</p>
            ) : error ? (
              <EmptyState
                icon={AlertTriangle}
                title="Conflict report unavailable"
                description={error}
                className="py-2"
              />
            ) : result.conflicts.length === 0 ? (
              <EmptyState
                icon={AlertTriangle}
                title="No overlapping schedules found"
                description="No enrolled student schedule pairs overlap in the selected term and filters."
                className="py-2"
              />
            ) : (
              <div className="space-y-3">
                {result.conflicts.map((conflict) => (
                  <ConflictCard
                    key={conflict.id}
                    conflict={conflict}
                    expanded={selectedId === conflict.id}
                    onToggle={() => setSelectedId((current) => current === conflict.id ? null : conflict.id)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
            <p className="text-xs text-ink-muted">
              {result.pagination.total} conflict pair{result.pagination.total === 1 ? '' : 's'}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                disabled={loading || result.pagination.current_page <= 1}
                onClick={() => setFilter('page', result.pagination.current_page - 1)}
              >
                <ChevronLeft className="size-4" aria-hidden="true" /> Previous
              </Button>
              <span className="text-xs text-ink-muted">
                {result.pagination.current_page} / {result.pagination.last_page}
              </span>
              <Button
                variant="outline"
                disabled={loading || result.pagination.current_page >= result.pagination.last_page}
                onClick={() => setFilter('page', result.pagination.current_page + 1)}
              >
                Next <ChevronRight className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string
  value?: number
  onChange: (value: number | undefined) => void
  options: Array<{ id: number; label: string }>
  disabled?: boolean
}) {
  return (
    <label className="space-y-1.5 text-sm font-medium text-ink">
      {label}
      <select
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value ? Number(event.target.value) : undefined)}
        disabled={disabled}
        className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm"
      >
        <option value="">All {label.toLowerCase()}s</option>
        {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
    </label>
  )
}

function ConflictCard({
  conflict,
  expanded,
  onToggle,
}: {
  conflict: StudentScheduleConflict
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <article className="rounded-xl border border-amber-200 bg-amber-50/40">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={onToggle}
        className="flex w-full flex-col gap-3 p-4 text-left sm:flex-row sm:items-center sm:justify-between"
      >
        <span>
          <span className="block font-semibold text-ink">
            {conflict.student.name ?? 'Student'} · {conflict.student.student_number}
          </span>
          <span className="mt-1 block text-xs text-ink-muted">
            {conflict.student.program?.name ?? 'Program unavailable'}
            {conflict.student.year_levels.length
              ? ` · ${conflict.student.year_levels.map((level) => level.name).join(', ')}`
              : ''}
          </span>
        </span>
        <span className="flex flex-wrap items-center gap-2">
          <Badge tone="warning">{conflict.day_label} · {conflict.overlap.start_time}–{conflict.overlap.end_time}</Badge>
          <span className="text-xs font-semibold text-brand-700">{expanded ? 'Hide details' : 'View details'}</span>
        </span>
      </button>
      <div className="grid gap-3 border-t border-amber-200 p-4 md:grid-cols-2">
        {conflict.classes.map((classItem) => (
          <div key={classItem.schedule_id} className="rounded-lg border border-line bg-white p-4">
            <p className="font-semibold text-ink">{classItem.subject.code} · {classItem.subject.title}</p>
            <p className="mt-1 text-sm text-ink-muted">
              Offering #{classItem.subject_offering_id} · Section {classItem.section.code}
              {classItem.section.year_level ? ` · ${classItem.section.year_level.name}` : ''}
            </p>
            <p className="mt-2 text-sm text-ink">
              {conflict.day_label}, {classItem.start_time}–{classItem.end_time}
            </p>
          </div>
        ))}
      </div>
      {expanded ? (
        <div className="grid gap-3 border-t border-amber-200 p-4 md:grid-cols-2">
          {conflict.classes.map((classItem) => (
            <div key={`detail-${classItem.schedule_id}`} className="text-sm text-ink-muted">
              <p className="font-semibold text-ink">{classItem.subject.code} · {classItem.subject.title}</p>
              <p>Section: {classItem.section.code}{classItem.section.name ? ` · ${classItem.section.name}` : ''}</p>
              <p>Program: {classItem.section.program?.name ?? 'Not available'}</p>
              <p>Year level: {classItem.section.year_level?.name ?? 'Not available'}</p>
              <p>Room: {classItem.room ? `${classItem.room.code} · ${classItem.room.name}` : 'Not assigned'}</p>
              <p>Professor{classItem.professors.length === 1 ? '' : 's'}: {
                classItem.professors.length
                  ? classItem.professors.map((professor) => professor.name).join(', ')
                  : 'Not assigned'
              }</p>
            </div>
          ))}
          <p className="text-xs text-ink-muted md:col-span-2">
            {conflict.academic_term.name} · {conflict.academic_term.academic_year} ·
            {' '}overlap {conflict.overlap.start_time}–{conflict.overlap.end_time}
          </p>
        </div>
      ) : null}
    </article>
  )
}
