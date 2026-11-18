import { useSearchParams } from 'react-router-dom'
import { AcademicPage } from '@/pages/AcademicPage'
import { AcademicTermsPage } from '@/pages/AcademicTermsPage'
import { AcademicYearsPage } from '@/pages/AcademicYearsPage'
import { CurriculumRequirementsPage } from '@/pages/CurriculumRequirementsPage'
import { MajorSelectionPeriodsPage } from '@/pages/MajorSelectionPeriodsPage'
import { MajorsPage } from '@/pages/MajorsPage'
import { SectionsPage } from '@/pages/SectionsPage'
import { YearLevelsPage } from '@/pages/YearLevelsPage'
import { cn } from '@/utils/cn'

const tabs = [
  { key: 'programs', label: 'Programs' },
  { key: 'year-levels', label: 'Year levels' },
  { key: 'majors', label: 'Majors' },
  { key: 'curriculum', label: 'Curriculum' },
  { key: 'academic-years', label: 'Academic years' },
  { key: 'terms', label: 'Terms' },
  { key: 'sections', label: 'Sections' },
  { key: 'selection-periods', label: 'Major selection periods' },
] as const

type TabKey = (typeof tabs)[number]['key']

function isTabKey(value: string | null): value is TabKey {
  return tabs.some((tab) => tab.key === value)
}

export function AcademicStructurePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const requested = searchParams.get('tab')
  const active: TabKey = isTabKey(requested) ? requested : 'programs'

  return (
    <div>
      <nav
        aria-label="Academic structure sections"
        className="mb-6 flex flex-wrap gap-1.5 rounded-xl border border-line bg-white p-1.5 shadow-sm"
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            aria-current={active === tab.key ? 'page' : undefined}
            onClick={() => {
              const next = new URLSearchParams(searchParams)
              next.set('tab', tab.key)
              setSearchParams(next, { replace: true })
            }}
            className={cn(
              'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              active === tab.key
                ? 'bg-maroon-600 text-white shadow-sm'
                : 'text-ink-muted hover:bg-maroon-50 hover:text-maroon-700',
            )}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {active === 'programs' ? <AcademicPage /> : null}
      {active === 'year-levels' ? <YearLevelsPage /> : null}
      {active === 'majors' ? <MajorsPage /> : null}
      {active === 'curriculum' ? <CurriculumRequirementsPage /> : null}
      {active === 'academic-years' ? <AcademicYearsPage /> : null}
      {active === 'terms' ? <AcademicTermsPage /> : null}
      {active === 'sections' ? <SectionsPage /> : null}
      {active === 'selection-periods' ? <MajorSelectionPeriodsPage /> : null}
    </div>
  )
}
