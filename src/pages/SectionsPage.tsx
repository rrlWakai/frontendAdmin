import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ChevronLeft, ChevronRight, Layers3, Pencil, Plus, Search } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { Card, CardBody, CardHeader } from '@/components/common/Card'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { SelectField } from '@/components/common/SelectField'
import { TextField } from '@/components/common/TextField'
import { AcademicStatusBadge } from '@/components/academic/AcademicStatusBadge'
import { ProgressionOversight } from '@/components/academic/ProgressionOversight'
import { useAuth } from '@/hooks/useAuth'
import {
  createAcademicRecord,
  fetchAcademicDirectory,
  fetchAcademicOptions,
  updateAcademicRecord,
} from '@/services/api/academic'
import type {
  AcademicMajor,
  AcademicOptions,
  AcademicPagination,
  AcademicProgram,
  AcademicRecord,
  AcademicResource,
  AcademicSection,
  AcademicYearLevel,
} from '@/types/academic'
import { getApiErrorMessage, getApiFieldErrors } from '@/utils/apiError'

type ReferenceKind = 'programs' | 'majors' | 'year-levels'

interface ReferenceRecord extends AcademicRecord {
  code?: string
  name?: string
  description?: string | null
  status?: string
  level?: number
  program_id?: number
}

interface SectionFormState {
  program_id: string
  year_level_id: string
  major_id: string
  academic_term_id: string
  section_token: string
  name: string
  capacity: string
  status: string
}

interface ReferenceFormState {
  code: string
  name: string
  description: string
  status: string
  level: string
  program_id: string
}

type SectionGroup = {
  key: string
  label: string
  sections: AcademicSection[]
}

type LevelGroup = {
  level: AcademicYearLevel
  sections: AcademicSection[]
  groups: SectionGroup[]
}

type ProgramGroup = {
  program: AcademicProgram
  sections: AcademicSection[]
  levels: LevelGroup[]
}

const selectClass = 'h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink focus:border-maroon-500 focus:outline-none focus:ring-2 focus:ring-maroon-500/20 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-ink-muted'

const referenceLabels: Record<ReferenceKind, { title: string; singular: string }> = {
  programs: { title: 'Programs', singular: 'program' },
  majors: { title: 'Specializations', singular: 'specialization' },
  'year-levels': { title: 'Year levels', singular: 'year level' },
}

function asText(value: unknown): string {
  return value === null || value === undefined ? '' : String(value)
}

function referenceLabel(record: ReferenceRecord): string {
  const name = asText(record.name)

  if (typeof record.level === 'number') return `${record.level}. ${name}`

  return record.code ? `${record.code} · ${name}` : name
}

function normalizeToken(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '-').replace(/[^A-Z0-9-]/g, '')
}

function tokenFromCode(code: string, majorCode?: string): string {
  let value = code.trim().toUpperCase()

  if (majorCode && value.endsWith(`-${majorCode}`)) {
    value = value.slice(0, -(majorCode.length + 1))
  }

  const last = value.split('-').pop() ?? value

  return last.replace(/^\d+/, '') || value
}

function buildSectionCode(
  program: { code: string } | undefined,
  yearLevel: { level: number } | undefined,
  major: { code: string } | null,
  token: string,
): string {
  const normalized = normalizeToken(token)

  if (!normalized || !program || !yearLevel) return ''
  if (normalized.includes('-')) return normalized

  const programCode = normalizeToken(program.code)
  const majorCode = major ? normalizeToken(major.code) : ''
  const suffix = majorCode ? `${yearLevel.level}${normalized}-${majorCode}` : `${yearLevel.level}${normalized}`

  return `${programCode}-${suffix}`
}

function termLabel(term: AcademicOptions['terms'][number]): string {
  return `${term.academic_year} · ${term.name}${term.status !== 'active' ? ` (${term.status})` : ''}`
}

