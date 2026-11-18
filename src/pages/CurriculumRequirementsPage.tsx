import { AcademicManagementPage } from '@/components/academic/AcademicManagementPage'
import { AcademicStatusBadge } from '@/components/academic/AcademicStatusBadge'
import type { AcademicPageConfig } from '@/components/academic/AcademicManagementPage'
import type { AcademicCurriculumRequirement } from '@/types/academic'

const requirementTypes = [
  { value: 'core', label: 'Core' },
  { value: 'minor', label: 'Minor' },
  { value: 'major', label: 'Major' },
  { value: 'elective', label: 'Elective' },
]

const config: AcademicPageConfig<AcademicCurriculumRequirement> = {
  resource: 'curriculum-requirements',
  title: 'Curriculum requirements',
  description: 'Map subjects to program, year level, and optional major scopes for offering guidance.',
  singular: 'Curriculum requirement',
  searchPlaceholder: 'Requirement type',
  emptyDescription: 'Curriculum requirements will appear here when they are created.',
  statusOptions: [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
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
      key: 'major_id',
      label: 'Majors',
      options: (choices) => choices.majors.map((major) => ({
        value: String(major.id),
        label: `${major.code} — ${major.name}`,
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
        label: `${program.code} — ${program.name}`,
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
      name: 'major_id',
      label: 'Major (optional)',
      type: 'select',
      options: (choices) => choices.majors.map((major) => ({
        value: String(major.id),
        label: `${major.code} — ${major.name}`,
      })),
    },
    {
      name: 'subject_id',
      label: 'Subject',
      type: 'select',
      required: true,
      options: (choices) => choices.subjects.map((subject) => ({
        value: String(subject.id),
        label: `${subject.code} — ${subject.title}`,
      })),
    },
    {
      name: 'requirement_type',
      label: 'Requirement type',
      type: 'select',
      required: true,
      defaultValue: 'core',
      options: () => requirementTypes,
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: () => [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
      ],
    },
  ],
  columns: [
    {
      label: 'Subject',
      render: (requirement) => (
        <>
          <p className="font-semibold text-ink">{requirement.subject.code}</p>
          <p className="mt-1 text-xs text-ink-muted">{requirement.subject.title}</p>
        </>
      ),
    },
    {
      label: 'Scope',
      render: (requirement) => (
        <>
          <p>{requirement.program.code} · {requirement.year_level.name}</p>
          <p className="mt-1 text-xs">
            {requirement.major ? `${requirement.major.code} — ${requirement.major.name}` : 'All majors / no major'}
          </p>
        </>
      ),
    },
    { label: 'Type', render: (requirement) => <span className="capitalize">{requirement.requirement_type}</span> },
    { label: 'Status', render: (requirement) => <AcademicStatusBadge status={requirement.status} /> },
  ],
}

export function CurriculumRequirementsPage() {
  return <AcademicManagementPage config={config} />
}
