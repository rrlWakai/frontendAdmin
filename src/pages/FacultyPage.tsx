import { useEffect, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, GraduationCap, Search } from 'lucide-react'
import { FacultyAvailabilityDialog } from '@/components/faculty/FacultyAvailabilityDialog'
import { FacultyProfileDialog } from '@/components/faculty/FacultyProfileDialog'
import { FacultyQuotaDialog } from '@/components/faculty/FacultyQuotaDialog'
import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { Card, CardBody, CardHeader } from '@/components/common/Card'
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { SelectField } from '@/components/common/SelectField'
import { TextField } from '@/components/common/TextField'
import { UserFormDialog } from '@/components/users/UserFormDialog'
import { useAuth } from '@/hooks/useAuth'
import {
  createFacultyAvailability,
  createFacultyAvailabilityBatch,
  deleteFacultyAvailability,
  fetchFaculty,
  fetchProfessor,
  updateFacultyAvailability,
  updateFacultyQuota,
} from '@/services/api/faculty'
import { fetchAcademicOptions } from '@/services/api/academic'
import {
  fetchUserOptions,
  updateUser,
  updateUserStatus,
} from '@/services/api/users'
import type { AcademicOptions } from '@/types/academic'
import type {
  AccountFormSubmission,
  AccountStatus,
  ManagedUser,
  ProgramOption,
  UpdateUserInput,
  UserOptions,
} from '@/types/users'
import type {
  FacultyAvailabilityBatchInput,
  FacultyAvailabilityInput,
  FacultyAvailabilityRecord,
  FacultyDetail,
  FacultyDirectoryRecord,
  FacultyPagination,
  FacultyWorkloadStatus,
  FacultyWorkloadSummary,
} from '@/types/faculty'
import { getApiErrorMessage, getApiFieldErrors } from '@/utils/apiError'

function statusTone(status: string): 'success' | 'danger' | 'neutral' {
  if (status === 'active') return 'success'
  if (status === 'suspended') return 'danger'
  return 'neutral'
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)

  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || '?'
}

const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
]

