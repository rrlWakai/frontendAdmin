import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  History,
  RotateCcw,
  Trash2,
  UserRound,
} from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { Card, CardBody } from '@/components/common/Card'
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { useAuth } from '@/hooks/useAuth'
import {
  fetchRemovedStudents,
  fetchStudentAcademicHistory,
  fetchStudentActivityLogs,
  removeStudent,
  restoreStudent,
} from '@/services/api/students'
import type {
  RemovedStudentRecord,
  StudentAcademicHistoryRecord,
  StudentActivityLogEntry,
  StudentLogsPagination,
} from '@/types/students'
import { getApiErrorMessage, getApiFieldErrors } from '@/utils/apiError'

type TabKey = 'activity' | 'academic' | 'removed'

const tabs: Array<{ key: TabKey; label: string; icon: typeof Activity }> = [
  { key: 'activity', label: 'Activity Logs', icon: Activity },
  { key: 'academic', label: 'Academic History', icon: History },
  { key: 'removed', label: 'Recently Removed', icon: UserRound },
]

const emptyPagination: StudentLogsPagination = {
  current_page: 1,
  last_page: 1,
  per_page: 25,
  total: 0,
}

function formatDateTime(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Unknown'
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date)
}

function formatCountdown(remainingMs: number): string {
  if (remainingMs <= 0) return 'PROCESSING PERMANENT DELETION'

  const totalMinutes = Math.floor(remainingMs / 60_000)
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60

  return `PERMANENT DELETION IN ${days} DAYS : ${hours} HOURS : ${minutes} MINUTES`
}

function actionLabel(action: string): string {
  return action
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function actionTone(action: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  if (action === 'student_removed') return 'danger'
  if (action === 'student_restored') return 'success'
  if (action === 'student_permanently_deleted') return 'warning'
  if (action.startsWith('placement_')) return 'info'
  return 'neutral'
}

interface PaginationBarProps {
  pagination: StudentLogsPagination
  page: number
  noun: string
  onPageChange: (page: number) => void
}

function PaginationBar({ pagination, page, noun, onPageChange }: PaginationBarProps) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-ink-muted">
        {pagination.total} {noun}
        {pagination.total === 1 ? '' : 's'} · Page {page} of {pagination.last_page}
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Previous
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={page >= pagination.last_page}
          onClick={() => onPageChange(Math.min(pagination.last_page, page + 1))}
        >
          Next
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}