function normalizeStatus(value: unknown): 'active' | 'inactive' {
  return value === 'inactive' ? 'inactive' : 'active'
}

function toProgram(section: AcademicSection, options: AcademicOptions | null): AcademicProgram {
  const found = options?.programs.find((program) => program.id === section.program_id)

  if (found) {
    return {
      id: found.id,
      code: found.code,
      name: found.name,
      description: null,
      status: normalizeStatus(found.status),
    }
  }

  return {
    id: section.program.id,
    code: section.program.code,
    name: section.program.name,
    description: null,
    status: 'active',
  }
}

function toYearLevel(section: AcademicSection, options: AcademicOptions | null): AcademicYearLevel {
  return options?.year_levels.find((level) => level.id === section.year_level_id) ?? {
    id: section.year_level.id,
    level: section.year_level.level,
    name: section.year_level.name,
  }
}

function toMajor(major: AcademicSection['major'], programId: number): AcademicMajor | null {
  if (!major) return null

  return {
    id: major.id,
    program_id: programId,
    code: major.code,
    name: major.name,
    description: null,
    status: 'active',
  }
}

function toMajorOption(major: AcademicOptions['majors'][number]): AcademicMajor {
  return {
    id: major.id,
    program_id: major.program_id,
    code: major.code,
    name: major.name,
    description: major.description,
    status: normalizeStatus(major.status),
  }
}

interface SectionDialogProps {
  section: AcademicSection | null
  options: AcademicOptions
  defaultTermId: number
  onCancel: () => void
  onSaved: (message: string) => void
}

