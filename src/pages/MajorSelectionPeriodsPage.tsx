import { AcademicManagementPage } from '@/components/academic/AcademicManagementPage'
import { AcademicStatusBadge } from '@/components/academic/AcademicStatusBadge'
import type { AcademicPageConfig } from '@/components/academic/AcademicManagementPage'
import type { AcademicMajorSelectionPeriod } from '@/types/academic'

const config: AcademicPageConfig<AcademicMajorSelectionPeriod> = {
  resource: 'major-selection-periods',
  title: 'Major selection periods',
  description: 'Open and close the windows in which students choose a program-specific major.',
  singular: 'Major selection period',
  searchPlaceholder: 'Status or scope',
  emptyDescription: 'Major selection periods will appear here when they are created.',
  statusOptions: [
    { value: 'planned', label: 'Planned' },
    { value: 'active', label: 'Active' },
    { value: 'closed', label: 'Closed' },
    { value: 'archived', label: 'Archived' },
  ],
  filters: [
    {
      key: 'academic_year_id',
      label: 'Academic years',
      options: (choices) => choices.academic_years.map((year) => ({
        value: String(year.id),
        label: year.label,
      })),
    },
    {
      key: 'program_id',
      label: 'Programs',
      options: (choices) => choices.programs.map((program) => ({
        value: String(program.id),
        label: `${program.code} — ${program.name}`,
      })),
    },
    {
      key: 'target_year_level_id',
      label: 'Target year levels',
      options: (choices) => choices.year_levels.map((level) => ({
        value: String(level.id),
        label: `${level.level}. ${level.name}`,
      })),
    },
  ],
  fields: [
    {
      name: 'academic_year_id',
      label: 'Academic year',
      type: 'select',
      required: true,
      options: (choices) => choices.academic_years.map((year) => ({
        value: String(year.id),
        label: `${year.label}${year.status === 'archived' ? ' (archived)' : ''}`,
      })),
    },
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
      name: 'target_year_level_id',
      label: 'Target year level',
      type: 'select',
      required: true,
      options: (choices) => choices.year_levels.map((level) => ({
        value: String(level.id),
        label: `${level.level}. ${level.name}`,
      })),
    },
    {
      name: 'opens_at',
      label: 'Opens at (YYYY-MM-DD HH:MM)',
      type: 'text',
      required: true,
      maxLength: 19,
    },
    {
      name: 'closes_at',
      label: 'Closes at (YYYY-MM-DD HH:MM)',
      type: 'text',
      required: true,
      maxLength: 19,
    },
    { name: 'allow_changes', label: 'Allow students to change their selection before closing', type: 'checkbox' },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      defaultValue: 'planned',
      options: () => [
        { value: 'planned', label: 'Planned' },
        { value: 'active', label: 'Active' },
        { value: 'closed', label: 'Closed' },
        { value: 'archived', label: 'Archived' },
      ],
    },
  ],
  columns: [
    {
      label: 'Scope',
      render: (period) => (
        <>
          <p className="font-semibold text-ink">{period.program.code} · {period.target_year_level.name}</p>
          <p className="mt-1 text-xs text-ink-muted">{period.academic_year.label}</p>
        </>
      ),
    },
    {
      label: 'Window',
      render: (period) => (
        <>
          <p>{period.opens_at}</p>
          <p className="mt-1 text-xs">to {period.closes_at}</p>
        </>
      ),
    },
    { label: 'Changes', render: (period) => period.allow_changes ? 'Allowed' : 'Locked' },
    { label: 'Status', render: (period) => <AcademicStatusBadge status={period.status} /> },
  ],
}

export function MajorSelectionPeriodsPage() {
  return <AcademicManagementPage config={config} />
}
