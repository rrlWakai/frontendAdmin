import { useEffect, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, GraduationCap, Search } from 'lucide-react'
import { FacultyAvailabilityDialog } from '@/components/faculty/FacultyAvailabilityDialog'
import { FacultyProfileDialog } from '@/components/faculty/FacultyProfileDialog'
import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { Card, CardBody } from '@/components/common/Card'
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
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
} from '@/types/faculty'
import { getApiErrorMessage, getApiFieldErrors } from '@/utils/apiError'

function statusTone(status: string): 'success' | 'danger' | 'neutral' {
  if (status === 'active') return 'success'
  if (status === 'suspended') return 'danger'
  return 'neutral'
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

  async function handleStatusChange(professor: FacultyDirectoryRecord | FacultyDetail) {
    const nextStatus = professor.account_status === 'active' ? 'inactive' : 'active'
    const verb = nextStatus === 'active' ? 'activate' : 'deactivate'

    setConfirmDialog({
      title: `${verb.charAt(0).toUpperCase() + verb.slice(1)} faculty account`,
      description: `Are you sure you want to ${verb} ${professor.name}'s account?`,
      confirmLabel: `${verb.charAt(0).toUpperCase() + verb.slice(1)} account`,
      cancelLabel: 'Keep as is',
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
      description: 'This faculty availability window will be removed.',
      confirmLabel: 'Remove',
      cancelLabel: 'Keep',
      destructive: true,
      onConfirm: async () => {
        setConfirmDialog(null)
        try {
          await deleteFacultyAvailability(availability.id)
          setSuccess('Faculty availability removed.')
          setDetailError(null)
          refreshDetails()
        } catch (failure) {
          setDetailError(getApiErrorMessage(failure, 'Unable to remove faculty availability.'))
        }
      },
    })
  }

  return (
    <>
      <PageHeader
        eyebrow="People directory"
        title="Faculty management"
        description="Review professor profiles, term availability, teaching assignments, and account access."
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
        <CardBody>
          <form
            className="grid gap-3 md:grid-cols-[minmax(14rem,1fr)_12rem_auto]"
            onSubmit={(event) => {
              event.preventDefault()
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
              placeholder="Name, email, or employee number"
              onChange={(event) => setSearchInput(event.target.value)}
            />
            <div className="space-y-1.5">
              <label htmlFor="faculty-status-filter" className="block text-sm font-medium text-ink">
                Account status
              </label>
              <select
                id="faculty-status-filter"
                value={statusFilter}
                onChange={(event) => {
                  const value = event.target.value
                  setPage(1)
                  if (value === '' || value === 'active' || value === 'inactive' || value === 'suspended') {
                    setStatusFilter(value)
                  }
                }}
                className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button type="submit" variant="outline" className="w-full md:w-auto">
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
              Loading faculty…
            </div>
          ) : faculty.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                icon={GraduationCap}
                title="No faculty found"
                description={search || statusFilter
                  ? 'Try adjusting the search or status filter.'
                  : 'Professor accounts and profiles will appear here.'}
              />
            </div>
          ) : (
            <>
              <div className="mt-5 overflow-x-auto rounded-lg border border-line">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead className="bg-stone-50 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    <tr>
                      <th className="px-4 py-3">Faculty member</th>
                      <th className="px-4 py-3">Program</th>
                      <th className="px-4 py-3">Employment</th>
                      <th className="px-4 py-3">Account status</th>
                      <th className="px-4 py-3">Profile status</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {faculty.map((professor) => (
                      <tr key={professor.id} className="align-top">
                        <td className="px-4 py-4">
                          <p className="font-semibold text-ink">{professor.name}</p>
                          <p className="mt-0.5 text-xs text-ink-muted">
                            {professor.employee_number ?? 'No employee number'} · {professor.email}
                          </p>
                          <p className="mt-1 text-xs text-ink-muted">{professor.specialization || 'No specialization listed'}</p>
                        </td>
                        <td className="px-4 py-4 text-ink-muted">
                          {professor.program ? `${professor.program.code} · ${professor.program.name}` : '—'}
                        </td>
                        <td className="px-4 py-4 capitalize text-ink-muted">
                          {professor.employment_type.replace('_', ' ')}
                        </td>
                        <td className="px-4 py-4">
                          <Badge tone={statusTone(professor.account_status)}>{professor.account_status}</Badge>
                        </td>
                        <td className="px-4 py-4">
                          <Badge tone={statusTone(professor.profile_status)}>{professor.profile_status}</Badge>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setProfessorDetail(null)
                              setDetailError(null)
                              setIsDetailLoading(true)
                              setSelectedProfessor(professor)
                            }}
                          >
                            View profile
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-ink-muted">
                  {pagination.total} faculty member{pagination.total === 1 ? '' : 's'} · Page {page} of {pagination.last_page}
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

      {selectedProfessor ? (
        <FacultyProfileDialog
          professor={professorDetail}
          isLoading={isDetailLoading}
          error={detailError}
          canEditProfile={Boolean(canManage && userOptions)}
          isChangingStatus={busyProfessorId === selectedProfessor.id}
          onClose={() => {
            setSelectedProfessor(null)
            setProfessorDetail(null)
          }}
          onEditProfile={() => {
            if (canManage && professorDetail) setDialogUser(toManagedUser(professorDetail))
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
