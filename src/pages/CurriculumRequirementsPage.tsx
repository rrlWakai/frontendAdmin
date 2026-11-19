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

const semesters = [
  { value: 'first', label: 'First semester' },
  { value: 'second', label: 'Second semester' },
  { value: 'summer', label: 'Summer' },
]

const classifications = [
  { value: 'common', label: 'Common / minor' },
  { value: 'major', label: 'Major-specific' },
]

function semesterLabel(semester: AcademicCurriculumRequirement['semester']): string {
  return semesters.find((option) => option.value === semester)?.label ?? 'Semester not set'
}

function majorLabel(requirement: AcademicCurriculumRequirement): string {
  if (requirement.classification !== 'major') {
    return 'All majors / no major'
  }

  return requirement.major
    ? `${requirement.major.code} — ${requirement.major.name}`
    : 'Major required'
}

const config: AcademicPageConfig<AcademicCurriculumRequirement> = {
  resource: 'curriculum-requirements',
  title: 'Curriculum',
  description:
    'Map catalog subjects to program, year level, semester, and major scope. These mappings validate class assignments for scheduling; they never create class assignments automatically.',
  singular: 'Curriculum mapping',
  searchPlaceholder: 'Requirement type, semester, or classification',
  emptyDescription: 'Curriculum mappings will appear here when subjects are assigned to a curriculum scope.',
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
      key: 'semester',
      label: 'Semesters',
      valueType: 'string',
      options: () => semesters,
    },
    {
      key: 'classification',
      label: 'Classifications',
      valueType: 'string',
      options: () => classifications,
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
      resets: ['major_id'],
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
      name: 'semester',
      label: 'Semester',
      type: 'select',
      required: true,
      defaultValue: 'first',
      options: () => semesters,
    },
    {
      name: 'classification',
      label: 'Classification',
      type: 'select',
      required: true,
      defaultValue: 'common',
      options: () => classifications,
    },
    {
      name: 'major_id',
      label: 'Major (major-specific only)',
      type: 'select',
      requiredWhen: (values) => values.classification === 'major',
      disabledWhen: (values) => values.classification !== 'major',
      options: (choices, values) => choices.majors
        .filter((major) => String(major.program_id) === values.program_id)
        .map((major) => ({
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
          <p>{requirement.program.code} · {requirement.year_level.name} · {semesterLabel(requirement.semester)}</p>
          <p className="mt-1 text-xs">{majorLabel(requirement)}</p>
        </>
      ),
    },
    {
      label: 'Classification',
      render: (requirement) => (
        <span className="capitalize">
          {requirement.classification === 'major' ? 'Major-specific' : 'Common / minor'}
        </span>
      ),
    },
    { label: 'Type', render: (requirement) => <span className="capitalize">{requirement.requirement_type}</span> },
    { label: 'Status', render: (requirement) => <AcademicStatusBadge status={requirement.status} /> },
  ],
}

export function CurriculumRequirementsPage() {
  return <AcademicManagementPage config={config} />
}
