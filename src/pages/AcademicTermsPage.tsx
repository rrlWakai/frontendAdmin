import { AcademicManagementPage } from '@/components/academic/AcademicManagementPage'
import { AcademicStatusBadge } from '@/components/academic/AcademicStatusBadge'
import type { AcademicPageConfig } from '@/components/academic/AcademicManagementPage'
import type { AcademicTerm } from '@/types/academic'

const termLabels: Record<AcademicTerm['term'], string> = {
  first: 'First semester',
  second: 'Second semester',
  summer: 'Summer',
}

const config: AcademicPageConfig<AcademicTerm> = {
  resource: 'terms',
  title: 'Academic terms',
  description: 'Manage academic-year terms, dates, status, and the active academic term.',
  singular: 'Academic term',
  searchPlaceholder: 'Academic year or term name',
  emptyDescription: 'Academic terms will appear here when they are created.',
  statusOptions: [
    { value: 'planned', label: 'Planned' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'archived', label: 'Archived' },
  ],
  fields: [
    { name: 'academic_year', label: 'Academic year (YYYY-YYYY)', type: 'text', required: true, maxLength: 9 },
    {
      name: 'term',
      label: 'Term classification',
      type: 'select',
      required: true,
      options: () => [
        { value: 'first', label: 'First semester' },
        { value: 'second', label: 'Second semester' },
        { value: 'summer', label: 'Summer' },
      ],
    },
    { name: 'name', label: 'Display name', type: 'text', required: true, maxLength: 80 },
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
    { name: 'is_current', label: 'Set as current academic term', type: 'checkbox' },
  ],
  columns: [
    {
      label: 'Academic term',
      render: (term) => (
        <>
          <p className="font-semibold text-ink">{term.name}</p>
          <p className="mt-1 text-xs text-ink-muted">
            {term.academic_year} · {termLabels[term.term]}
          </p>
        </>
      ),
    },
    { label: 'Dates', render: (term) => `${term.starts_on} — ${term.ends_on}` },
    { label: 'Status', render: (term) => <AcademicStatusBadge status={term.status} /> },
    { label: 'Current', render: (term) => term.is_current ? <AcademicStatusBadge status="Current" /> : '—' },
  ],
}

export function AcademicTermsPage() {
  return <AcademicManagementPage config={config} />
}
