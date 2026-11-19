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

type SectionGroup = {
  key: string
  label: string
  sections: AcademicSection[]
}

export function AcademicStructurePage() {
  const [data, setData] = useState<StructureData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openPrograms, setOpenPrograms] = useState<Record<string, boolean>>({})
  const [openLevels, setOpenLevels] = useState<Record<string, boolean>>({})
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

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
        setOpenPrograms(Object.fromEntries(programs.records.map((program) => [`program-${program.id}`, true])))
        setOpenLevels(Object.fromEntries(
          programs.records.flatMap((program) => yearLevels.records.map((level) => [
            `level-${program.id}-${level.id}`,
            level.level === 1,
          ])),
        ))
        setOpenGroups({})
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

  function toggle(key: string, setter: (update: (current: Record<string, boolean>) => Record<string, boolean>) => void) {
    setter((current) => ({ ...current, [key]: !(current[key] ?? false) }))
  }

  return (
    <>
      <PageHeader
        eyebrow="Academic"
        title="Academic structure"
        description="One connected hierarchy for programs, year levels, specializations, and sections. Academic terms remain managed separately."
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
          <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-line bg-white px-4 py-3 text-sm">
            <span className="font-medium text-ink">Manage records</span>
            <span className="text-ink-muted">·</span>
            <Link className="font-medium text-maroon-700 hover:underline" to="/academic/programs">Programs</Link>
            <Link className="font-medium text-maroon-700 hover:underline" to="/academic/majors">Specializations</Link>
            <Link className="font-medium text-maroon-700 hover:underline" to="/academic/year-levels">Year levels</Link>
            <Link className="font-medium text-maroon-700 hover:underline" to="/academic/sections">Sections</Link>
          </div>

          {data.programs.map((program) => {
            const majors = data.majors.filter((major) => major.program_id === program.id)
            const sections = data.sections.filter((section) => section.program_id === program.id)
            const programKey = `program-${program.id}`
            const isProgramOpen = openPrograms[programKey] ?? true
            return (
              <Card key={program.id} className="overflow-hidden">
                <button type="button" className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-surface-soft" onClick={() => toggle(programKey, setOpenPrograms)} aria-expanded={isProgramOpen}>
                  <span>
                    <span className="font-semibold text-ink">{program.code} — {program.name}</span>
                    <span className="ml-2 text-xs text-ink-muted">{sections.length} section{sections.length === 1 ? '' : 's'} · {majors.length} specialization{majors.length === 1 ? '' : 's'}</span>
                  </span>
                  <ChevronDown className={`size-5 transition-transform ${isProgramOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>
                {isProgramOpen ? (
                  <CardBody className="border-t border-line">
                    <div className="space-y-3">
                      {activeLevels.map((level) => {
                        const levelKey = `level-${program.id}-${level.id}`
                        const isLevelOpen = openLevels[levelKey] ?? true
                        const levelSections = sections.filter((section) => section.year_level_id === level.id)
                        const groups: SectionGroup[] = level.level >= 3
                          ? [
                              ...majors.map((major) => ({
                                key: `group-${program.id}-${level.id}-major-${major.id}`,
                                label: `${major.code} — ${major.name}`,
                                sections: levelSections.filter((section) => section.major_id === major.id),
                              })),
                              {
                                key: `group-${program.id}-${level.id}-common`,
                                label: 'Common curriculum',
                                sections: levelSections.filter((section) => section.major_id === null),
                              },
                            ]
                          : [{
                              key: `group-${program.id}-${level.id}-common`,
                              label: 'Common curriculum',
                              sections: levelSections,
                            }]

                        return (
                          <div key={level.id} className="rounded-lg border border-line bg-surface-soft p-4">
                            <button type="button" className="flex w-full items-center justify-between gap-2 text-left" onClick={() => toggle(levelKey, setOpenLevels)} aria-expanded={isLevelOpen}>
                              <span className="flex flex-wrap items-baseline gap-2">
                                <span className="font-semibold text-ink">{level.name}</span>
                                <span className="text-xs text-ink-muted">{levelSections.length} section{levelSections.length === 1 ? '' : 's'}</span>
                              </span>
                              <ChevronDown className={`size-4 transition-transform ${isLevelOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                            </button>
                            {isLevelOpen ? (
                              <div className="mt-3 space-y-2">
                                {groups.map((group) => {
                                  const isGroupOpen = openGroups[group.key] ?? group.sections.length > 0
                                  return (
                                    <div key={group.key} className="rounded-md border border-line bg-white">
                                      <button type="button" className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left" onClick={() => toggle(group.key, setOpenGroups)} aria-expanded={isGroupOpen}>
                                        <span className="text-sm font-medium text-ink">{group.label}</span>
                                        <span className="flex items-center gap-2 text-xs text-ink-muted">
                                          {group.sections.length} section{group.sections.length === 1 ? '' : 's'}
                                          <ChevronDown className={`size-4 transition-transform ${isGroupOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                                        </span>
                                      </button>
                                      {isGroupOpen ? (
                                        group.sections.length ? (
                                          <div className="grid gap-2 border-t border-line p-3 sm:grid-cols-2 lg:grid-cols-3">
                                            {group.sections.map((section) => (
                                              <div key={section.id} className="rounded-md border border-line bg-surface-soft px-3 py-2 text-sm">
                                                <p className="font-medium text-ink">{section.code}</p>
                                                <p className="mt-1 text-xs text-ink-muted">Capacity {section.capacity ?? 'Not set'}</p>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <p className="border-t border-line px-3 py-2 text-xs text-ink-muted">No sections configured for this specialization.</p>
                                        )
                                      ) : null}
                                    </div>
                                  )
                                })}
                              </div>
                            ) : null}
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
