import { useEffect, useState } from 'react'
import { Building2, Check, ChevronLeft, ChevronRight, Search, UserRoundCog } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { Card, CardBody } from '@/components/common/Card'
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { TextField } from '@/components/common/TextField'
import { UserFormDialog } from '@/components/users/UserFormDialog'
import { ProfessorRegistrationReviewDialog } from '@/components/users/ProfessorRegistrationReviewDialog'
import { DepartmentManagerDialog } from '@/components/users/DepartmentManagerDialog'
import { DepartmentPersonnelProgramAccessDialog } from '@/components/users/DepartmentPersonnelProgramAccessDialog'
import { useAuth } from '@/hooks/useAuth'
import {
  fetchUser,
  fetchUserOptions,
  fetchUsers,
  createDepartment,
  reviewProfessorRegistration,
  updateDepartmentPersonnelProgramAccess,
  updateUser,
  updateUserStatus,
} from '@/services/api/users'
import type { ProfessorReviewAction } from '@/services/api/users'
import type {
  AccountFormSubmission,
  ManagedRole,
  ManagedUser,
  UpdateUserInput,
  UserOptions,
} from '@/types/users'
import { getApiErrorMessage, getApiFieldErrors } from '@/utils/apiError'

const roleLabels: Record<ManagedRole, string> = {
  administrator: 'Administrator',
  department_personnel: 'Department Personnel',
  professor: 'Professor',
  student: 'Student',
}

function statusTone(status: ManagedUser['status']) {
  if (status === 'active') return 'success'
  if (status === 'suspended' || status === 'rejected') return 'danger'
  return 'neutral'
}

function formatLastLogin(value: string | null): string {
  if (!value) return 'Never'

  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Unknown'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date)
}