function SectionDialog({ section, options, defaultTermId, onCancel, onSaved }: SectionDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const initialMajor = section ? toMajor(section.major, section.program_id) : null
  const [values, setValues] = useState<SectionFormState>(() => ({
    program_id: asText(section?.program_id),
    year_level_id: asText(section?.year_level_id),
    major_id: asText(section?.major_id),
    academic_term_id: asText(section?.academic_term_id ?? (defaultTermId || '')),
    section_token: section ? tokenFromCode(section.code, initialMajor?.code) : '',
    name: section?.name ?? '',
    capacity: asText(section?.capacity),
    status: section?.status ?? 'active',
  }))
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])

  const selectedProgram = options.programs.find((program) => program.id === Number(values.program_id))
  const selectedYearLevel = options.year_levels.find((level) => level.id === Number(values.year_level_id))
  const requiresSpecialization = (selectedYearLevel?.level ?? 0) >= 3
  const majorOptions = options.majors.filter((major) => (
    major.program_id === Number(values.program_id) && major.status !== 'inactive'
  ))
  const selectedMajor = majorOptions.find((major) => major.id === Number(values.major_id)) ?? null
  const termOptions = [...options.terms].sort((a, b) => (
    b.academic_year.localeCompare(a.academic_year) || a.term.localeCompare(b.term)
  ))
  const previewCode = buildSectionCode(
    selectedProgram,
    selectedYearLevel,
    requiresSpecialization ? selectedMajor : null,
    values.section_token,
  )

  function update<K extends keyof SectionFormState>(key: K, value: SectionFormState[K]) {
    setValues((current) => ({ ...current, [key]: value }))
    setFieldErrors((current) => ({ ...current, [key]: [] }))
    setError(null)
  }

  function updateProgram(value: string) {
    setValues((current) => ({
      ...current,
      program_id: value,
      major_id: '',
    }))
    setFieldErrors({})
    setError(null)
  }

  function updateYearLevel(value: string) {
    const level = options.year_levels.find((item) => item.id === Number(value))
    setValues((current) => ({
      ...current,
      year_level_id: value,
      major_id: (level?.level ?? 0) < 3 ? '' : current.major_id,
    }))
    setFieldErrors({})
    setError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setFieldErrors({})

    const nextErrors: Record<string, string[]> = {}
    if (!values.program_id) nextErrors.program_id = ['Choose a program.']
    if (!values.year_level_id) nextErrors.year_level_id = ['Choose a year level.']
    if (!values.academic_term_id) nextErrors.academic_term_id = ['Choose an academic term.']
    if (!values.section_token.trim()) nextErrors.section_token = ['Enter a section letter or code.']
    if (requiresSpecialization && !values.major_id) {
      nextErrors.major_id = ['Choose the specialization for this section.']
    }
    if (!previewCode) nextErrors.section_token = ['Enter a valid section letter or code.']

    const capacity = values.capacity.trim() === '' ? null : Number(values.capacity)
    if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1 || capacity > 65535)) {
      nextErrors.capacity = ['Capacity must be between 1 and 65535.']
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      setError('Complete the section details before saving.')
      return
    }

    const payload: Record<string, string | number | boolean | null> = {
      program_id: Number(values.program_id),
      year_level_id: Number(values.year_level_id),
      major_id: requiresSpecialization ? Number(values.major_id) : null,
      academic_term_id: Number(values.academic_term_id),
      code: previewCode,
      name: values.name.trim() || null,
      capacity,
      status: values.status,
    }

    setIsSaving(true)

    try {
      if (section) {
        await updateAcademicRecord('sections', section.id, payload)
        onSaved('Section updated.')
      } else {
        await createAcademicRecord('sections', payload)
        onSaved('Section created.')
      }
    } catch (failure) {
      const errors = getApiFieldErrors(failure)
      setFieldErrors(errors)
      setError(Object.values(errors).flat()[0] ?? getApiErrorMessage(failure, 'Unable to save the section.'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault()
        onCancel()
      }}
      className="fixed inset-0 m-auto max-h-[92vh] w-[min(46rem,calc(100%-2rem))] overflow-y-auto rounded-2xl border border-line bg-white p-0 text-ink shadow-2xl backdrop:bg-maroon-900/45"
      aria-labelledby="section-dialog-title"
    >
      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5 p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-maroon-600">
              Academic structure
            </p>
            <h2 id="section-dialog-title" className="mt-1 text-xl font-semibold">
              {section ? 'Edit section' : 'Create section'}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Select existing academic records; section creation never duplicates programs, specializations, or year levels.
            </p>
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            Close
          </Button>
        </div>

        {error ? (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Program"
            value={values.program_id}
            onChange={updateProgram}
            options={options.programs.map((program) => ({
              value: String(program.id),
              label: `${program.code} — ${program.name}${program.status === 'inactive' ? ' (inactive)' : ''}`,
            }))}
            placeholder="Choose a program"
            error={fieldErrors.program_id?.[0]}
            required
            searchable
          />

          <SelectField
            label="Year level"
            value={values.year_level_id}
            onChange={updateYearLevel}
            options={options.year_levels.map((level) => ({
              value: String(level.id),
              label: `${level.level}. ${level.name}`,
            }))}
            placeholder="Choose a year level"
            error={fieldErrors.year_level_id?.[0]}
            required
            searchable
          />

          {requiresSpecialization ? (
            <SelectField
              label="Specialization"
              value={values.major_id}
              onChange={(value) => update('major_id', value)}
              options={majorOptions.map((major) => ({
                value: String(major.id),
                label: `${major.code} — ${major.name}`,
              }))}
              placeholder="Choose a specialization"
              error={fieldErrors.major_id?.[0]}
              hint="Third- and fourth-year sections require a specialization."
              required
              searchable
            />
          ) : (
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-ink">Specialization</p>
              <p className="flex h-11 items-center rounded-xl border border-line bg-stone-50 px-3 text-sm text-ink-muted">
                Not applicable — first and second year use the common curriculum
              </p>
            </div>
          )}

          <SelectField
            label="Academic term"
            value={values.academic_term_id}
            onChange={(value) => update('academic_term_id', value)}
            options={termOptions.map((term) => ({
              value: String(term.id),
              label: termLabel(term),
            }))}
            placeholder="Choose an academic term"
            error={fieldErrors.academic_term_id?.[0]}
            required
            searchable
          />

          <TextField
            label="Section"
            value={values.section_token}
            onChange={(event) => update('section_token', event.target.value)}
            placeholder="A"
            error={fieldErrors.section_token?.[0]}
            hint="Enter a section letter, such as A. A full section code is also accepted."
            maxLength={32}
            required
          />

          <TextField
            label="Display name"
            value={values.name}
            onChange={(event) => update('name', event.target.value)}
            placeholder="Optional section name"
            error={fieldErrors.name?.[0]}
            maxLength={80}
          />

          <TextField
            label="Capacity"
            type="number"
            min={1}
            max={65535}
            step={1}
            value={values.capacity}
            onChange={(event) => update('capacity', event.target.value)}
            error={fieldErrors.capacity?.[0]}
            placeholder="40"
          />

          <div className="space-y-1.5">
            <label htmlFor="section-status" className="block text-sm font-medium text-ink">
              Status
            </label>
            <select
              id="section-status"
              value={values.status}
              onChange={(event) => update('status', event.target.value)}
              className={selectClass}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <p className="text-sm font-medium text-ink">Section identity</p>
            <p className="rounded-lg border border-line bg-surface-soft px-3 py-2 font-medium text-ink">
              {previewCode || 'Complete the program, year level, and section fields to build the code.'}
            </p>
            <p className="text-xs text-ink-muted">
              Codes follow the existing convention: program · year level · letter · specialization code when applicable.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSaving}>
            {section ? 'Save changes' : 'Create section'}
          </Button>
        </div>
      </form>
    </dialog>
  )
}

