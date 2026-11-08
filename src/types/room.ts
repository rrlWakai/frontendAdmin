export type RoomStatus = 'available' | 'unavailable' | 'maintenance' | 'retired'
export type RoomType = 'lecture' | 'laboratory' | 'seminar' | 'office' | 'other'

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
  created_at?: string
  updated_at?: string
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
  status?: RoomStatus
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
