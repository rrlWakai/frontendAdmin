import type {
  AttendanceSession,
  AttendanceSessionDetail,
} from '@/types/attendance'

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'info' | 'danger' | 'maroon'

export interface AttendanceCounts {
  total: number
  present: number
  late: number
  absent: number
  excused: number
  unrecorded: number
}

export function formatAttendanceDateTime(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function attendanceSessionLifecycle(session: AttendanceSession): {
  label: string
  tone: BadgeTone
  detail: string
} {
  if (session.status === 'cancelled') {
    return {
      label: 'Cancelled',
      tone: 'danger',
      detail: session.cancelled_at ? `Cancelled ${formatAttendanceDateTime(session.cancelled_at)}` : 'Class meeting cancelled',
    }
  }

  if (session.status === 'submitted') {
    return {
      label: 'Finalized',
      tone: 'success',
      detail: session.submitted_at ? `Finalized ${formatAttendanceDateTime(session.submitted_at)}` : 'Attendance finalized',
    }
  }

  if (session.qr_closed_at) {
    return {
      label: 'QR closed',
      tone: 'info',
      detail: `Awaiting finalization since ${formatAttendanceDateTime(session.qr_closed_at)}`,
    }
  }

  if (session.qr_opened_at) {
    return {
      label: 'In progress',
      tone: 'warning',
      detail: `QR opened ${formatAttendanceDateTime(session.qr_opened_at)}`,
    }
  }

  return {
    label: 'Not started',
    tone: 'neutral',
    detail: 'No QR session has been opened',
  }
}

export function countAttendanceRoster(roster: AttendanceSessionDetail['roster']): AttendanceCounts {
  const counts: AttendanceCounts = {
    total: roster.length,
    present: 0,
    late: 0,
    absent: 0,
    excused: 0,
    unrecorded: 0,
  }

  roster.forEach((entry) => {
    const status = entry.attendance?.status
    if (status === null || status === undefined) {
      counts.unrecorded += 1
      return
    }

    counts[status] += 1
  })

  return counts
}