interface ReferenceDialogProps {
  kind: ReferenceKind
  record: ReferenceRecord | null
  options: AcademicOptions
  onCancel: () => void
  onSaved: (message: string) => void
}

function ReferenceDialog({ kind, record, options, onCancel, onSaved }: ReferenceDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const labels = referenceLabels[kind]
  const [values, setValues] = useState<ReferenceFormState>(() => ({
    code: asText(record?.code),
    name: asText(record?.name),
    description: asText(record?.description),
    status: asText(record?.status) || 'active',
    level: asText(record?.level),
    program_id: asText(record?.program_id),
  }))
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])

  function update<K extends keyof ReferenceFormState>(key: K, value: ReferenceFormState[K]) {
    setValues((current) => ({ ...current, [key]: value }))
    setFieldErrors((current) => ({ ...current, [key]: [] }))
    setError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors: Record<string, string[]> = {}

    if (kind !== 'year-levels' && !values.code.trim()) nextErrors.code = [`${labels.singular} code is required.`]
    if (!values.name.trim()) nextErrors.name = [`${labels.singular} name is required.`]
    if (kind === 'year-levels' && (!Number.isInteger(Number(values.level)) || Number(values.level) < 1)) {
      nextErrors.level = ['Enter a year level from 1 to 6.']
    }
    if (kind === 'majors' && !values.program_id) nextErrors.program_id = ['Choose a program.']

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      setError(`Complete the ${labels.singular} details before saving.`)
      return
    }

    let payload: Record<string, string | number | boolean | null>
    if (kind === 'year-levels') {
      payload = {
        level: Number(values.level),
        name: values.name.trim(),
      }
    } else if (kind === 'majors') {
      payload = {
        program_id: Number(values.program_id),
        code: values.code.trim(),
        name: values.name.trim(),
        status: values.status,
      }
    } else {
      payload = {
        code: values.code.trim(),
        name: values.name.trim(),
        status: values.status,
      }
    }

    if (kind !== 'year-levels' && (!record || record.description !== undefined)) {
      payload.description = values.description.trim() || null
    }

    setIsSaving(true)

    try {
      if (record) {
        await updateAcademicRecord(kind as AcademicResource, record.id, payload)
        onSaved(`${labels.title.replace(/s$/, '')} updated.`)
      } else {
        await createAcademicRecord(kind as AcademicResource, payload)
        onSaved(`${labels.title.replace(/s$/, '')} created.`)
      }
    } catch (failure) {
      const errors = getApiFieldErrors(failure)
      setFieldErrors(errors)
      setError(Object.values(errors).flat()[0] ?? getApiErrorMessage(failure, `Unable to save the ${labels.singular}.`))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault()
        onCancel()
      }}
      className="fixed inset-0 m-auto max-h-[92vh] w-[min(38rem,calc(100%-2rem))] overflow-y-auto rounded-2xl border border-line bg-white p-0 text-ink shadow-2xl backdrop:bg-maroon-900/45"
      aria-labelledby="reference-dialog-title"
    >
      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5 p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-maroon-600">
              Reference data
            </p>
            <h2 id="reference-dialog-title" className="mt-1 text-xl font-semibold">
              {record ? `Edit ${labels.singular}` : `Create ${labels.singular}`}
            </h2>
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            Close
          </Button>
        </div>

        {error ? (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          {kind === 'majors' ? (
            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="reference-program" className="block text-sm font-medium text-ink">
                Program
              </label>
              <select
                id="reference-program"
                value={values.program_id}
                onChange={(event) => update('program_id', event.target.value)}
                className={selectClass}
              >
                <option value="">Choose a program</option>
                {options.programs.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.code} — {program.name}
                  </option>
                ))}
              </select>
              {fieldErrors.program_id?.[0] ? (
                <p className="text-xs font-medium text-red-600">{fieldErrors.program_id[0]}</p>
              ) : null}
            </div>
          ) : null}

          {kind === 'year-levels' ? (
            <TextField
              label="Level"
              type="number"
              min={1}
              max={6}
              step={1}
              value={values.level}
              onChange={(event) => update('level', event.target.value)}
              error={fieldErrors.level?.[0]}
              required
            />
          ) : (
            <TextField
              label={`${labels.singular} code`}
              value={values.code}
              onChange={(event) => update('code', event.target.value)}
              error={fieldErrors.code?.[0]}
              maxLength={24}
              required
            />
          )}

          <TextField
            label="Name"
            value={values.name}
            onChange={(event) => update('name', event.target.value)}
            error={fieldErrors.name?.[0]}
            maxLength={kind === 'programs' ? 120 : 80}
            required
          />

          {kind === 'year-levels' ? null : (
            <>
              <TextField
                label="Description"
                value={values.description}
                onChange={(event) => update('description', event.target.value)}
                error={fieldErrors.description?.[0]}
                maxLength={kind === 'programs' ? 255 : 1000}
                className="sm:col-span-2"
              />
              <div className="space-y-1.5 sm:col-span-2">
                <label htmlFor="reference-status" className="block text-sm font-medium text-ink">
                  Status
                </label>
                <select
                  id="reference-status"
                  value={values.status}
                  onChange={(event) => update('status', event.target.value)}
                  className={selectClass}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSaving}>
            {record ? 'Save changes' : `Create ${labels.singular}`}
          </Button>
        </div>
      </form>
    </dialog>
  )
}

