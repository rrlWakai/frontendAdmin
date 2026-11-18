export type RoomStatus = 'available' | 'unavailable' | 'maintenance' | 'retired'
export type RoomType = 'lecture' | 'laboratory' | 'seminar' | 'office' | 'other'
export type RoomAvailabilityStatus = 'available' | 'reserved' | 'occupied' | 'discrepancy'

export interface Room {
  id: number
  code: string
  name: string
  building: string | null
  floor: string | null
  capacity: number
  room_type: RoomType
  status: RoomStatus
  active_allocations_count?: number
  published_allocations_count?: number
  availability_status?: RoomAvailabilityStatus
  scheduled?: RoomScheduledClass | null
  occupancy?: RoomOccupancyRecord | null
  created_at?: string
  updated_at?: string
}

export type RoomQrHistoryEntry = Pick<
  RoomQrIdentity,
  'id' | 'room_id' | 'created_at' | 'revoked_at' | 'revocation_reason' | 'created_by' | 'revoked_by'
>

export interface RoomScheduledClass {
  class_schedule_id: number | null
  subject: { code: string; title: string } | null
  section: { code: string; name: string | null } | null
  professor: string | null
  starts_at: string | null
  ends_at: string | null
}

export interface RoomOccupancyRecord {
  id: number
  room: Pick<Room, 'id' | 'code' | 'name' | 'building' | 'floor' | 'status'>
  scheduled_room: Pick<Room, 'id' | 'code' | 'name' | 'building' | 'floor' | 'status'>
  professor: { id: number; name: string | null }
  class_schedule_id: number
  schedule_assignment_id: number
  subject: { code: string; title: string } | null
  section: { code: string; name: string | null } | null
  class_date: string | null
  scheduled_start_at: string | null
  scheduled_end_at: string | null
  checked_in_at: string | null
  checked_out_at: string | null
  checkout_source: string | null
  mismatch_reason: string | null
  discrepancy_status: 'none' | 'open' | 'resolved'
  discrepancy_resolved_at: string | null
  discrepancy_resolved_by: string | null
  discrepancy_resolution_notes: string | null
  events: Array<{
    id: number
    event_type: string
    actor: string | null
    details: Record<string, unknown> | null
    occurred_at: string | null
  }>
}

export interface RoomQrIdentity {
  id: number
  room_id: number
  identifier: string
  payload: string
  created_at: string | null
  revoked_at: string | null
  revocation_reason: string | null
  created_by?: string | null
  revoked_by?: string | null
}

export interface RoomOccupancyPagination {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface RoomAllocationRecord {
  id: number
  room_id: number
  class_schedule_id: number
  status: string
  allocated_at: string | null
  released_at: string | null
  class_schedule?: {
    id: number
    status: string
    day_of_week: number
    start_time: string
    end_time: string
    subject_offering?: {
      subject?: { id: number; code: string; title: string }
      section?: { id: number; code: string; name: string | null }
    }
  }
}

export interface RoomDetail extends Room {
  active_allocations_count: number
  published_allocations_count: number
  room_allocations: RoomAllocationRecord[]
}

export interface RoomPagination {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface RoomFilters {
  search?: string
  building?: string
  date?: string
  availability_status?: RoomAvailabilityStatus
  room_status?: RoomStatus
  room_type?: RoomType
  page?: number
  per_page?: number
}

export interface RoomInput {
  code: string
  name: string
  building: string | null
  floor: string | null
  capacity: number
  room_type: RoomType
  status: RoomStatus
}

export type RoomUpdateInput = Partial<RoomInput>
