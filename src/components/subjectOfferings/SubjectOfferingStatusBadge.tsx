import { Badge } from '@/components/common/Badge'
import type { SubjectOfferingStatus } from '@/types/subjectOffering'

const statusLabels: Record<SubjectOfferingStatus, string> = {
  draft: 'Draft',
  open: 'Open',
  closed: 'Closed',
  cancelled: 'Cancelled',
}

function statusTone(status: SubjectOfferingStatus): 'success' | 'warning' | 'neutral' | 'danger' {
  if (status === 'open') return 'success'
  if (status === 'closed') return 'warning'
  if (status === 'cancelled') return 'danger'
  return 'neutral'
}

export function SubjectOfferingStatusBadge({ status }: { status: SubjectOfferingStatus }) {
  return <Badge tone={statusTone(status)}>{statusLabels[status]}</Badge>
}