export function SectionsPage() {
  const { user } = useAuth()
  const canManage = user?.role === 'administrator' || user?.role === 'department_personnel'
  const [options, setOptions] = useState<AcademicOptions | null>(null)
  const [optionsError, setOptionsError] = useState<string | null>(null)
  const [records, setRecords] = useState<AcademicSection[]>([])
  const [pagination, setPagination] = useState<AcademicPagination>({
    current_page: 1,
    last_page: 1,
    per_page: 25,
    total: 0,
  })
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [termFilter, setTermFilter] = useState('')
  const [page, setPage] = useState(1)
  const [success, setSuccess] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [settledKey, setSettledKey] = useState<string | null>(null)
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [optionsVersion, setOptionsVersion] = useState(0)
  const [sectionDialog, setSectionDialog] = useState<AcademicSection | null | undefined>()
  const [referenceDialog, setReferenceDialog] = useState<{
    kind: ReferenceKind
    record: ReferenceRecord | null
  } | null>(null)

  useEffect(() => {
    let active = true
    void fetchAcademicOptions()
      .then((result) => {
        if (active) {
          setOptions(result)
          setOptionsError(null)
        }
      })
      .catch((failure: unknown) => {
        if (active) setOptionsError(getApiErrorMessage(failure, 'Unable to load academic options.'))
      })
    return () => { active = false }
  }, [optionsVersion])

  const requestKey = JSON.stringify([search, termFilter, page, refreshVersion])
  const isLoading = settledKey !== requestKey

  useEffect(() => {
    let active = true
    void fetchAcademicDirectory<AcademicSection>('sections', {
      search: search || undefined,
      academic_term_id: termFilter ? Number(termFilter) : undefined,
      page,
      per_page: 25,
    })
      .then((result) => {
        if (!active) return
        setRecords(result.records)
        setPagination(result.pagination)
        setLoadError(null)
        setSettledKey(requestKey)
      })
      .catch((failure: unknown) => {
        if (!active) return
        setLoadError(getApiErrorMessage(failure, 'Unable to load sections.'))
        setSettledKey(requestKey)
      })
    return () => { active = false }
  }, [requestKey, search, termFilter, page])

  const groups = useMemo<ProgramGroup[]>(() => {
    const programMap = new Map<number, AcademicProgram>()
    const levelMap = new Map<number, AcademicYearLevel>()
    const majorMap = new Map<number, AcademicMajor>()

    for (const section of records) {
      if (!programMap.has(section.program_id)) programMap.set(section.program_id, toProgram(section, options))
      if (!levelMap.has(section.year_level_id)) levelMap.set(section.year_level_id, toYearLevel(section, options))
      const major = toMajor(section.major, section.program_id)
      if (major && !majorMap.has(major.id)) majorMap.set(major.id, major)
    }

    for (const major of options?.majors ?? []) {
      if (!majorMap.has(major.id)) majorMap.set(major.id, toMajorOption(major))
    }

    return [...programMap.values()]
      .sort((a, b) => a.code.localeCompare(b.code))
      .map((program) => {
        const programSections = records.filter((section) => section.program_id === program.id)
        const levels = [...new Set(programSections.map((section) => section.year_level_id))]
          .map((levelId) => levelMap.get(levelId))
          .filter((level): level is AcademicYearLevel => Boolean(level))
          .sort((a, b) => a.level - b.level)

        return {
          program,
          sections: programSections,
          levels: levels.map((level) => {
            const levelSections = programSections.filter((section) => section.year_level_id === level.id)
            const groupMap = new Map<string, SectionGroup>()

            for (const section of levelSections) {
              const major = section.major_id === null
                ? null
                : majorMap.get(section.major_id) ?? toMajor(section.major, section.program_id)
              const key = level.level >= 3 ? `major-${section.major_id ?? 'missing'}` : 'common'
              const label = level.level >= 3
                ? major
                  ? `${major.code} — ${major.name}`
                  : 'Specialization required'
                : 'Common curriculum'
              const group = groupMap.get(key) ?? { key, label, sections: [] }
              group.sections.push(section)
              groupMap.set(key, group)
            }

            return {
              level,
              sections: levelSections,
              groups: [...groupMap.values()].sort((a, b) => a.label.localeCompare(b.label)),
            }
          }),
        }
      })
  }, [options, records])

  function refresh() {
    setRefreshVersion((version) => version + 1)
    setOptionsVersion((version) => version + 1)
  }

  function saved(message: string) {
    setSuccess(message)
    setSectionDialog(undefined)
    setReferenceDialog(null)
    refresh()
  }

  function openReference(kind: ReferenceKind, record: ReferenceRecord | null) {
    setSuccess(null)
    setReferenceDialog({ kind, record })
  }

  const currentTermId = options?.terms.find((term) => term.is_current)?.id ?? 0

  return (
    <>
      <PageHeader
        eyebrow="Academic"
        title="Sections"
        description="Manage the academic structure through sections. Programs, specializations, and year levels are maintained here as existing reference records."
        actions={canManage ? (
          <Button
            onClick={() => {
              setSuccess(null)
              setSectionDialog(null)
            }}
            disabled={!options}
            leftIcon={<Plus className="size-4" aria-hidden="true" />}
          >
            Create section
          </Button>
        ) : null}
      />

      {success ? (
        <div role="status" className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
          {success}
          <button type="button" className="ml-auto text-xs font-semibold underline" onClick={() => setSuccess(null)}>
            Dismiss
          </button>
        </div>
      ) : null}

      {optionsError ? (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {optionsError}
        </div>
      ) : null}

      {canManage ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-white px-4 py-3 text-sm">
          <span className="font-medium text-ink">Reference data</span>
          <span className="text-ink-muted">·</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!options}
            onClick={() => openReference('programs', null)}
          >
            Programs
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!options}
            onClick={() => openReference('majors', null)}
          >
            Specializations
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!options}
            onClick={() => openReference('year-levels', null)}
          >
            Year levels
          </Button>
        </div>
      ) : null}

      {canManage && options ? (
        <details className="mb-4 rounded-lg border border-line bg-white">
          <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium text-ink">
            Manage existing reference records
          </summary>
          <div className="grid gap-4 border-t border-line p-4 sm:grid-cols-3">
            {([
              { kind: 'programs' as const, records: options.programs },
              { kind: 'majors' as const, records: options.majors },
              { kind: 'year-levels' as const, records: options.year_levels },
            ]).map(({ kind, records }) => (
              <div key={kind}>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  {referenceLabels[kind].title}
                </p>
                <ul className="mt-2 space-y-1.5">
                  {records.length === 0 ? (
                    <li className="rounded-md border border-dashed border-line px-2 py-1.5 text-xs text-ink-muted">
                      None configured
                    </li>
                  ) : records.map((record) => (
                    <li key={record.id} className="flex items-center justify-between gap-2 rounded-md border border-line px-2 py-1.5 text-xs">
                      <span className="min-w-0 truncate text-ink">{referenceLabel(record)}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 shrink-0 px-2"
                        onClick={() => openReference(kind, record)}
                        leftIcon={<Pencil className="size-3" aria-hidden="true" />}
                      >
                        Edit
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </details>
      ) : null}

      <Card>
        <CardHeader>
          <form
            className="grid gap-3 sm:grid-cols-[minmax(12rem,1fr)_minmax(14rem,16rem)_auto]"
            onSubmit={(event) => {
              event.preventDefault()
              setPage(1)
              setSearch(searchInput.trim())
              setSuccess(null)
            }}
          >
            <TextField
              label="Search sections"
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Section code or name"
              leftIcon={<Search className="size-4" aria-hidden="true" />}
            />
            <SelectField
              label="Academic term"
              value={termFilter}
              onChange={(value) => {
                setPage(1)
                setTermFilter(value)
              }}
              options={(options?.terms ?? []).map((term) => ({
                value: String(term.id),
                label: termLabel(term),
              }))}
              placeholder="All academic terms"
            />
            <div className="flex items-end">
              <Button type="submit" variant="outline" className="w-full sm:w-auto">
                Search
              </Button>
            </div>
          </form>
        </CardHeader>
        <CardBody>
          {loadError ? (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {loadError}
              <Button className="mt-3" size="sm" variant="outline" onClick={() => setRefreshVersion((version) => version + 1)}>
                Retry
              </Button>
            </div>
          ) : isLoading ? (
            <div role="status" className="py-16 text-center text-sm text-ink-muted">
              Loading sections…
            </div>
          ) : groups.length === 0 ? (
            <EmptyState
              icon={Layers3}
              title="No sections found"
              description={search || termFilter ? 'Try adjusting the search or academic term.' : 'Create a section to start building the academic structure.'}
              action={canManage ? (
                <Button onClick={() => setSectionDialog(null)} leftIcon={<Plus className="size-4" aria-hidden="true" />}>
                  Create section
                </Button>
              ) : undefined}
            />
          ) : (
            <div className="divide-y divide-line">
              {groups.map((group) => (
                <section key={group.program.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-ink">{group.program.code} — {group.program.name}</h3>
                      <p className="mt-0.5 text-xs text-ink-muted">{group.sections.length} section{group.sections.length === 1 ? '' : 's'}</p>
                    </div>
                  </div>

                  <div className="mt-3 space-y-4">
                    {group.levels.map((level) => (
                      <div key={level.level.id} className="rounded-lg border border-line">
                        <div className="flex items-center justify-between gap-2 border-b border-line bg-stone-50 px-3 py-2">
                          <p className="text-sm font-semibold text-ink">{level.level.name}</p>
                          <p className="text-xs text-ink-muted">{level.sections.length} section{level.sections.length === 1 ? '' : 's'}</p>
                        </div>

                        <div className="divide-y divide-line">
                          {level.groups.map((specialization) => (
                            <div key={specialization.key}>
                              <p className="bg-surface-soft px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                                {specialization.label}
                              </p>
                              <div className="divide-y divide-line">
                                {specialization.sections.map((section) => (
                                  <div key={section.id} className="grid gap-2 px-3 py-3 text-sm sm:grid-cols-[minmax(10rem,1fr)_5rem_7rem_auto] sm:items-center">
                                    <div>
                                      <p className="font-medium text-ink">{section.code}</p>
                                      {section.name ? <p className="mt-0.5 text-xs text-ink-muted">{section.name}</p> : null}
                                    </div>
                                    <p className="text-ink-muted">Capacity {section.capacity ?? '—'}</p>
                                    <AcademicStatusBadge status={section.status} />
                                    {canManage ? (
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setSuccess(null)
                                          setSectionDialog(section)
                                        }}
                                        leftIcon={<Pencil className="size-3.5" aria-hidden="true" />}
                                      >
                                        Edit
                                      </Button>
                                    ) : <span />}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          {!isLoading && pagination.last_page > 1 ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
              <p className="text-xs text-ink-muted">
                {pagination.total} sections · Page {pagination.current_page} of {pagination.last_page}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  leftIcon={<ChevronLeft className="size-4" aria-hidden="true" />}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={page >= pagination.last_page}
                  onClick={() => setPage((current) => Math.min(pagination.last_page, current + 1))}
                >
                  Next
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          ) : null}
        </CardBody>
      </Card>

      <details className="mt-5 rounded-xl border border-line bg-white">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-ink">
          Academic progression oversight
        </summary>
        <ProgressionOversight />
      </details>

      {sectionDialog !== undefined && options ? (
        <SectionDialog
          key={sectionDialog?.id ?? 'new'}
          section={sectionDialog}
          options={options}
          defaultTermId={termFilter ? Number(termFilter) : currentTermId}
          onCancel={() => setSectionDialog(undefined)}
          onSaved={saved}
        />
      ) : null}

      {referenceDialog && options ? (
        <ReferenceDialog
          key={`${referenceDialog.kind}-${referenceDialog.record?.id ?? 'new'}`}
          kind={referenceDialog.kind}
          record={referenceDialog.record}
          options={options}
          onCancel={() => setReferenceDialog(null)}
          onSaved={saved}
        />
      ) : null}
    </>
  )
}
