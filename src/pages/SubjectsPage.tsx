import { AcademicManagementPage } from '@/components/academic/AcademicManagementPage'
import type { AcademicPageConfig } from '@/components/academic/AcademicManagementPage'
import { AcademicStatusBadge } from '@/components/academic/AcademicStatusBadge'
import type { AcademicSubject } from '@/types/academic'

const config: AcademicPageConfig<AcademicSubject> = {
  resource: 'subjects',
  title: 'Subject catalog',
  description: 'Maintain subject codes, titles, descriptions, units, and lecture/laboratory hours.',
  singular: 'Subject',
  searchPlaceholder: 'Subject code or title',
  emptyDescription: 'Subjects will appear here when they are created.',
  statusOptions: [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ],
  fields: [
    { name: 'code', label: 'Subject code', type: 'text', required: true, maxLength: 32 },
    { name: 'title', label: 'Subject title', type: 'text', required: true, maxLength: 160 },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'units', label: 'Units', type: 'number', required: true, min: 0.1, max: 999.9, step: 0.1 },
    { name: 'lecture_hours', label: 'Lecture hours', type: 'number', required: true, min: 0, max: 999.9, step: 0.1, defaultValue: '0' },
    { name: 'lab_hours', label: 'Laboratory hours', type: 'number', required: true, min: 0, max: 999.9, step: 0.1, defaultValue: '0' },
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
      render: (subject) => (
        <>
          <p className="font-semibold text-ink">{subject.title}</p>
          <p className="mt-1 text-xs text-ink-muted">{subject.code}</p>
        </>
      ),
    },
    { label: 'Units', render: (subject) => subject.units },
    { label: 'Lecture / lab hours', render: (subject) => `${subject.lecture_hours} / ${subject.lab_hours}` },
    { label: 'Status', render: (subject) => <AcademicStatusBadge status={subject.status} /> },
  ],
}

export function SubjectsPage() {
  return <AcademicManagementPage config={config} />
}
