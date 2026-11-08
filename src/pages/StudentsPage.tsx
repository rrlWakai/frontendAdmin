import { useEffect, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Plus, Search, UserRound } from 'lucide-react'
import { StudentProfileDialog } from '@/components/students/StudentProfileDialog'
import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { Card, CardBody } from '@/components/common/Card'
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { TextField } from '@/components/common/TextField'
import { UserFormDialog } from '@/components/users/UserFormDialog'
import { useAuth } from '@/hooks/useAuth'
import { fetchUserOptions, createUser, updateUser, updateUserStatus } from '@/services/api/users'
import { fetchStudent, fetchStudents } from '@/services/api/students'
import type { StudentDetail, StudentDirectoryRecord, StudentPagination } from '@/types/students'
import type {
  AccountStatus,
  AccountFormSubmission,
  ManagedUser,
  ProgramOption,
  UpdateUserInput,
  UserOptions,
} from '@/types/users'
import { getApiErrorMessage, getApiFieldErrors } from '@/utils/apiError'

function accountStatusTone(status: string): 'success' | 'danger' | 'neutral' {
  if (status === 'active') return 'success'
  if (status === 'suspended') return 'danger'
  return 'neutral'
}

function isAccountStatus(value: string): value is AccountStatus {
  return value === 'active' || value === 'inactive' || value === 'suspended'
}

function toManagedUser(student: StudentDetail): ManagedUser {
  const program: ProgramOption | null = student.program
    ? {
        id: student.program.id,
        code: student.program.code,
        name: student.program.name,
        status: student.program.status,
      }
    : null

  return {
    id: student.user_id,
    name: student.name,
    email: student.email ?? '',
    role: { code: 'student', name: 'Student' },
    status: student.account_status,
    last_login_at: null,
    program_access: [],
    profile: {
      type: 'student',
      student_number: student.student_number,
      program,
      admitted_on: student.admitted_on,
    },
  }
}

