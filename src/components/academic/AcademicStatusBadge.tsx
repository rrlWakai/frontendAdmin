import { Badge } from '@/components/common/Badge'

interface AcademicStatusBadgeProps {
  status: string
}

export function AcademicStatusBadge({ status }: AcademicStatusBadgeProps) {
  const tone = status === 'active' ? 'success' : status === 'archived' ? 'danger' : 'neutral'

  return <Badge tone={tone}>{status.replaceAll('_', ' ')}</Badge>
}
