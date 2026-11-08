import { AcademicManagementPage } from '@/components/academic/AcademicManagementPage'
import type { AcademicPageConfig } from '@/components/academic/AcademicManagementPage'
import type { AcademicYearLevel } from '@/types/academic'

const config: AcademicPageConfig<AcademicYearLevel> = {
  resource: 'year-levels',
  title: 'Year levels',
  description: 'Maintain the shared year-level definitions used by sections.',
  singular: 'Year level',
  searchPlaceholder: 'Year-level name',
  emptyDescription: 'Year levels will appear here when they are created.',
  fields: [
    { name: 'level', label: 'Ordering level', type: 'number', required: true, min: 1, max: 6, step: 1 },
    { name: 'name', label: 'Display name', type: 'text', required: true, maxLength: 32 },
  ],
  columns: [
    { label: 'Order', render: (yearLevel) => <span className="font-semibold text-ink">{yearLevel.level}</span> },
    { label: 'Year level', render: (yearLevel) => yearLevel.name },
  ],
}

export function YearLevelsPage() {
  return <AcademicManagementPage config={config} />
}