function formatWorkloadHours(value: number | null): string {
  if (value === null) return '—'

  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value)} h`
}

function workloadStatusLabel(status: FacultyWorkloadStatus): string {
  switch (status) {
    case 'within_quota':
      return 'Within quota'
    case 'at_quota':
      return 'At quota'
    case 'exceeds_quota':
      return 'Exceeds quota'
    case 'no_current_term':
      return 'No current term'
    case 'multiple_current_terms':
      return 'Multiple current terms'
    case 'incomplete':
      return 'Incomplete workload'
    default:
      return 'Quota not configured'
  }
}

function workloadStatusTone(
  status: FacultyWorkloadStatus,
): 'success' | 'warning' | 'danger' | 'neutral' {
  switch (status) {
    case 'within_quota':
      return 'success'
    case 'at_quota':
      return 'warning'
    case 'exceeds_quota':
      return 'danger'
    case 'no_current_term':
    case 'multiple_current_terms':
    case 'incomplete':
      return 'warning'
    default:
      return 'neutral'
  }
}

function workloadProgressWidth(workload: FacultyWorkloadSummary): number {
  if (!workload.calculation_complete) return 0

  const quota = workload.weekly_quota

  if (quota === null) return 0
  if (quota <= 0) return workload.assigned_hours > 0 ? 100 : 0

  return Math.min(100, Math.max(0, (workload.assigned_hours / quota) * 100))
}

function workloadProgressTone(status: FacultyWorkloadStatus): string {
  if (status === 'exceeds_quota') return 'bg-red-500'
  if (status === 'at_quota') return 'bg-amber-500'
  if (status === 'within_quota') return 'bg-emerald-500'

  return 'bg-stone-300'
}

function toManagedUser(professor: FacultyDetail): ManagedUser {
  const program: ProgramOption | null = professor.program
    ? {
        id: professor.program.id,
        code: professor.program.code,
        name: professor.program.name,
        status: professor.program.status,
      }
    : null

  return {
    id: professor.user_id,
    name: professor.name,
    email: professor.email,
    role: { code: 'professor', name: 'Professor' },
    status: professor.account_status,
    last_login_at: null,
    program_access: [],
    profile: {
      type: 'professor',
      employee_number: professor.employee_number ?? '',
      employment_type: professor.employment_type,
      specialization: professor.specialization,
      program,
    },
  }
}

export function FacultyPage() {
  const { user } = useAuth()
  const canManage = user?.role === 'administrator' || user?.role === 'department_personnel'
  const canManageQuota = user?.role === 'administrator'
  const [faculty, setFaculty] = useState<FacultyDirectoryRecord[]>([])
  const [pagination, setPagination] = useState<FacultyPagination>({
    current_page: 1,
    last_page: 1,
    per_page: 25,
    total: 0,
  })
  const [userOptions, setUserOptions] = useState<UserOptions | null>(null)
  const [academicOptions, setAcademicOptions] = useState<AcademicOptions | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<AccountStatus | ''>('')
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [optionsError, setOptionsError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [selectedProfessor, setSelectedProfessor] = useState<FacultyDirectoryRecord | null>(null)
  const [professorDetail, setProfessorDetail] = useState<FacultyDetail | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [dialogUser, setDialogUser] = useState<ManagedUser | undefined>()
  const [quotaTarget, setQuotaTarget] = useState<FacultyDetail | null>(null)
  const [availabilityDraft, setAvailabilityDraft] = useState<FacultyAvailabilityRecord | 'new' | null>(null)
  const [busyProfessorId, setBusyProfessorId] = useState<number | null>(null)
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [detailVersion, setDetailVersion] = useState(0)
  const [optionsVersion, setOptionsVersion] = useState(0)
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
      setOptionsError(null)
      try {
        const [accounts, academics] = await Promise.all([
          fetchUserOptions(),
          fetchAcademicOptions(),
        ])
        if (active) {
          setUserOptions(accounts)
          setAcademicOptions(academics)
        }
      } catch (failure) {
        if (active) setOptionsError(getApiErrorMessage(failure, 'Unable to load faculty form options.'))
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
        const result = await fetchFaculty({
          search: search || undefined,
          status: statusFilter || undefined,
          page,
          per_page: 25,
        })
        if (active) {
          setFaculty(result.faculty)
          setPagination(result.pagination)
        }
      } catch (failure) {
        if (active) setError(getApiErrorMessage(failure, 'Unable to load faculty records.'))
      } finally {
        if (active) setIsLoading(false)
      }
    })
    return () => {
      active = false
    }
  }, [page, refreshVersion, search, statusFilter])

  useEffect(() => {
    if (!selectedProfessor) return

    let active = true
    void Promise.resolve().then(async () => {
      try {
        const result = await fetchProfessor(selectedProfessor.id)
        if (active) {
          setProfessorDetail(result)
          setDetailError(null)
        }
      } catch (failure) {
        if (active) setDetailError(getApiErrorMessage(failure, 'Unable to load faculty profile.'))
      } finally {
        if (active) setIsDetailLoading(false)
      }
    })
    return () => {
      active = false
    }
  }, [detailVersion, selectedProfessor])

  function refreshDetails() {
    setIsDetailLoading(true)
    setDetailVersion((version) => version + 1)
  }

  async function handleProfileSave(input: AccountFormSubmission) {
    if (!dialogUser) return
    const update: UpdateUserInput = {
      name: input.name,
      email: input.email,
      ...(input.password
        ? {
            password: input.password,
            password_confirmation: input.password_confirmation,
          }
        : {}),
      ...(input.profile ? { profile: input.profile } : {}),
    }

    await updateUser(dialogUser.id, update)
    setSuccess('Faculty profile updated.')
    setDialogUser(undefined)
    setRefreshVersion((version) => version + 1)
    refreshDetails()
  }

  async function handleQuotaSave(quota: number | null) {
    if (!quotaTarget) return

    await updateFacultyQuota(quotaTarget.id, quota)
    setSuccess(quota === null ? 'Weekly teaching-hour quota cleared.' : 'Weekly teaching-hour quota updated.')
    setQuotaTarget(null)
    setRefreshVersion((version) => version + 1)
    refreshDetails()
  }

  async function handleStatusChange(professor: FacultyDirectoryRecord | FacultyDetail) {
    const nextStatus = professor.account_status === 'active' ? 'inactive' : 'active'
    const verb = nextStatus === 'active' ? 'activate' : 'deactivate'

    setConfirmDialog({
      title: `${verb.charAt(0).toUpperCase() + verb.slice(1)} faculty account`,
      description: `Are you sure you want to ${verb} ${professor.name}'s account?`,
      confirmLabel: `${verb.charAt(0).toUpperCase() + verb.slice(1)} account`,
      cancelLabel: 'Cancel',
      destructive: nextStatus === 'inactive',
      onConfirm: async () => {
        setConfirmDialog(null)
        setBusyProfessorId(professor.id)
        setError(null)
        setDetailError(null)
        setSuccess(null)

        try {
          await updateUserStatus(professor.user_id, nextStatus)
          setSuccess(`${professor.name}'s account was ${nextStatus === 'active' ? 'activated' : 'deactivated'}.`)
          setRefreshVersion((version) => version + 1)
          refreshDetails()
        } catch (failure) {
          const message = getApiFieldErrors(failure).status?.[0]
            ?? getApiErrorMessage(failure, 'Unable to update faculty account status.')
          if (selectedProfessor) setDetailError(message)
          else setError(message)
        } finally {
          setBusyProfessorId(null)
        }
      },
    })
  }

  async function handleAvailabilitySave(
    input: FacultyAvailabilityInput | FacultyAvailabilityBatchInput,
  ) {
    if (!selectedProfessor || !availabilityDraft) return
    if (availabilityDraft === 'new') {
      if ('windows' in input) {
        try {
          const created = await createFacultyAvailabilityBatch(selectedProfessor.id, input)
          setSuccess(`${created.length} faculty availability window${created.length === 1 ? '' : 's'} created.`)
        } catch (failure) {
          refreshDetails()
          throw failure
        }
      } else {
        await createFacultyAvailability(selectedProfessor.id, input)
        setSuccess('Faculty availability created.')
      }
    } else {
      if ('windows' in input) throw new Error('Batch availability cannot update an existing window.')
      await updateFacultyAvailability(availabilityDraft.id, input)
      setSuccess('Faculty availability updated.')
    }
    setAvailabilityDraft(null)
    refreshDetails()
  }

  async function handleAvailabilityDelete(availability: FacultyAvailabilityRecord) {
    setConfirmDialog({
      title: 'Remove availability window',
      description: 'This faculty availability window will be removed. This action cannot be undone.',
      confirmLabel: 'Remove availability window',
      cancelLabel: 'Keep',
      destructive: true,
      onConfirm: async () => {
        setBusyProfessorId(selectedProfessor?.id ?? null)
        try {
          await deleteFacultyAvailability(availability.id)
          setSuccess('Faculty availability removed.')
          setDetailError(null)
          setConfirmDialog(null)
          refreshDetails()
        } catch (failure) {
          setDetailError(getApiErrorMessage(failure, 'Unable to remove faculty availability.'))
        } finally {
          setBusyProfessorId(null)
        }
      },
    })
  }

  return (
    <>
      <PageHeader
        eyebrow="People directory"
        title="Faculty management"
        description="Review faculty profiles, availability, teaching assignments, workload, and account access."
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
        <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p>{optionsError}</p>
          <Button
            className="mt-3"
            size="sm"
            variant="outline"
            onClick={() => {
              setOptionsError(null)
              setOptionsVersion((version) => version + 1)
            }}
          >
            Retry options
          </Button>
        </div>
      ) : null}

      <Card>
        <CardHeader className="space-y-1 sm:flex sm:items-end sm:justify-between sm:gap-4 sm:space-y-0">
          <div>
            <h3 className="text-sm font-semibold text-ink">Directory</h3>
            <p className="mt-0.5 text-xs text-ink-muted">
              Search faculty and review employment, program, workload, and account status.
            </p>
          </div>
          <p className="text-xs font-medium tabular-nums text-ink-muted">
            {pagination.total} faculty member{pagination.total === 1 ? '' : 's'}
            {search || statusFilter ? ' · filtered' : ''}
          </p>
        </CardHeader>
        <CardBody className="space-y-5">
          <form
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(16rem,1fr)_13rem_auto] lg:items-end"
            onSubmit={(event) => {
              event.preventDefault()
              if (isLoading) return
              setPage(1)
              setSearch(searchInput.trim())
              setSuccess(null)
            }}
          >
            <TextField
              label="Search faculty"
              name="search"
              type="search"
              value={searchInput}
              disabled={isLoading}
              placeholder="Name, email, or employee number"
              onChange={(event) => setSearchInput(event.target.value)}
            />
            <SelectField
              label="Account status"
              value={statusFilter}
              disabled={isLoading}
              options={statusOptions}
              hint={statusFilter ? `Showing ${statusFilter} accounts` : undefined}
              onChange={(value) => {
                setPage(1)
                if (value === '' || value === 'active' || value === 'inactive' || value === 'suspended') {
                  setStatusFilter(value)
                }
              }}
            />
            <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-1 lg:justify-end">
              {search || statusFilter || searchInput ? (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isLoading}
                  onClick={() => {
                    setSearchInput('')
                    setSearch('')
                    setStatusFilter('')
                    setPage(1)
                    setSuccess(null)
                  }}
                >
                  Reset
                </Button>
              ) : null}
              <Button type="submit" className="min-w-[7rem] flex-1 sm:flex-none" disabled={isLoading}>
                <Search className="size-4" aria-hidden="true" />
                Search
              </Button>
            </div>
          </form>

          {error ? (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p>{error}</p>
              <Button className="mt-3" size="sm" variant="outline" onClick={() => setRefreshVersion((version) => version + 1)}>
                Retry
              </Button>
            </div>
          ) : isLoading ? (
            <div className="py-16 text-center text-sm text-ink-muted" role="status">
              Loading faculty…
            </div>
          ) : faculty.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="No faculty found"
              description={search || statusFilter
                ? 'Try adjusting the search or account status filter.'
                : 'Professor accounts and profiles will appear here.'}
              action={search || statusFilter ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchInput('')
                    setSearch('')
                    setStatusFilter('')
                    setPage(1)
                  }}
                >
                  Clear filters
                </Button>
              ) : undefined}
            />
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-lg border border-line">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <caption className="sr-only">Faculty directory</caption>
                  <thead className="bg-stone-50 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    <tr>
                      <th scope="col" className="w-[30%] px-4 py-3">Faculty member</th>
                      <th scope="col" className="w-[18%] px-4 py-3">Program / department</th>
                      <th scope="col" className="w-[12%] px-4 py-3">Employment</th>
                      <th scope="col" className="w-[22%] px-4 py-3">Weekly workload</th>
                      <th scope="col" className="w-[12%] px-4 py-3">Status</th>
                      <th scope="col" className="w-[6%] px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line bg-white">
                    {faculty.map((professor) => {
                      const isOpening = selectedProfessor?.id === professor.id && isDetailLoading

                      return (
                        <tr key={professor.id} className="align-top transition-colors hover:bg-stone-50/60">
                          <td className="px-4 py-4">
                            <div className="flex gap-3">
                              <span
                                className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-maroon-100 bg-maroon-50 text-xs font-semibold text-maroon-700"
                                aria-hidden="true"
                              >
                                {initials(professor.name)}
                              </span>
                              <div className="min-w-0">
                                <p className="font-semibold leading-5 text-ink">{professor.name}</p>
                                <p className="mt-0.5 text-xs text-ink-muted">
                                  {professor.employee_number ?? 'No employee number'}
                                </p>
                                <p className="mt-0.5 max-w-[22rem] break-all text-xs text-ink-muted">
                                  {professor.email}
                                </p>
                                <p className="mt-1 text-xs text-ink-muted">
                                  {professor.specialization || 'No specialization listed'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-ink-muted">
                            {professor.program ? (
                              <div>
                                <p className="font-medium text-ink">{professor.program.code}</p>
                                <p className="mt-0.5 text-xs leading-5">{professor.program.name}</p>
                              </div>
                            ) : (
                              <span>—</span>
                            )}
                          </td>
                          <td className="px-4 py-4 capitalize text-ink-muted">
                            {professor.employment_type.replaceAll('_', ' ')}
                          </td>
                          <td className="px-4 py-4">
                            <div className="max-w-[14rem] space-y-1.5">
                              <p className="text-sm font-semibold tabular-nums text-ink">
                                {formatWorkloadHours(professor.workload.assigned_hours)}
                                <span className="font-normal text-ink-muted">
                                  {' / '}
                                  {professor.workload.weekly_quota === null
                                    ? 'No quota'
                                    : formatWorkloadHours(professor.workload.weekly_quota)}
                                </span>
                              </p>
                              <p className="text-[11px] text-ink-muted">Assigned / weekly quota</p>
                              {professor.workload.weekly_quota === null ? null : (
                                <div
                                  className="h-1.5 overflow-hidden rounded-full bg-stone-200"
                                  aria-hidden="true"
                                >
                                  <div
                                    className={`h-full rounded-full ${workloadProgressTone(professor.workload.status)}`}
                                    style={{ width: `${workloadProgressWidth(professor.workload)}%` }}
                                  />
                                </div>
                              )}
                              <div className="flex flex-wrap gap-1.5">
                                <Badge tone={workloadStatusTone(professor.workload.status)}>
                                  {workloadStatusLabel(professor.workload.status)}
                                </Badge>
                                {professor.workload.has_discrepancies ? (
                                  <Badge tone="warning">Schedule variance</Badge>
                                ) : null}
                              </div>
                              {professor.workload.issues_count > 0 ? (
                                <p className="text-[11px] font-medium text-amber-700">
                                  {professor.workload.issues_count} workload issue
                                  {professor.workload.issues_count === 1 ? '' : 's'} need attention
                                </p>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-wrap gap-1.5">
                              <Badge tone={statusTone(professor.account_status)}>{professor.account_status}</Badge>
                              <Badge tone={statusTone(professor.profile_status)}>
                                {professor.profile_status} profile
                              </Badge>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isOpening}
                              aria-label={`View profile for ${professor.name}`}
                              onClick={() => {
                                setProfessorDetail(null)
                                setDetailError(null)
                                setIsDetailLoading(true)
                                setSelectedProfessor(professor)
                              }}
                            >
                              {isOpening ? 'Opening…' : 'View profile'}
                              {!isOpening ? <ChevronRight className="size-4" aria-hidden="true" /> : null}
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-ink-muted">
                  Page {page} of {pagination.last_page} · {pagination.total} faculty member{pagination.total === 1 ? '' : 's'}
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
            </div>
          )}
        </CardBody>
      </Card>

      {selectedProfessor ? (
        <FacultyProfileDialog
          professor={professorDetail}
          isLoading={isDetailLoading}
          error={detailError}
          canEditProfile={Boolean(canManage && userOptions)}
          canManageQuota={canManageQuota}
          isChangingStatus={busyProfessorId === selectedProfessor.id}
          onClose={() => {
            setSelectedProfessor(null)
            setProfessorDetail(null)
            setQuotaTarget(null)
          }}
          onEditProfile={() => {
            if (canManage && professorDetail) setDialogUser(toManagedUser(professorDetail))
          }}
          onEditQuota={() => {
            if (canManageQuota && professorDetail) setQuotaTarget(professorDetail)
          }}
          onToggleStatus={() => {
            if (canManage && professorDetail) void handleStatusChange(professorDetail)
          }}
          onAddAvailability={() => setAvailabilityDraft('new')}
          onEditAvailability={(availability) => setAvailabilityDraft(availability)}
          onDeleteAvailability={(availability) => void handleAvailabilityDelete(availability)}
          onRetry={() => {
            setDetailError(null)
            refreshDetails()
          }}
        />
      ) : null}

      {dialogUser && userOptions ? (
        <UserFormDialog
          key={dialogUser.id}
          user={dialogUser}
          roles={userOptions.roles}
          programs={userOptions.programs}
          onCancel={() => setDialogUser(undefined)}
          onSubmit={handleProfileSave}
        />
      ) : null}

      {quotaTarget ? (
        <FacultyQuotaDialog
          key={quotaTarget.id}
          professorName={quotaTarget.name}
          quota={quotaTarget.workload.weekly_quota}
          onCancel={() => setQuotaTarget(null)}
          onSubmit={handleQuotaSave}
        />
      ) : null}

      {selectedProfessor && availabilityDraft !== null ? (
        <FacultyAvailabilityDialog
          key={availabilityDraft === 'new' ? 'new' : availabilityDraft.id}
          availability={availabilityDraft === 'new' ? null : availabilityDraft}
          savedAvailability={professorDetail?.availability ?? []}
          professorName={selectedProfessor.name}
          terms={academicOptions?.terms ?? []}
          onCancel={() => setAvailabilityDraft(null)}
          onSubmit={handleAvailabilitySave}
          onEditSaved={(availability) => setAvailabilityDraft(availability)}
          onDeleteSaved={(availability) => void handleAvailabilityDelete(availability)}
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
          isLoading={Boolean(busyProfessorId)}
          onConfirm={confirmDialog.onConfirm}
        />
      )}
    </>
  )
}
