export type ActivityCategory =
  | 'seminar'
  | 'workshop'
  | 'orientation'
  | 'meeting'
  | 'competition'
  | 'conference'
  | 'research'
  | 'celebration'
  | 'organization'
  | 'training'
  | 'other'

export type ActivityStatus = 'draft' | 'published' | 'cancelled' | 'completed'
export type ActivityState = ActivityStatus | 'upcoming' | 'ongoing'
export type ActivityAudienceScope = 'all' | 'custom'

export interface ActivityOption {
  id: number
  name: string
  code?: string
}

export interface ActivityTargetIds {
  role_ids: number[]
  program_ids: number[]
  year_level_ids: number[]
  section_ids: number[]
  user_ids: number[]
}

export interface ActivityRoom {
  id: number
  code: string
  name: string
  building: string | null
  floor: string | null
  status?: string
}

export interface Activity {
  id: number
  title: string
  summary: string | null
  description: string
  category: ActivityCategory
  organizer_name: string
  venue_name: string | null
  location_details: string | null
  room: ActivityRoom | null
  audience_scope: ActivityAudienceScope
  audience_summary: string
  starts_at: string
  ends_at: string
  status: ActivityStatus
  activity_state: ActivityState
  cancellation_reason: string | null
  cancelled_at: string | null
  cancelled_by: { id: number; name: string } | null
  completed_at: string | null
  created_by: { id: number; name: string } | null
  created_at: string
  updated_at: string
  targets?: ActivityTargetIds
}

export interface ActivityInput {
  title: string
  summary: string | null
  description: string
  category: ActivityCategory
  organizer_name: string
  room_id: number | null
  venue_name: string | null
  location_details: string | null
  audience_scope: ActivityAudienceScope
  starts_at: string
  ends_at: string
  targets: ActivityTargetIds
}

export interface ActivityFilters {
  search?: string
  category?: ActivityCategory
  status?: ActivityStatus
  audience_scope?: ActivityAudienceScope
  organizer?: string
  from_date?: string
  to_date?: string
  page?: number
  per_page?: number
}

export interface ActivityPagination {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface ActivityOverview {
  total: number
  upcoming: number
  ongoing: number
  completed: number
  cancelled: number
  draft: number
}

export interface ActivityOptions {
  roles: Array<ActivityOption & { code: string }>
  programs: Array<ActivityOption & { code: string }>
  year_levels: Array<ActivityOption & { level: number }>
  sections: Array<ActivityOption & { program_id: number; year_level_id: number; code: string }>
  users: Array<ActivityOption & { role: string }>
  rooms: ActivityRoom[]
}

export interface ActivityHistoryEntry {
  id: number
  action: string
  previous_status: string | null
  new_status: string | null
  previous_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  acted_by: { id: number; name: string } | null
  created_at: string
}
