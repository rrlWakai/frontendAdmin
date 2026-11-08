import { AcademicManagementPage } from '@/components/academic/AcademicManagementPage'
import type { AcademicPageConfig } from '@/components/academic/AcademicManagementPage'
import { AcademicStatusBadge } from '@/components/academic/AcademicStatusBadge'
import type { AcademicProgram } from '@/types/academic'

const config: AcademicPageConfig<AcademicProgram> = {
  resource: 'programs',
  title: 'Academic programs',
  description: 'Manage program codes, names, descriptions, and availability across academic records.',
  singular: 'Program',
  searchPlaceholder: 'Program code or name',
  emptyDescription: 'Programs will appear here when they are created.',
  statusOptions: [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ],
  fields: [
    { name: 'code', label: 'Program code', type: 'text', required: true, maxLength: 16 },
    { name: 'name', label: 'Program name', type: 'text', required: true, maxLength: 120 },
    { name: 'description', label: 'Description', type: 'textarea', maxLength: 255 },
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
    { label: 'Code', render: (program) => <span className="font-semibold text-ink">{program.code}</span> },
    { label: 'Program', render: (program) => program.name },
    { label: 'Description', render: (program) => program.description || '—' },
    { label: 'Status', render: (program) => <AcademicStatusBadge status={program.status} /> },
  ],
}

export function AcademicPage() {
  return <AcademicManagementPage config={config} />
}
