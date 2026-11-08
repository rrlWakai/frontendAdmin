import { AcademicManagementPage } from '@/components/academic/AcademicManagementPage'
import type { AcademicPageConfig } from '@/components/academic/AcademicManagementPage'
import type { AcademicSection } from '@/types/academic'

const config: AcademicPageConfig<AcademicSection> = {
  resource: 'sections',
  title: 'Sections',
  description: 'Manage term-based sections and their program and year-level relationships.',
  singular: 'Section',
  searchPlaceholder: 'Section code or name',
  emptyDescription: 'Sections will appear here when they are created.',
  statusOptions: [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'archived', label: 'Archived' },
  ],
  filters: [
    {
      key: 'program_id',
      label: 'Programs',
      options: (choices) => choices.programs.map((program) => ({
        value: String(program.id),
        label: `${program.code} — ${program.name}`,
      })),
    },
    {
      key: 'year_level_id',
      label: 'Year levels',
      options: (choices) => choices.year_levels.map((level) => ({
        value: String(level.id),
        label: `${level.level}. ${level.name}`,
      })),
    },
    {
      key: 'academic_term_id',
      label: 'Academic terms',
      options: (choices) => choices.terms.map((term) => ({
        value: String(term.id),
        label: `${term.academic_year} — ${term.name}`,
      })),
    },
  ],
  fields: [
    {
      name: 'program_id',
      label: 'Program',
      type: 'select',
      required: true,
      options: (choices) => choices.programs.map((program) => ({
        value: String(program.id),
        label: `${program.code} — ${program.name}${program.status === 'inactive' ? ' (inactive)' : ''}`,
      })),
    },
    {
      name: 'year_level_id',
      label: 'Year level',
      type: 'select',
      required: true,
      options: (choices) => choices.year_levels.map((level) => ({
        value: String(level.id),
        label: `${level.level}. ${level.name}`,
      })),
    },
    {
      name: 'academic_term_id',
      label: 'Academic term',
      type: 'select',
      required: true,
      options: (choices) => choices.terms.map((term) => ({
        value: String(term.id),
        label: `${term.academic_year} — ${term.name}${term.status === 'archived' ? ' (archived)' : ''}`,
      })),
    },
    { name: 'code', label: 'Section code', type: 'text', required: true, maxLength: 32 },
    { name: 'name', label: 'Display name', type: 'text', maxLength: 80 },
    { name: 'capacity', label: 'Capacity', type: 'number', min: 1, max: 65535, step: 1 },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: () => [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'archived', label: 'Archived' },
      ],
    },
  ],
  columns: [
    {
      label: 'Section',
      render: (section) => (
        <>
          <p className="font-semibold text-ink">{section.code}</p>
          {section.name ? <p className="mt-1 text-xs text-ink-muted">{section.name}</p> : null}
        </>
      ),
    },
    {
      label: 'Program',
      render: (section) => (
        <>
          <p>{section.program.code}</p>
          <p className="mt-1 text-xs">{section.program.name}</p>
        </>
      ),
    },
    {
      label: 'Year / term',
      render: (section) => (
        <>
          <p>{section.year_level.name}</p>
          <p className="mt-1 text-xs">{section.academic_term.academic_year} · {section.academic_term.name}</p>
        </>
      ),
    },
    { label: 'Capacity', render: (section) => section.capacity ?? '—' },
    { label: 'Status', render: (section) => section.status },
  ],
}

export function SectionsPage() {
  return <AcademicManagementPage config={config} />
}
