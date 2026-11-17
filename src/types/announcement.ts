export type AnnouncementCategory =
  | 'general'
  | 'academic'
  | 'class_suspension'
  | 'examination'
  | 'department'
  | 'event'
  | 'advisory'
export type AnnouncementPriority = 'normal' | 'important' | 'urgent'
export type AnnouncementStatus = 'draft' | 'published' | 'archived'
export type AnnouncementScope = 'all' | 'custom'

export interface AnnouncementOption {
  id: number
  name: string
  code?: string
}

export interface AnnouncementTargetIds {
  role_ids: number[]
  program_ids: number[]
  year_level_ids: number[]
  section_ids: number[]
  user_ids: number[]
}

export interface AnnouncementTargetOptions {
  roles: AnnouncementOption[]
  programs: AnnouncementOption[]
  year_levels: Array<AnnouncementOption & { level: number }>
  sections: Array<AnnouncementOption & { program_id: number; year_level_id: number }>
}

export interface AnnouncementActivitySummary {
  id: number
  title: string
  category: string
  status: string
  starts_at: string
  ends_at: string
}

export interface AnnouncementTargetSummary {
  roles: AnnouncementOption[]
  programs: AnnouncementOption[]
  year_levels: Array<AnnouncementOption & { level: number }>
  sections: Array<AnnouncementOption & { program_id: number; year_level_id: number }>
  users: AnnouncementOption[]
}

export interface Announcement {
  id: number
  title: string
  summary: string | null
  content: string
  category: AnnouncementCategory
  priority: AnnouncementPriority
  audience_scope: AnnouncementScope
  status: AnnouncementStatus
  publication_state: 'draft' | 'scheduled' | 'published' | 'expired' | 'archived'
  published_at: string | null
  expires_at: string | null
  archived_at: string | null
  created_at: string
  author: { id: number; name: string }
  activity_id: number | null
  activity: AnnouncementActivitySummary | null
  audience_summary: string
  targets: AnnouncementTargetSummary
}

export interface AnnouncementInput {
  activity_id?: number | null
  title: string
  summary: string | null
  content: string
  category: AnnouncementCategory
  priority: AnnouncementPriority
  audience_scope: AnnouncementScope
  published_at: string | null
  expires_at: string | null
  targets: AnnouncementTargetIds
}

export interface AnnouncementFilters {
  search?: string
  status?: AnnouncementStatus
  category?: AnnouncementCategory
  priority?: AnnouncementPriority
  activity_id?: number
  link_type?: 'linked' | 'general'
  page?: number
  per_page?: number
}

export interface AnnouncementPagination {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface AnnouncementOverview {
  total: number
  draft: number
  scheduled: number
  published: number
  expired: number
  archived: number
}

export interface AnnouncementHistoryEntry {
  id: number
  action: string
  previous_status: string | null
  new_status: string | null
  previous_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  acted_by: { id: number; name: string } | null
  created_at: string
}