export function StudentsPage() {
  const { user } = useAuth()
  const canManage = user?.role === 'administrator' || user?.role === 'department_personnel'
  const canRegister = user?.role === 'administrator'
  const [students, setStudents] = useState<StudentDirectoryRecord[]>([])
  const [options, setOptions] = useState<UserOptions | null>(null)
  const [pagination, setPagination] = useState<StudentPagination>({
    current_page: 1,
    last_page: 1,
    per_page: 25,
    total: 0,
  })
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<AccountStatus | ''>('')
  const [programFilter, setProgramFilter] = useState('')
  const [page, setPage] = useState(1)
  const [settledListKey, setSettledListKey] = useState<string | null>(null)
  const [listError, setListError] = useState<{ key: string; message: string } | null>(null)
  const [optionsError, setOptionsError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [dialogUser, setDialogUser] = useState<ManagedUser | null | undefined>()
  const [selectedStudent, setSelectedStudent] = useState<StudentDirectoryRecord | null>(null)
  const [studentDetail, setStudentDetail] = useState<StudentDetail | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [busyStudentId, setBusyStudentId] = useState<number | null>(null)
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

  const listKey = JSON.stringify([search, statusFilter, programFilter, page, refreshVersion])
  const isLoading = settledListKey !== listKey
  const error = listError?.key === listKey ? listError.message : null

  useEffect(() => {
    let active = true
    void Promise.resolve()
      .then(() => fetchUserOptions())
      .then((result) => {
        if (active) setOptions(result)
      })
      .catch((failure: unknown) => {
        if (active) setOptionsError(getApiErrorMessage(failure, 'Unable to load student options.'))
      })
    return () => {
      active = false
    }
  }, [optionsVersion])

  useEffect(() => {
    let active = true
    void Promise.resolve()
      .then(() => fetchStudents({
        search: search || undefined,
        status: statusFilter || undefined,
        program_id: programFilter ? Number(programFilter) : undefined,
        page,
        per_page: 25,
      }))
      .then((result) => {
        if (active) {
          setStudents(result.students)
          setPagination(result.pagination)
          setSettledListKey(listKey)
        }
      })
      .catch((failure: unknown) => {
        if (active) {
          setListError({
            key: listKey,
            message: getApiErrorMessage(failure, 'Unable to load students.'),
          })
          setSettledListKey(listKey)
        }
      })
    return () => {
      active = false
    }
  }, [listKey, page, programFilter, refreshVersion, search, statusFilter])

  useEffect(() => {
    if (!selectedStudent) return

    let active = true
    void Promise.resolve()
      .then(() => fetchStudent(selectedStudent.id))
      .then((result) => {
        if (active) {
          setStudentDetail(result)
          setDetailError(null)
        }
      })
      .catch((failure: unknown) => {
        if (active) setDetailError(getApiErrorMessage(failure, 'Unable to load student profile.'))
      })
      .finally(() => {
        if (active) setIsDetailLoading(false)
      })
    return () => {
      active = false
    }
  }, [detailVersion, selectedStudent])

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
      setSuccess('Student profile updated.')
      setDialogUser(undefined)
      setRefreshVersion((version) => version + 1)
      setIsDetailLoading(true)
      setDetailVersion((version) => version + 1)
      return
    }

    if (!input.password || !input.password_confirmation) {
      throw new Error('Enter and confirm a temporary password.')
    }

    await createUser({
      ...input,
      role: 'student',
      password: input.password,
      password_confirmation: input.password_confirmation,
    })
    setSuccess('Student account registered.')
    setDialogUser(undefined)
    setPage(1)
    setRefreshVersion((version) => version + 1)
  }

  async function handleStatusChange(student: StudentDirectoryRecord | StudentDetail) {
    const nextStatus = student.account_status === 'active' ? 'inactive' : 'active'
    const verb = nextStatus === 'active' ? 'activate' : 'deactivate'

    setConfirmDialog({
      title: `${verb.charAt(0).toUpperCase() + verb.slice(1)} student account`,
      description: `Are you sure you want to ${verb} ${student.name}'s account?`,
      confirmLabel: `${verb.charAt(0).toUpperCase() + verb.slice(1)} account`,
      cancelLabel: 'Keep as is',
      destructive: nextStatus === 'inactive',
      onConfirm: async () => {
        setConfirmDialog(null)
        setBusyStudentId(student.id)
        setListError(null)
        setSuccess(null)

        try {
          await updateUserStatus(student.user_id, nextStatus)
          setSuccess(`${student.name}'s account was ${nextStatus === 'active' ? 'activated' : 'deactivated'}.`)
          setRefreshVersion((version) => version + 1)
          if (selectedStudent) setIsDetailLoading(true)
          setDetailVersion((version) => version + 1)
        } catch (statusFailure) {
          const message = getApiFieldErrors(statusFailure).status?.[0] ??
            getApiErrorMessage(statusFailure, 'Unable to update student account status.')
          if (selectedStudent) {
            setDetailError(message)
          } else {
            setListError({ key: listKey, message })
          }
        } finally {
          setBusyStudentId(null)
        }
      },
    })
  }

  return (
    <>
      <PageHeader
        eyebrow="People directory"
        title="Student management"
        description="Review student profiles, program assignments, account access, and enrollment-derived academic information."
        actions={canRegister ? (
          <Button
            onClick={() => {
              setSuccess(null)
              setDialogUser(null)
            }}
            disabled={!options || Boolean(optionsError)}
            leftIcon={<Plus className="size-4" aria-hidden="true" />}
          >
            Register student
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
            className="grid gap-3 md:grid-cols-[minmax(14rem,1fr)_12rem_12rem_auto]"
            onSubmit={(event) => {
              event.preventDefault()
              setPage(1)
              setSearch(searchInput.trim())
              setSuccess(null)
            }}
          >
            <TextField
              label="Search students"
              name="search"
              type="search"
              value={searchInput}
              placeholder="Student number, name, or email"
              onChange={(event) => setSearchInput(event.target.value)}
            />
            <div className="space-y-1.5">
              <label htmlFor="student-program-filter" className="block text-sm font-medium text-ink">
                Program
              </label>
              <select
                id="student-program-filter"
                value={programFilter}
                onChange={(event) => {
                  setPage(1)
                  setProgramFilter(event.target.value)
                }}
                className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="">All programs</option>
                {(options?.programs ?? []).map((program) => (
                  <option key={program.id} value={program.id}>{program.code} — {program.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="student-status-filter" className="block text-sm font-medium text-ink">
                Account status
              </label>
              <select
                id="student-status-filter"
                value={statusFilter}
                onChange={(event) => {
                  const value = event.target.value
                  setPage(1)
                  if (value === '' || isAccountStatus(value)) setStatusFilter(value)
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
              Loading students…
            </div>
          ) : students.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                icon={UserRound}
                title="No students found"
                description={search || statusFilter || programFilter
                  ? 'Try adjusting the search or filters.'
                  : 'Student profiles will appear here after they are registered.'}
                action={canRegister ? (
                  <Button onClick={() => setDialogUser(null)} leftIcon={<Plus className="size-4" aria-hidden="true" />}>
                    Register student
                  </Button>
                ) : undefined}
              />
            </div>
          ) : (
            <>
              <div className="mt-5 overflow-x-auto rounded-lg border border-line">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-stone-50 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    <tr>
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3">Program</th>
                      <th className="px-4 py-3">Account status</th>
                      <th className="px-4 py-3">Profile status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {students.map((student) => (
                      <tr key={student.id} className="align-top">
                        <td className="px-4 py-4">
                          <p className="font-semibold text-ink">{student.name}</p>
                          <p className="mt-0.5 text-xs text-ink-muted">{student.student_number} · {student.email}</p>
                        </td>
                        <td className="px-4 py-4 text-ink-muted">
                          {student.program ? (
                            <>
                              <p>{student.program.code}</p>
                              <p className="mt-1 text-xs">{student.program.name}</p>
                            </>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-4">
                          <Badge tone={accountStatusTone(student.account_status)}>{student.account_status}</Badge>
                        </td>
                        <td className="px-4 py-4 text-sm capitalize text-ink-muted">{student.profile_status}</td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setStudentDetail(null)
                                setDetailError(null)
                                setIsDetailLoading(true)
                                setSelectedStudent(student)
                              }}
                            >
                              Details
                            </Button>
                            {canManage ? (
                              <Button
                                type="button"
                                size="sm"
                                variant={student.account_status === 'active' ? 'danger' : 'secondary'}
                                disabled={busyStudentId === student.id}
                                onClick={() => void handleStatusChange(student)}
                              >
                                {busyStudentId === student.id
                                  ? 'Saving…'
                                  : student.account_status === 'active'
                                    ? 'Deactivate'
                                    : 'Activate'}
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-ink-muted">
                  {pagination.total} student{pagination.total === 1 ? '' : 's'} · Page {page} of {pagination.last_page}
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

      {selectedStudent && dialogUser === undefined ? (
        <StudentProfileDialog
          student={studentDetail}
          isLoading={isDetailLoading}
          error={detailError}
          canManage={canManage}
          isChangingStatus={busyStudentId === selectedStudent.id}
          onClose={() => {
            setSelectedStudent(null)
            setStudentDetail(null)
          }}
          onEdit={() => {
            if (studentDetail) setDialogUser(toManagedUser(studentDetail))
          }}
          onToggleStatus={() => {
            if (studentDetail) void handleStatusChange(studentDetail)
          }}
          onRetry={() => {
            setDetailError(null)
            setIsDetailLoading(true)
            setDetailVersion((version) => version + 1)
          }}
        />
      ) : null}

      {dialogUser !== undefined && options ? (
        <UserFormDialog
          key={dialogUser?.id ?? 'new-student'}
          user={dialogUser}
          roles={options.roles}
          programs={options.programs}
          defaultRole="student"
          lockRole
          onCancel={() => setDialogUser(undefined)}
          onSubmit={handleSave}
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
          isLoading={Boolean(busyStudentId)}
          onConfirm={confirmDialog.onConfirm}
        />
      )}
    </>
  )
}