export function UsersPage() {
  const { user: signedInUser } = useAuth()
  const isAdministrator = signedInUser?.role === 'administrator'
  const [accounts, setAccounts] = useState<ManagedUser[]>([])
  const [options, setOptions] = useState<UserOptions | null>(null)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [overview, setOverview] = useState<{
    total_accounts: number
    active_accounts: number
    pending_approvals: number
    deactivated_accounts: number
  } | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingOptions, setIsLoadingOptions] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [optionsError, setOptionsError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [dialogUser, setDialogUser] = useState<ManagedUser | null | undefined>()
  const [programAccessUser, setProgramAccessUser] = useState<ManagedUser | null>(null)
  const [reviewUser, setReviewUser] = useState<ManagedUser | null>(null)
  const [isManagingDepartments, setIsManagingDepartments] = useState(false)
  const [isLoadingReview, setIsLoadingReview] = useState(false)
  const [busyUserId, setBusyUserId] = useState<number | null>(null)
  const [refreshVersion, setRefreshVersion] = useState(0)
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
      setIsLoadingOptions(true)
      setOptionsError(null)

      try {
        const result = await fetchUserOptions()
        if (active) setOptions(result)
      } catch (optionsFailure) {
        if (active) {
          setOptionsError(getApiErrorMessage(optionsFailure, 'Unable to load account options.'))
        }
      } finally {
        if (active) setIsLoadingOptions(false)
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
        const result = await fetchUsers({
          search: search || undefined,
          role: roleFilter || undefined,
          status: statusFilter || undefined,
          page,
          per_page: 25,
        })

        if (active) {
          setAccounts(result.users)
          setLastPage(result.pagination.last_page)
          setTotal(result.pagination.total)
          setOverview(result.overview)
        }
      } catch (loadFailure) {
        if (active) {
          setError(getApiErrorMessage(loadFailure, 'Unable to load accounts.'))
        }
      } finally {
        if (active) setIsLoading(false)
      }
    })

    return () => {
      active = false
    }
  }, [page, refreshVersion, roleFilter, search, statusFilter])

  function refreshAccounts() {
    setRefreshVersion((version) => version + 1)
  }

  async function handleSave(input: AccountFormSubmission) {
    if (dialogUser) {
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
      setSuccess('Account changes saved.')
    } else {
      throw new Error('Account creation is not available from this directory.')
    }

    setDialogUser(undefined)
    refreshAccounts()
  }

  async function handleProgramAccessSave(programIds: number[]) {
    if (!programAccessUser) return

    await updateDepartmentPersonnelProgramAccess(programAccessUser.id, programIds)
    setSuccess(`Attendance program access updated for ${programAccessUser.name}.`)
    setProgramAccessUser(null)
    refreshAccounts()
  }

  async function handleReviewAction(action: ProfessorReviewAction, reason?: string) {
    if (!reviewUser) return

    await reviewProfessorRegistration(reviewUser.id, action, reason)
    setSuccess(`Professor registration ${action === 'approve' ? 'approved' : action === 'return' ? 'returned for correction' : 'rejected'}.`)
    setReviewUser(null)
    refreshAccounts()
  }

  async function handleAddDepartment(input: { code: string; name: string }) {
    await createDepartment(input)
    setSuccess(`${input.name} was added to the department options.`)
    setOptionsVersion((version) => version + 1)
  }

  async function openReview(account: ManagedUser) {
    setIsLoadingReview(true)
    setError(null)
    try {
      setReviewUser(await fetchUser(account.id))
    } catch (reviewFailure) {
      setError(getApiErrorMessage(reviewFailure, 'Unable to load professor registration details.'))
    } finally {
      setIsLoadingReview(false)
    }
  }

  async function handleStatusChange(account: ManagedUser) {
    const nextStatus = account.status === 'active' ? 'inactive' : 'active'
    const verb = nextStatus === 'active' ? 'activate' : 'deactivate'

    setConfirmDialog({
      title: `${verb.charAt(0).toUpperCase() + verb.slice(1)} account`,
      description: `Are you sure you want to ${verb} ${account.name}'s account?`,
      confirmLabel: `${verb.charAt(0).toUpperCase() + verb.slice(1)} account`,
      cancelLabel: 'Keep as is',
      destructive: nextStatus === 'inactive',
      onConfirm: async () => {
        setConfirmDialog(null)
        setBusyUserId(account.id)
        setError(null)
        setSuccess(null)

        try {
          await updateUserStatus(account.id, nextStatus)
          setSuccess(`${account.name}'s account was ${nextStatus === 'active' ? 'activated' : 'deactivated'}.`)
          refreshAccounts()
        } catch (statusFailure) {
          setError(
            getApiFieldErrors(statusFailure).status?.[0] ??
              getApiErrorMessage(statusFailure, 'Unable to update account status.'),
          )
        } finally {
          setBusyUserId(null)
        }
      },
    })
  }

  const visibleRoles = isAdministrator
    ? (Object.keys(roleLabels) as ManagedRole[])
    : (['professor', 'student'] as ManagedRole[])

  return (
    <>
      <PageHeader
        eyebrow="People directory"
        title="Users & access"
        description="Manage account access and the identity records used by the academic workspaces."
        actions={isAdministrator ? (
          <Button
            variant="outline"
            disabled={isLoadingOptions || !options}
            onClick={() => setIsManagingDepartments(true)}
            leftIcon={<Building2 className="size-4" aria-hidden="true" />}
          >
            Departments
          </Button>
        ) : null}
      />

      {isAdministrator && overview ? (
        <Card className="mb-5">
          <CardBody>
            <div className="grid grid-cols-2 divide-x divide-line md:grid-cols-4">
              {[
                ['Total accounts', overview.total_accounts],
                ['Active', overview.active_accounts],
                ['Pending approvals', overview.pending_approvals],
                ['Deactivated', overview.deactivated_accounts],
              ].map(([label, count]) => (
                <div key={label} className="px-4 py-1 first:pl-0 last:pr-0">
                  <p className="text-xs text-ink-muted">{label}</p>
                  <p className="mt-1 text-xl font-semibold text-ink">{count}</p>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      ) : null}

      {success ? (
        <div
          role="status"
          className="mb-5 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800"
        >
          <Check className="size-4" aria-hidden="true" />
          {success}
          <button
            type="button"
            className="ml-auto text-xs font-semibold underline"
            onClick={() => setSuccess(null)}
          >
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
            onClick={() => setOptionsVersion((version) => version + 1)}
          >
            Retry options
          </Button>
        </div>
      ) : null}

      <Card>
        <CardBody>
          <form
            className="grid gap-3 md:grid-cols-[minmax(14rem,1fr)_12rem_12rem_auto]"
            onSubmit={(event) => {
              event.preventDefault()
              setPage(1)
              setSearch(searchInput.trim())
              setSuccess(null)
            }}
          >
            <TextField
              label="Search accounts"
              name="search"
              type="search"
              value={searchInput}
              placeholder="Name or email"
              onChange={(event) => setSearchInput(event.target.value)}
            />
            <div className="space-y-1.5">
              <label htmlFor="role-filter" className="block text-sm font-medium text-ink">
                Role
              </label>
              <select
                id="role-filter"
                value={roleFilter}
                onChange={(event) => {
                  setPage(1)
                  setRoleFilter(event.target.value)
                }}
                className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="">All roles</option>
                {visibleRoles.map((role) => (
                  <option key={role} value={role}>
                    {roleLabels[role]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="status-filter" className="block text-sm font-medium text-ink">
                Account status
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(event) => {
                  setPage(1)
                  setStatusFilter(event.target.value)
                }}
                className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="pending_approval">Pending approval</option>
                <option value="needs_correction">Needs correction</option>
                <option value="rejected">Rejected</option>
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
              <Button className="mt-3" size="sm" variant="outline" onClick={refreshAccounts}>
                Retry
              </Button>
            </div>
          ) : null}

          {isLoading ? (
            <div className="py-16 text-center text-sm text-ink-muted" role="status">
              Loading accounts…
            </div>
          ) : !error && accounts.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                icon={UserRoundCog}
                title="No accounts found"
                description={
                  search || roleFilter || statusFilter
                    ? 'Try adjusting the search or filters.'
                    : 'Accounts will appear here when they are created.'
                }
              />
            </div>
          ) : !error ? (
            <>
              <div className="mt-5 overflow-x-auto rounded-lg border border-line">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="bg-stone-50 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    <tr>
                      <th className="px-4 py-3">Account</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Profile / access</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Last login</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {accounts.map((account) => {
                      const isOwnAdministrator =
                        isAdministrator &&
                        account.id === signedInUser?.id &&
                        account.role.code === 'administrator'
                      const cannotDeactivateSelf =
                        isOwnAdministrator && account.status === 'active'

                      return (
                        <tr key={account.id} className="align-top">
                          <td className="px-4 py-4">
                            <p className="font-semibold text-ink">{account.name}</p>
                            <p className="mt-0.5 text-xs text-ink-muted">{account.email}</p>
                          </td>
                          <td className="px-4 py-4 text-ink-muted">{account.role.name}</td>
                          <td className="px-4 py-4 text-xs text-ink-muted">
                            {account.profile?.type === 'student' ? (
                              <>
                                <p>{account.profile.student_number}</p>
                                <p className="mt-1">
                                  {account.profile.program
                                    ? `${account.profile.program.code} · ${account.profile.program.name}`
                                    : 'No program'}
                                  {' · '}
                                  {account.profile.year_level?.name ?? 'No year level'}
                                  {' · '}
                                  {account.profile.section?.code ?? 'No section'}
                                </p>
                              </>
                            ) : account.profile?.type === 'professor' ? (
                              <>
                                <p>{account.profile.employment_type.replace('_', '-')} Professor</p>
                                <p className="mt-1">
                                  {account.profile.department_affiliation === 'ccs'
                                    ? 'CCS'
                                    : account.profile.department_affiliation === 'other'
                                      ? 'Other department'
                                      : 'Affiliation not recorded'}
                                  {' · '}
                                  {account.profile.department?.name ?? 'No department'}
                                </p>
                              </>
                            ) : account.role.code === 'department_personnel' ? (
                              <>
                                <p>Attendance programs</p>
                                <p className="mt-1">
                                  {account.program_access.length
                                    ? account.program_access.map((program) => program.code).join(', ')
                                    : 'No programs assigned'}
                                </p>
                              </>
                            ) : (
                              <span>—</span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <Badge tone={statusTone(account.status)}>
                              {account.status.replace(/_/g, ' ')}
                            </Badge>
                          </td>
                          <td className="px-4 py-4 text-xs text-ink-muted">
                            {formatLastLogin(account.last_login_at)}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col items-end gap-2">
                              <div className="flex justify-end gap-2">
                                {isAdministrator && account.role.code === 'department_personnel' ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setProgramAccessUser(account)}
                                  >
                                    Programs
                                  </Button>
                                ) : null}
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSuccess(null)
                                    setDialogUser(account)
                                  }}
                                >
                                  Edit
                                </Button>
                                {isAdministrator &&
                                account.role.code === 'professor' &&
                                account.status === 'pending_approval' ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    disabled={isLoadingReview}
                                    onClick={() => void openReview(account)}
                                  >
                                    {isLoadingReview ? 'Loading…' : 'Review'}
                                  </Button>
                                ) : null}
                                {!(account.role.code === 'professor' &&
                                  ['pending_approval', 'needs_correction', 'rejected'].includes(account.status)) ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={account.status === 'active' ? 'danger' : 'secondary'}
                                    disabled={busyUserId === account.id || cannotDeactivateSelf}
                                    onClick={() => void handleStatusChange(account)}
                                  >
                                    {busyUserId === account.id
                                      ? 'Saving…'
                                      : account.status === 'active'
                                        ? 'Deactivate'
                                        : 'Activate'}
                                  </Button>
                                ) : null}
                              </div>
                              {cannotDeactivateSelf ? (
                                <p className="max-w-48 text-right text-xs leading-5 text-ink-muted">
                                  Administrators cannot deactivate their own accounts.
                                </p>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-ink-muted">
                  {total} account{total === 1 ? '' : 's'} · Page {page} of {lastPage}
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
                    disabled={page >= lastPage}
                    onClick={() => setPage((current) => Math.min(lastPage, current + 1))}
                  >
                    Next
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </CardBody>
      </Card>

      {dialogUser !== undefined && options ? (
        <UserFormDialog
          key={dialogUser?.id ?? 'new'}
          user={dialogUser}
          roles={options.roles}
          programs={options.programs}
          onCancel={() => setDialogUser(undefined)}
          onSubmit={handleSave}
        />
      ) : null}
      {reviewUser ? (
        <ProfessorRegistrationReviewDialog
          user={reviewUser}
          onClose={() => setReviewUser(null)}
          onAction={handleReviewAction}
        />
      ) : null}
      {isManagingDepartments && options ? (
        <DepartmentManagerDialog
          departments={options.departments}
          onClose={() => setIsManagingDepartments(false)}
          onAdd={handleAddDepartment}
        />
      ) : null}
      {programAccessUser && options ? (
        <DepartmentPersonnelProgramAccessDialog
          key={programAccessUser.id}
          user={programAccessUser}
          programs={options.programs}
          onCancel={() => setProgramAccessUser(null)}
          onSubmit={handleProgramAccessSave}
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
          isLoading={Boolean(busyUserId)}
          onConfirm={confirmDialog.onConfirm}
        />
      )}
    </>
  )
}
