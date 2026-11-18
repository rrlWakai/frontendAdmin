import { AcademicManagementPage } from '@/components/academic/AcademicManagementPage'
import { AcademicStatusBadge } from '@/components/academic/AcademicStatusBadge'
import type { AcademicPageConfig } from '@/components/academic/AcademicManagementPage'
import type { AcademicMajor } from '@/types/academic'

const config: AcademicPageConfig<AcademicMajor> = {
  resource: 'majors',
  title: 'Majors',
  description: 'Configure program-specific majors that become available at the third year level.',
  singular: 'Major',
  searchPlaceholder: 'Major code or name',
  emptyDescription: 'Majors will appear here when they are created.',
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
    { name: 'code', label: 'Major code', type: 'text', required: true, maxLength: 24 },
    { name: 'name', label: 'Major name', type: 'text', required: true, maxLength: 80 },
    { name: 'description', label: 'Description', type: 'textarea', maxLength: 1000 },
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
      label: 'Major',
      render: (major) => (
        <>
          <p className="font-semibold text-ink">{major.code}</p>
          <p className="mt-1 text-xs text-ink-muted">{major.name}</p>
        </>
      ),
    },
    {
      label: 'Program',
      render: (major) => major.program ? (
        <>
          <p>{major.program.code}</p>
          <p className="mt-1 text-xs">{major.program.name}</p>
        </>
      ) : '—',
    },
    { label: 'Description', render: (major) => major.description || '—' },
    { label: 'Status', render: (major) => <AcademicStatusBadge status={major.status} /> },
  ],
}

export function MajorsPage() {
  return <AcademicManagementPage config={config} />
}
