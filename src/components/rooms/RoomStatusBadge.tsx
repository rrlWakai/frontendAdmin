import { Badge } from '@/components/common/Badge'
import type { RoomStatus } from '@/types/room'

const statusLabels: Record<RoomStatus, string> = {
  available: 'Available',
  unavailable: 'Unavailable',
  maintenance: 'Maintenance',
  retired: 'Retired',
}

function statusTone(status: RoomStatus): 'success' | 'warning' | 'neutral' | 'danger' {
  if (status === 'available') return 'success'
  if (status === 'maintenance') return 'warning'
  if (status === 'retired') return 'danger'
  return 'neutral'
}

export function RoomStatusBadge({ status }: { status: RoomStatus }) {
  return <Badge tone={statusTone(status)}>{statusLabels[status]}</Badge>
}
