import type { ApiSuccessResponse } from '@/types/api'
import type {
  Announcement,
  AnnouncementFilters,
  AnnouncementHistoryEntry,
  AnnouncementInput,
  AnnouncementOption,
  AnnouncementOverview,
  AnnouncementPagination,
  AnnouncementTargetOptions,
} from '@/types/announcement'
import { apiClient } from '@/services/api/client'

interface AnnouncementPage {
  announcements: Announcement[]
  overview: AnnouncementOverview
  pagination: AnnouncementPagination
}

interface AnnouncementHistoryPage {
  history: AnnouncementHistoryEntry[]
  pagination: AnnouncementPagination
}

interface UserOptionsResponse {
  roles: Array<AnnouncementOption & { code: string }>
  programs: AnnouncementOption[]
}

interface AcademicOptionsResponse {
  year_levels: Array<AnnouncementOption & { level: number }>
}

interface SectionDirectoryResponse {
  sections: Array<AnnouncementOption & { program_id: number; year_level_id: number }>
}

export async function fetchManagedAnnouncements(
  filters: AnnouncementFilters,
): Promise<AnnouncementPage> {
  const { data } = await apiClient.get<ApiSuccessResponse<AnnouncementPage>>(
    '/announcements/manage',
    { params: filters },
  )

  return data.data
}

export async function fetchAnnouncementTargetOptions(): Promise<AnnouncementTargetOptions> {
  const [userOptions, academicOptions, sectionResponse] = await Promise.all([
    apiClient.get<ApiSuccessResponse<UserOptionsResponse>>('/users/options'),
    apiClient.get<ApiSuccessResponse<AcademicOptionsResponse>>('/academic/options'),
    apiClient.get<ApiSuccessResponse<SectionDirectoryResponse>>('/academic/sections', {
      params: { per_page: 100 },
    }),
  ])

  return {
    roles: userOptions.data.data.roles,
    programs: userOptions.data.data.programs,
    year_levels: academicOptions.data.data.year_levels,
    sections: sectionResponse.data.data.sections,
  }
}

export async function fetchAnnouncementTargetUsers(
  search: string,
): Promise<AnnouncementOption[]> {
  const { data } = await apiClient.get<
    ApiSuccessResponse<{ users: Array<{ id: number; name: string }> }>
  >('/users', { params: { search, status: 'active', per_page: 100 } })

  return data.data.users
}

export async function createAnnouncement(payload: AnnouncementInput): Promise<Announcement> {
  const { data } = await apiClient.post<ApiSuccessResponse<{ announcement: Announcement }>>(
    '/announcements',
    payload,
  )

  return data.data.announcement
}

export async function updateAnnouncement(
  id: number,
  payload: AnnouncementInput,
): Promise<Announcement> {
  const { data } = await apiClient.patch<ApiSuccessResponse<{ announcement: Announcement }>>(
    `/announcements/${id}`,
    payload,
  )

  return data.data.announcement
}

export async function publishAnnouncement(id: number): Promise<Announcement> {
  const { data } = await apiClient.post<ApiSuccessResponse<{ announcement: Announcement }>>(
    `/announcements/${id}/publish`,
  )

  return data.data.announcement
}

export async function archiveAnnouncement(id: number): Promise<Announcement> {
  const { data } = await apiClient.post<ApiSuccessResponse<{ announcement: Announcement }>>(
    `/announcements/${id}/archive`,
  )

  return data.data.announcement
}

export async function fetchAnnouncementHistory(
  id: number,
): Promise<AnnouncementHistoryPage> {
  const { data } = await apiClient.get<ApiSuccessResponse<AnnouncementHistoryPage>>(
    `/announcements/${id}/history`,
  )

  return data.data
}