export function StudentsPage() {
  const { user } = useAuth()
  const canManage = user?.role === 'administrator' || user?.role === 'department_personnel'
  const [activeTab, setActiveTab] = useState<TabKey>('activity')
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [success, setSuccess] = useState<string | null>(null)

  const [activityPage, setActivityPage] = useState(1)
  const [logs, setLogs] = useState<StudentActivityLogEntry[]>([])
  const [logPagination, setLogPagination] = useState<StudentLogsPagination>(emptyPagination)
  const [isLoadingLogs, setIsLoadingLogs] = useState(true)
  const [logsError, setLogsError] = useState<string | null>(null)

  const [academicPage, setAcademicPage] = useState(1)
  const [history, setHistory] = useState<StudentAcademicHistoryRecord[]>([])
  const [historyPagination, setHistoryPagination] = useState<StudentLogsPagination>(emptyPagination)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [historyError, setHistoryError] = useState<string | null>(null)

  const [removedPage, setRemovedPage] = useState(1)
  const [removedStudents, setRemovedStudents] = useState<RemovedStudentRecord[]>([])
  const [removedPagination, setRemovedPagination] = useState<StudentLogsPagination>(emptyPagination)
  const [isLoadingRemoved, setIsLoadingRemoved] = useState(true)
  const [removedError, setRemovedError] = useState<string | null>(null)
  const [serverOffset, setServerOffset] = useState(0)
  const [clock, setClock] = useState(() => Date.now())

  const [confirmRemoval, setConfirmRemoval] = useState<StudentAcademicHistoryRecord | null>(null)
  const [busyRemoveId, setBusyRemoveId] = useState<number | null>(null)
  const [busyRestoreId, setBusyRestoreId] = useState<number | null>(null)

  const currentTime = useMemo(() => clock + serverOffset, [clock, serverOffset])

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (activeTab !== 'activity') return
    let active = true

    void Promise.resolve().then(async () => {
      if (!active) return
      setIsLoadingLogs(true)
      setLogsError(null)

      try {
        const result = await fetchStudentActivityLogs({ page: activityPage, per_page: 25 })
        if (!active) return
        setLogs(result.logs)
        setLogPagination(result.pagination)
      } catch (failure) {
        if (active) {
          setLogsError(getApiErrorMessage(failure, 'Unable to load student activity logs.'))
        }
      } finally {
        if (active) setIsLoadingLogs(false)
      }
    })

    return () => {
      active = false
    }
  }, [activeTab, activityPage, refreshVersion])

  useEffect(() => {
    if (activeTab !== 'academic') return
    let active = true

    void Promise.resolve().then(async () => {
      if (!active) return
      setIsLoadingHistory(true)
      setHistoryError(null)

      try {
        const result = await fetchStudentAcademicHistory({ page: academicPage, per_page: 25 })
        if (!active) return
        setHistory(result.records)
        setHistoryPagination(result.pagination)
      } catch (failure) {
        if (active) {
          setHistoryError(getApiErrorMessage(failure, 'Unable to load student academic history.'))
        }
      } finally {
        if (active) setIsLoadingHistory(false)
      }
    })

    return () => {
      active = false
    }
  }, [academicPage, activeTab, refreshVersion])

  useEffect(() => {
    if (activeTab !== 'removed') return
    let active = true

    void Promise.resolve().then(async () => {
      if (!active) return
      setIsLoadingRemoved(true)
      setRemovedError(null)

      try {
        const result = await fetchRemovedStudents({ page: removedPage, per_page: 25 })
        if (!active) return
        const fetchedAt = Date.now()
        setRemovedStudents(result.removals)
        setRemovedPagination(result.pagination)
        setServerOffset(new Date(result.server_time).getTime() - fetchedAt)
      } catch (failure) {
        if (active) {
          setRemovedError(getApiErrorMessage(failure, 'Unable to load recently removed students.'))
        }
      } finally {
        if (active) setIsLoadingRemoved(false)
      }
    })

    return () => {
      active = false
    }
  }, [activeTab, refreshVersion, removedPage])

  function refresh() {
    setRefreshVersion((version) => version + 1)
  }

  async function handleRemove() {
    if (!confirmRemoval) return
    const student = confirmRemoval.student
    setConfirmRemoval(null)
    setBusyRemoveId(student.id)
    setSuccess(null)

    try {
      await removeStudent(student.id)
      setSuccess(`${student.name ?? 'The student'} was removed. The record can be restored for seven days.`)
      refresh()
    } catch (failure) {
      setHistoryError(
        getApiFieldErrors(failure).student?.[0] ??
          getApiErrorMessage(failure, 'Unable to remove the student.'),
      )
    } finally {
      setBusyRemoveId(null)
    }
  }

  async function handleRestore(removal: RemovedStudentRecord) {
    setBusyRestoreId(removal.id)
    setSuccess(null)

    try {
      await restoreStudent(removal.student.id)
      setSuccess(`${removal.student.name ?? 'The student'} was restored.`)
      refresh()
    } catch (failure) {
      setRemovedError(
        getApiFieldErrors(failure).student?.[0] ??
          getApiErrorMessage(failure, 'Unable to restore the student.'),
      )
    } finally {
      setBusyRestoreId(null)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Student records"
        title="Student Logs"
        description="Monitor student account activity, academic records, and account removal history."
      />

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

      <Card>
        <CardBody className="p-0">
          <div className="border-b border-line px-5 pt-3">
            <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Student logs sections">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.key
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    aria-selected={isActive}
                    role="tab"
                    className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                      isActive
                        ? 'border-maroon-600 text-maroon-700'
                        : 'border-transparent text-ink-muted hover:border-maroon-200 hover:text-ink'
                    }`}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>

          <div className="p-5">
            {activeTab === 'activity' ? (
              <>
                {logsError ? (
                  <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <p>{logsError}</p>
                    <Button className="mt-3" size="sm" variant="outline" onClick={refresh}>
                      Retry
                    </Button>
                  </div>
                ) : isLoadingLogs ? (
                  <div role="status" className="py-16 text-center text-sm text-ink-muted">
                    Loading activity logs…
                  </div>
                ) : logs.length === 0 ? (
                  <EmptyState
                    icon={Activity}
                    title="No activity recorded yet"
                    description="Student account, profile, placement, removal, and restoration events will appear here as they occur."
                  />
                ) : (
                  <>
                    <div className="overflow-x-auto rounded-lg border border-line">
                      <table className="w-full min-w-[900px] text-left text-sm">
                        <thead className="bg-stone-50 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                          <tr>
                            <th className="px-4 py-3">Event</th>
                            <th className="px-4 py-3">Student</th>
                            <th className="px-4 py-3">Details</th>
                            <th className="px-4 py-3">Performed by</th>
                            <th className="px-4 py-3">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {logs.map((log) => (
                            <tr key={log.id} className="align-top">
                              <td className="px-4 py-4">
                                <Badge tone={actionTone(log.action)}>{actionLabel(log.action)}</Badge>
                              </td>
                              <td className="px-4 py-4">
                                <p className="font-semibold text-ink">{log.student.name ?? 'Removed student'}</p>
                                <p className="mt-0.5 text-xs text-ink-muted">{log.student.student_number}</p>
                              </td>
                              <td className="max-w-md px-4 py-4 text-ink-muted">
                                {log.description ?? 'No additional details recorded.'}
                              </td>
                              <td className="px-4 py-4 text-ink-muted">
                                {log.actor?.name ?? 'System'}
                              </td>
                              <td className="px-4 py-4 text-ink-muted">
                                {formatDateTime(log.created_at)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <PaginationBar
                      pagination={logPagination}
                      page={activityPage}
                      noun="activity record"
                      onPageChange={setActivityPage}
                    />
                  </>
                )}
              </>
            ) : null}

            {activeTab === 'academic' ? (
              <>
                {historyError ? (
                  <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <p>{historyError}</p>
                    <Button className="mt-3" size="sm" variant="outline" onClick={refresh}>
                      Retry
                    </Button>
                  </div>
                ) : isLoadingHistory ? (
                  <div role="status" className="py-16 text-center text-sm text-ink-muted">
                    Loading academic history…
                  </div>
                ) : history.length === 0 ? (
                  <EmptyState
                    icon={History}
                    title="No academic history found"
                    description="Student placement records will appear here once they are assigned."
                  />
                ) : (
                  <>
                    <div className="overflow-x-auto rounded-lg border border-line">
                      <table className="w-full min-w-[1080px] text-left text-sm">
                        <thead className="bg-stone-50 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                          <tr>
                            <th className="px-4 py-3">Student</th>
                            <th className="px-4 py-3">Academic year / term</th>
                            <th className="px-4 py-3">Program / level</th>
                            <th className="px-4 py-3">Major / section</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {history.map((record) => (
                            <tr key={record.id} className="align-top">
                              <td className="px-4 py-4">
                                <p className="font-semibold text-ink">{record.student.name ?? 'Removed student'}</p>
                                <p className="mt-0.5 text-xs text-ink-muted">{record.student.student_number}</p>
                              </td>
                              <td className="px-4 py-4 text-ink-muted">
                                <p className="text-ink">{record.academic_year?.label ?? '—'}</p>
                                <p className="mt-0.5 text-xs">{record.academic_term?.name ?? '—'}</p>
                              </td>
                              <td className="px-4 py-4 text-ink-muted">
                                <p className="text-ink">{record.program?.code ?? '—'}</p>
                                <p className="mt-0.5 text-xs">{record.year_level?.name ?? 'No year level'}</p>
                              </td>
                              <td className="px-4 py-4 text-ink-muted">
                                <p className="text-ink">{record.major ? `${record.major.code} · ${record.major.name}` : 'No major'}</p>
                                <p className="mt-0.5 text-xs">{record.section?.code ?? 'Unassigned'}</p>
                              </td>
                              <td className="px-4 py-4">
                                <Badge tone={record.is_current ? 'success' : 'neutral'}>
                                  {record.is_current ? 'current' : record.status}
                                </Badge>
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex justify-end">
                                  {canManage &&
                                  record.is_current &&
                                  record.student.status !== 'deleted' &&
                                  !record.removal_pending ? (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="danger"
                                      disabled={busyRemoveId === record.student.id}
                                      onClick={() => {
                                        setSuccess(null)
                                        setConfirmRemoval(record)
                                      }}
                                      leftIcon={<Trash2 className="size-4" aria-hidden="true" />}
                                    >
                                      {busyRemoveId === record.student.id ? 'Removing…' : 'Remove Student'}
                                    </Button>
                                  ) : record.removal_pending ? (
                                    <Badge tone="danger">Pending deletion</Badge>
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <PaginationBar
                      pagination={historyPagination}
                      page={academicPage}
                      noun="academic record"
                      onPageChange={setAcademicPage}
                    />
                  </>
                )}
              </>
            ) : null}

            {activeTab === 'removed' ? (
              <>
                {removedError ? (
                  <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <p>{removedError}</p>
                    <Button className="mt-3" size="sm" variant="outline" onClick={refresh}>
                      Retry
                    </Button>
                  </div>
                ) : isLoadingRemoved ? (
                  <div role="status" className="py-16 text-center text-sm text-ink-muted">
                    Loading recently removed students…
                  </div>
                ) : removedStudents.length === 0 ? (
                  <EmptyState
                    icon={UserRound}
                    title="No students pending removal"
                    description="Removed student accounts will appear here during their seven-day recovery period."
                  />
                ) : (
                  <>
                    <div className="overflow-x-auto rounded-lg border border-line">
                      <table className="w-full min-w-[1040px] text-left text-sm">
                        <thead className="bg-stone-50 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                          <tr>
                            <th className="px-4 py-3">Student</th>
                            <th className="px-4 py-3">Removed on</th>
                            <th className="px-4 py-3">Permanent deletion deadline</th>
                            <th className="px-4 py-3">Remaining</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {removedStudents.map((removal) => {
                            const deadline = removal.restore_deadline
                              ? new Date(removal.restore_deadline).getTime()
                              : null
                            const remainingMs = deadline === null ? 0 : Math.max(0, deadline - currentTime)
                            const isExpired = remainingMs <= 0
                            const isWarning = !isExpired && remainingMs < 24 * 60 * 60 * 1000

                            return (
                              <tr key={removal.id} className="align-top">
                                <td className="px-4 py-4">
                                  <p className="font-semibold text-ink">{removal.student.name ?? 'Removed student'}</p>
                                  <p className="mt-0.5 text-xs text-ink-muted">{removal.student.student_number}</p>
                                  <div className="mt-2">
                                    <Badge tone="danger">Pending deletion</Badge>
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-ink-muted">
                                  <p>{formatDateTime(removal.removed_at)}</p>
                                  <p className="mt-1 text-xs">
                                    by {removal.removed_by?.name ?? 'System'}
                                  </p>
                                </td>
                                <td className="px-4 py-4 text-ink-muted">
                                  {formatDateTime(removal.restore_deadline)}
                                </td>
                                <td className="px-4 py-4">
                                  <div
                                    className={`flex items-start gap-2 rounded-lg border px-3 py-2 ${
                                      isWarning
                                        ? 'border-red-200 bg-red-50 text-red-700'
                                        : 'border-amber-200 bg-amber-50 text-amber-800'
                                    }`}
                                  >
                                    <Clock3 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                                    <p className="font-mono text-xs font-semibold leading-5">
                                      {formatCountdown(remainingMs)}
                                    </p>
                                  </div>
                                  {isWarning ? (
                                    <p className="mt-2 text-xs font-medium text-red-700">
                                      Less than 24 hours remain to restore this student.
                                    </p>
                                  ) : null}
                                </td>
                                <td className="px-4 py-4">
                                  <div className="flex justify-end">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      disabled={isExpired || busyRestoreId === removal.id}
                                      onClick={() => void handleRestore(removal)}
                                      leftIcon={<RotateCcw className="size-4" aria-hidden="true" />}
                                    >
                                      {busyRestoreId === removal.id
                                        ? 'Restoring…'
                                        : isExpired
                                          ? 'Recovery expired'
                                          : 'Restore Student'}
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    <PaginationBar
                      pagination={removedPagination}
                      page={removedPage}
                      noun="removed student"
                      onPageChange={setRemovedPage}
                    />
                  </>
                )}
              </>
            ) : null}
          </div>
        </CardBody>
      </Card>

      {confirmRemoval ? (
        <ConfirmationDialog
          onClose={() => setConfirmRemoval(null)}
          title="Remove this student from CCSync?"
          description="The student will immediately lose access to their account. Their record will remain recoverable for seven days. After the recovery period expires, permanent deletion will be processed and cannot be undone."
          confirmLabel="Remove student"
          cancelLabel="Cancel"
          destructive
          isLoading={busyRemoveId !== null}
          onConfirm={handleRemove}
        />
      ) : null}
    </>
  )
}
