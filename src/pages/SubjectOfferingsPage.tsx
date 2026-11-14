import { useEffect, useState } from 'react'
import { BookOpenCheck, Check, ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { Card, CardBody } from '@/components/common/Card'
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { TextField } from '@/components/common/TextField'
import { SubjectOfferingDetailsDialog } from '@/components/subjectOfferings/SubjectOfferingDetailsDialog'
import { SubjectOfferingFormDialog } from '@/components/subjectOfferings/SubjectOfferingFormDialog'
import { SubjectOfferingStatusBadge } from '@/components/subjectOfferings/SubjectOfferingStatusBadge'
import { useAuth } from '@/hooks/useAuth'
import {
  createSubjectOffering,
  fetchSubjectOffering,
  fetchSubjectOfferingOptions,
  fetchSubjectOfferings,
  updateSubjectOffering,
  updateSubjectOfferingStatus,
} from '@/services/api/subjectOfferings'
import type {
  SubjectOffering,
  SubjectOfferingDetail,
  SubjectOfferingInput,
  SubjectOfferingOptions,
  SubjectOfferingPagination,
  SubjectOfferingStatus,
  SubjectOfferingUpdateInput,
} from '@/types/subjectOffering'
import { getApiErrorMessage, getApiFieldErrors } from '@/utils/apiError'

const statusOptions: Array<{ value: SubjectOfferingStatus; label: string }> = [
  { value: 'draft', label: 'Draft' },
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const emptyOptions: SubjectOfferingOptions = {
  terms: [],
  programs: [],
  sections: [],
  subjects: [],
}

function canEditOffering(offering: SubjectOffering): boolean {
  return offering.status === 'draft' || offering.status === 'open'
}

function nextStatus(offering: SubjectOffering): 'open' | 'closed' | null {
  if (offering.status === 'draft' || offering.status === 'closed') return 'open'
  if (offering.status === 'open') return 'closed'
  return null
}

function statusActionLabel(offering: SubjectOffering): string {
  if (offering.status === 'draft') return 'Open'
  if (offering.status === 'open') return 'Close'
  if (offering.status === 'closed') return 'Reopen'
  return ''
}

export function SubjectOfferingsPage() {
  const { user } = useAuth()
  const canManage = user?.role === 'administrator' || user?.role === 'department_personnel'
  const [offerings, setOfferings] = useState<SubjectOffering[]>([])
  const [pagination, setPagination] = useState<SubjectOfferingPagination>({
    current_page: 1,
    last_page: 1,
    per_page: 25,
    total: 0,
  })
  const [options, setOptions] = useState<SubjectOfferingOptions>(emptyOptions)
  const [isOptionsLoading, setIsOptionsLoading] = useState(true)
  const [optionsError, setOptionsError] = useState<string | null>(null)
  const [optionsVersion, setOptionsVersion] = useState(0)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<SubjectOfferingStatus | ''>('')
  const [termFilter, setTermFilter] = useState('')
  const [programFilter, setProgramFilter] = useState('')
  const [sectionFilter, setSectionFilter] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [dialogOffering, setDialogOffering] = useState<SubjectOffering | null | undefined>(undefined)
  const [selectedOfferingId, setSelectedOfferingId] = useState<number | null>(null)
  const [detailsOffering, setDetailsOffering] = useState<SubjectOfferingDetail | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [busyOfferingId, setBusyOfferingId] = useState<number | null>(null)
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [detailVersion, setDetailVersion] = useState(0)
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string
    description?: string
    confirmLabel: string
    cancelLabel: string
    destructive: boolean
    onConfirm: () => void | Promise<void>
  } | null>(null)

  useEffect(() => {
    let active = true
    void Promise.resolve().then(async () => {
      setIsOptionsLoading(true)
      setOptionsError(null)
      try {
        const result = await fetchSubjectOfferingOptions()
        if (active) setOptions(result)
      } catch (failure) {
        if (active) setOptionsError(getApiErrorMessage(failure, 'Unable to load academic options.'))
      } finally {
        if (active) setIsOptionsLoading(false)
      }
    })
    return () => {
      active = false
    }
  }, [optionsVersion])

  useEffect(() => {
    let active = true
    void Promise.resolve().then(async () => {
      setIsLoading(true)
      setError(null)
      try {
        const result = await fetchSubjectOfferings({
          search: search || undefined,
          status: statusFilter || undefined,
          academic_term_id: termFilter ? Number(termFilter) : undefined,
          program_id: programFilter ? Number(programFilter) : undefined,
          section_id: sectionFilter ? Number(sectionFilter) : undefined,
          subject_id: subjectFilter ? Number(subjectFilter) : undefined,
          page,
          per_page: 25,
        })
        if (active) {
          setOfferings(result.offerings)
          setPagination(result.pagination)
        }
      } catch (failure) {
        if (active) setError(getApiErrorMessage(failure, 'Unable to load subject offerings.'))
      } finally {
        if (active) setIsLoading(false)
      }
    })
    return () => {
      active = false
    }
  }, [page, programFilter, refreshVersion, search, sectionFilter, statusFilter, subjectFilter, termFilter])

  useEffect(() => {
    if (selectedOfferingId === null) return

    let active = true
    void Promise.resolve().then(async () => {
      try {
        const result = await fetchSubjectOffering(selectedOfferingId)
        if (active) {
          setDetailsOffering(result)
          setDetailError(null)
        }
      } catch (failure) {
        if (active) setDetailError(getApiErrorMessage(failure, 'Unable to load offering details.'))
      } finally {
        if (active) setIsDetailLoading(false)
      }
    })
    return () => {
      active = false
    }
  }, [detailVersion, selectedOfferingId])

  const filteredSectionOptions = options.sections.filter((section) => (
    (!termFilter || section.academic_term_id === Number(termFilter))
    && (!programFilter || section.program_id === Number(programFilter))
  ))

  function refreshDetails() {
    setIsDetailLoading(true)
    setDetailVersion((version) => version + 1)
  }

  function openDetails(offering: SubjectOffering) {
    setDetailsOffering(null)
    setDetailError(null)
    setIsDetailLoading(true)
    setSelectedOfferingId(offering.id)
  }

  function closeDetails() {
    setSelectedOfferingId(null)
    setDetailsOffering(null)
    setDetailError(null)
    setIsDetailLoading(false)
  }

  async function handleSave(payload: SubjectOfferingInput | SubjectOfferingUpdateInput) {
    if (dialogOffering) {
      await updateSubjectOffering(dialogOffering.id, payload)
      setSuccess('Subject offering changes saved.')
    } else {
      await createSubjectOffering(payload as SubjectOfferingInput)
      setSuccess('Subject offering created as a draft.')
      setPage(1)
    }

    setDialogOffering(undefined)
    setRefreshVersion((version) => version + 1)
    if (selectedOfferingId !== null) refreshDetails()
  }

  function requestStatusChange(offering: SubjectOffering) {
    const status = nextStatus(offering)

    if (!status) return

    const action = statusActionLabel(offering)
    const description = status === 'open'
      ? offering.status === 'closed'
        ? `Reopen ${offering.subject.code} - ${offering.section.code}? Eligibility will be revalidated before the offering becomes schedulable.`
        : `Open ${offering.subject.code} - ${offering.section.code}? Only open offerings can receive schedules.`
      : `Close ${offering.subject.code} - ${offering.section.code}? Existing schedules, room allocations, faculty assignments, and enrollments will be preserved.`

    setConfirmDialog({
      title: `${action} offering`,
      description,
      confirmLabel: `${action} offering`,
      cancelLabel: 'Cancel',
      destructive: status === 'closed',
      onConfirm: async () => {
        setConfirmDialog(null)
        setBusyOfferingId(offering.id)
        setError(null)
        setDetailError(null)
        setSuccess(null)

        try {
          await updateSubjectOfferingStatus(offering.id, status)
          setSuccess(
            status === 'closed'
              ? 'Offering closed. Schedules, allocations, faculty assignments, and enrollments were preserved.'
              : offering.status === 'closed'
                ? 'Offering reopened.'
                : 'Offering opened.',
          )
          setRefreshVersion((version) => version + 1)
          if (selectedOfferingId === offering.id) refreshDetails()
        } catch (failure) {
          const fieldMessage = Object.values(getApiFieldErrors(failure)).flat()[0]
          const message = fieldMessage ?? getApiErrorMessage(failure, 'Unable to update offering status.')
          if (selectedOfferingId === offering.id) setDetailError(message)
          else setError(message)
        } finally {
          setBusyOfferingId(null)
        }
      },
    })
  }

  return (
    <>
      <PageHeader
        eyebrow="Academic structure"
        title="Subject offerings"
        description="Manage term-based subject sections, lifecycle status, expected enrollment, and their scheduling readiness."
        actions={canManage ? (
          <Button
            leftIcon={<Plus className="size-4" aria-hidden="true" />}
            disabled={isOptionsLoading || options.terms.length === 0}
            onClick={() => setDialogOffering(null)}
          >
            Add offering
          </Button>
        ) : null}
      />

      {success ? (
        <div role="status" className="mb-5 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
          <Check className="size-4" aria-hidden="true" />
          {success}
          <button type="button" className="ml-auto text-xs font-semibold underline" onClick={() => setSuccess(null)}>
            Dismiss
          </button>
        </div>
      ) : null}

      {optionsError ? (
        <div role="alert" className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p>{optionsError}</p>
          <Button className="mt-3" size="sm" variant="outline" onClick={() => setOptionsVersion((version) => version + 1)}>
            Retry options
          </Button>
        </div>
      ) : null}

      <Card>
        <CardBody>
          <form
            className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
            onSubmit={(event) => {
              event.preventDefault()
              setPage(1)
              setSearch(searchInput.trim())
              setSuccess(null)
            }}
          >
            <TextField
              label="Search offerings"
              name="search"
              type="search"
              value={searchInput}
              placeholder="Subject, section, or term"
              onChange={(event) => setSearchInput(event.target.value)}
            />
            <div className="space-y-1.5">
              <label htmlFor="offering-status-filter" className="block text-sm font-medium text-ink">
                Status
              </label>
              <select
                id="offering-status-filter"
                value={statusFilter}
                onChange={(event) => {
                  const value = event.target.value
                  setPage(1)
                  if (value === '' || statusOptions.some((option) => option.value === value)) {
                    setStatusFilter(value as SubjectOfferingStatus | '')
                  }
                }}
                className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="">All statuses</option>
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="offering-term-filter" className="block text-sm font-medium text-ink">
                Term
              </label>
              <select
                id="offering-term-filter"
                value={termFilter}
                onChange={(event) => {
                  setPage(1)
                  setTermFilter(event.target.value)
                  setSectionFilter('')
                }}
                className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="">All terms</option>
                {options.terms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.academic_year} - {term.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="offering-program-filter" className="block text-sm font-medium text-ink">
                Program
              </label>
              <select
                id="offering-program-filter"
                value={programFilter}
                onChange={(event) => {
                  setPage(1)
                  setProgramFilter(event.target.value)
                  setSectionFilter('')
                }}
                className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="">All programs</option>
                {options.programs.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.code} - {program.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="offering-section-filter" className="block text-sm font-medium text-ink">
                Section
              </label>
              <select
                id="offering-section-filter"
                value={sectionFilter}
                onChange={(event) => {
                  setPage(1)
                  setSectionFilter(event.target.value)
                }}
                className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="">All sections</option>
                {filteredSectionOptions.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.code}
                    {section.program ? ` (${section.program.code})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="offering-subject-filter" className="block text-sm font-medium text-ink">
                Subject
              </label>
              <select
                id="offering-subject-filter"
                value={subjectFilter}
                onChange={(event) => {
                  setPage(1)
                  setSubjectFilter(event.target.value)
                }}
                className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="">All subjects</option>
                {options.subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.code} - {subject.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end xl:col-span-2">
              <Button type="submit" variant="outline" className="w-full sm:w-auto">
                <Search className="size-4" aria-hidden="true" />
                Search
              </Button>
            </div>
          </form>

          {error ? (
            <div role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p>{error}</p>
              <Button className="mt-3" size="sm" variant="outline" onClick={() => setRefreshVersion((version) => version + 1)}>
                Retry
              </Button>
            </div>
          ) : isLoading ? (
            <div className="py-16 text-center text-sm text-ink-muted" role="status">
              Loading subject offerings.
            </div>
          ) : offerings.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                icon={BookOpenCheck}
                title="No subject offerings found"
                description={search || statusFilter || termFilter || programFilter || sectionFilter || subjectFilter
                  ? 'Try adjusting the search or filters.'
                  : 'Create the first draft offering for a term and section to prepare it for scheduling.'}
                action={canManage && !search && !statusFilter && !termFilter && !programFilter && !sectionFilter && !subjectFilter && options.terms.length > 0 ? (
                  <Button onClick={() => setDialogOffering(null)}>Add offering</Button>
                ) : null}
              />
            </div>
          ) : (
            <>
              <div className="mt-5 overflow-x-auto rounded-lg border border-line">
                <table className="w-full min-w-[1100px] text-left text-sm">
                  <thead className="bg-stone-50 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    <tr>
                      <th className="px-4 py-3">Offering</th>
                      <th className="px-4 py-3">Section</th>
                      <th className="px-4 py-3">Term</th>
                      <th className="px-4 py-3">Students</th>
                      <th className="px-4 py-3">Teaching</th>
                      <th className="px-4 py-3">Schedules</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {offerings.map((offering) => (
                      <tr key={offering.id} className="align-top">
                        <td className="px-4 py-4">
                          <p className="font-semibold text-ink">{offering.subject.code}</p>
                          <p className="mt-0.5 text-xs text-ink-muted">{offering.subject.title}</p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-medium text-ink">{offering.section.code}</p>
                          <p className="mt-0.5 text-xs text-ink-muted">
                            {offering.section.program?.code ?? '-'}
                            {offering.section.year_level ? ` | ${offering.section.year_level.name}` : ''}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-ink-muted">
                          {offering.academic_term.academic_year}
                          <p className="mt-0.5 text-xs">{offering.academic_term.name}</p>
                        </td>
                        <td className="px-4 py-4 text-ink-muted">
                          {offering.expected_students ?? '-'} expected
                          <p className="mt-0.5 text-xs">{offering.enrolled_students_count ?? 0} enrolled</p>
                        </td>
                        <td className="px-4 py-4 text-ink-muted">
                          {offering.active_faculty_assignments_count ?? 0} active
                          <p className="mt-0.5 text-xs">faculty assignments</p>
                        </td>
                        <td className="px-4 py-4 text-ink-muted">
                          {offering.published_schedules_count ?? 0} published
                          <p className="mt-0.5 text-xs">class schedules</p>
                        </td>
                        <td className="px-4 py-4">
                          <SubjectOfferingStatusBadge status={offering.status} />
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => openDetails(offering)}>
                              View
                            </Button>
                            {canManage && canEditOffering(offering) ? (
                              <Button size="sm" variant="outline" onClick={() => setDialogOffering(offering)}>
                                Edit
                              </Button>
                            ) : null}
                            {canManage && nextStatus(offering) ? (
                              <Button
                                size="sm"
                                variant={offering.status === 'open' ? 'outline' : 'secondary'}
                                isLoading={busyOfferingId === offering.id}
                                onClick={() => requestStatusChange(offering)}
                              >
                                {statusActionLabel(offering)}
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-ink-muted">
                  {pagination.total} offering{pagination.total === 1 ? '' : 's'} | Page {page} of {pagination.last_page}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    <ChevronLeft className="size-4" aria-hidden="true" />
                    Previous
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={page >= pagination.last_page}
                    onClick={() => setPage((current) => Math.min(pagination.last_page, current + 1))}
                  >
                    Next
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardBody>
      </Card>

      {dialogOffering !== undefined ? (
        <SubjectOfferingFormDialog
          key={dialogOffering?.id ?? 'new'}
          offering={dialogOffering}
          options={options}
          onCancel={() => setDialogOffering(undefined)}
          onSubmit={handleSave}
        />
      ) : null}

      {selectedOfferingId !== null ? (
        <SubjectOfferingDetailsDialog
          offering={detailsOffering}
          isLoading={isDetailLoading}
          error={detailError}
          onClose={closeDetails}
          onRetry={refreshDetails}
        />
      ) : null}

      {confirmDialog && (
        <ConfirmationDialog
          onClose={() => setConfirmDialog(null)}
          title={confirmDialog.title}
          description={confirmDialog.description}
          confirmLabel={confirmDialog.confirmLabel}
          cancelLabel={confirmDialog.cancelLabel}
          destructive={confirmDialog.destructive}
          isLoading={Boolean(busyOfferingId)}
          onConfirm={confirmDialog.onConfirm}
        />
      )}
    </>
  )
}
