import { AcademicManagementPage } from '@/components/academic/AcademicManagementPage'
import { AcademicStatusBadge } from '@/components/academic/AcademicStatusBadge'
import type { AcademicPageConfig } from '@/components/academic/AcademicManagementPage'
import type { AcademicYear } from '@/types/academic'

const config: AcademicPageConfig<AcademicYear> = {
  resource: 'academic-years',
  title: 'Academic years',
  description: 'Maintain the academic-year containers used by terms, placement, and progression.',
  singular: 'Academic year',
  searchPlaceholder: 'Academic year label',
  emptyDescription: 'Academic years will appear here when they are created.',
  statusOptions: [
    { value: 'planned', label: 'Planned' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'archived', label: 'Archived' },
  ],
  fields: [
    { name: 'label', label: 'Academic year (YYYY-YYYY)', type: 'text', required: true, maxLength: 9 },
    { name: 'starts_on', label: 'Start date', type: 'date', required: true },
    { name: 'ends_on', label: 'End date', type: 'date', required: true },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      defaultValue: 'planned',
      options: () => [
        { value: 'planned', label: 'Planned' },
        { value: 'active', label: 'Active' },
        { value: 'completed', label: 'Completed' },
        { value: 'archived', label: 'Archived' },
      ],
    },
  ],
  columns: [
    {
      label: 'Academic year',
      render: (year) => <span className="font-semibold text-ink">{year.label}</span>,
    },
    { label: 'Dates', render: (year) => `${year.starts_on} — ${year.ends_on}` },
    { label: 'Status', render: (year) => <AcademicStatusBadge status={year.status} /> },
  ],
}

export function AcademicYearsPage() {
  return <AcademicManagementPage config={config} />
}
