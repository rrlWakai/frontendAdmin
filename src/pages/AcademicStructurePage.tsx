import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ExternalLink, Layers3 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardBody } from '@/components/common/Card'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { fetchAcademicDirectory } from '@/services/api/academic'
import type { AcademicMajor, AcademicProgram, AcademicSection, AcademicYearLevel } from '@/types/academic'
import { getApiErrorMessage } from '@/utils/apiError'

type StructureData = {
  programs: AcademicProgram[]
  majors: AcademicMajor[]
  yearLevels: AcademicYearLevel[]
  sections: AcademicSection[]
}

export function AcademicStructurePage() {
  const [data, setData] = useState<StructureData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openPrograms, setOpenPrograms] = useState<Record<number, boolean>>({})

  useEffect(() => {
    let active = true
    setLoading(true)
    void Promise.all([
      fetchAcademicDirectory<AcademicProgram>('programs', { per_page: 100 }),
      fetchAcademicDirectory<AcademicMajor>('majors', { per_page: 100 }),
      fetchAcademicDirectory<AcademicYearLevel>('year-levels', { per_page: 100 }),
      fetchAcademicDirectory<AcademicSection>('sections', { per_page: 100 }),
    ])
      .then(([programs, majors, yearLevels, sections]) => {
        if (!active) return
        setData({
          programs: programs.records,
          majors: majors.records,
          yearLevels: yearLevels.records,
          sections: sections.records,
        })
        setOpenPrograms(Object.fromEntries(programs.records.map((program) => [program.id, true])))
      })
      .catch((failure: unknown) => {
        if (active) setError(getApiErrorMessage(failure, 'Unable to load academic structure.'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  const activeLevels = useMemo(
    () => data?.yearLevels.slice().sort((a, b) => a.level - b.level) ?? [],
    [data?.yearLevels],
  )

  return (
    <>
      <PageHeader
        eyebrow="Academic"
        title="Academic structure"
        description="Manage programs, year levels, specializations, and sections as one connected structure. Academic terms remain managed separately."
        actions={(
          <div className="flex flex-wrap gap-2">
            <Link className="inline-flex h-11 items-center gap-2 rounded-xl bg-maroon-600 px-4 text-sm font-medium text-white hover:bg-maroon-700" to="/academic/academic-years">
              Academic years <ExternalLink className="size-4" aria-hidden="true" />
            </Link>
            <Link className="inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-medium text-ink hover:bg-surface-soft" to="/academic/terms">
              Academic terms <ExternalLink className="size-4" aria-hidden="true" />
            </Link>
          </div>
        )}
      />

      {error ? <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      {loading ? <div role="status" className="py-16 text-center text-sm text-ink-muted">Loading academic structure…</div> : null}
      {!loading && data?.programs.length === 0 ? (
        <EmptyState icon={Layers3} title="No academic programs" description="No programs are configured yet. Add a program through the existing academic program endpoint, then return here to build its structure." />
      ) : null}

      {!loading && data?.programs.length ? (
        <div className="space-y-4">
          {data.programs.map((program) => {
            const majors = data.majors.filter((major) => major.program_id === program.id)
            const sections = data.sections.filter((section) => section.program_id === program.id)
            const isOpen = openPrograms[program.id] ?? true
            return (
              <Card key={program.id} className="overflow-hidden">
                <button type="button" className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-surface-soft" onClick={() => setOpenPrograms((current) => ({ ...current, [program.id]: !isOpen }))} aria-expanded={isOpen}>
                  <span><span className="font-semibold text-ink">{program.code} — {program.name}</span><span className="ml-2 text-xs text-ink-muted">{sections.length} section{sections.length === 1 ? '' : 's'} · {majors.length} specialization{majors.length === 1 ? '' : 's'}</span></span>
                  <ChevronDown className={`size-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>
                {isOpen ? (
                  <CardBody className="border-t border-line">
                    <div className="mb-4 flex flex-wrap gap-2 text-sm">
                      <Link className="font-medium text-maroon-700 hover:underline" to="/academic/programs">Manage programs</Link>
                      <span className="text-ink-muted">·</span>
                      <Link className="font-medium text-maroon-700 hover:underline" to="/academic/majors">Manage specializations</Link>
                      <span className="text-ink-muted">·</span>
                      <Link className="font-medium text-maroon-700 hover:underline" to="/academic/year-levels">Manage year levels</Link>
                      <span className="text-ink-muted">·</span>
                      <Link className="font-medium text-maroon-700 hover:underline" to="/academic/sections">Manage sections</Link>
                    </div>
                    <div className="space-y-3">
                      {activeLevels.map((level) => {
                        const levelSections = sections.filter((section) => section.year_level_id === level.id)
                        const levelMajors = level.level >= 3 ? majors : []
                        return (
                          <div key={level.id} className="rounded-lg border border-line bg-surface-soft p-4">
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                              <h2 className="font-semibold text-ink">{level.name}</h2>
                              <span className="text-xs text-ink-muted">{levelSections.length} section{levelSections.length === 1 ? '' : 's'}</span>
                            </div>
                            {level.level >= 3 && levelMajors.length ? <p className="mt-2 text-xs text-ink-muted">Applicable specializations: {levelMajors.map((major) => major.code).join(', ')}</p> : null}
                            {levelSections.length ? <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{levelSections.map((section) => <div key={section.id} className="rounded-md border border-line bg-white px-3 py-2 text-sm"><p className="font-medium text-ink">{section.code}</p><p className="mt-1 text-xs text-ink-muted">{section.major?.code ?? 'Common curriculum'} · Capacity {section.capacity ?? 'Not set'}</p></div>)}</div> : <p className="mt-3 text-sm text-ink-muted">No sections configured for this year level.</p>}
                          </div>
                        )
                      })}
                    </div>
                  </CardBody>
                ) : null}
              </Card>
            )
          })}
        </div>
      ) : null}
    </>
  )
}
