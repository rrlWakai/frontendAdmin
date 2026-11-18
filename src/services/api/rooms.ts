import type { ApiSuccessResponse } from '@/types/api'
import type {
  Room,
  RoomDetail,
  RoomFilters,
  RoomInput,
  RoomOccupancyPagination,
  RoomOccupancyRecord,
  RoomPagination,
  RoomQrIdentity,
  RoomQrHistoryEntry,
  RoomStatus,
  RoomUpdateInput,
} from '@/types/room'
import { apiClient } from '@/services/api/client'

interface RoomDirectoryResponse {
  rooms: Room[]
  pagination: RoomPagination
}

export async function fetchRooms(
  filters: RoomFilters,
): Promise<RoomDirectoryResponse> {
  const { data } = await apiClient.get<ApiSuccessResponse<RoomDirectoryResponse>>('/rooms/availability', {
    params: filters,
  })

  return data.data
}

export async function fetchRoomQr(id: number): Promise<RoomQrIdentity | null> {
  const { data } = await apiClient.get<ApiSuccessResponse<{ qr_identity: RoomQrIdentity | null }>>(
    `/rooms/${id}/qr`,
  )

  return data.data.qr_identity
}

export async function fetchRoomQrHistory(id: number): Promise<RoomQrHistoryEntry[]> {
  const { data } = await apiClient.get<ApiSuccessResponse<{ qr_identities: RoomQrHistoryEntry[] }>>(
    `/rooms/${id}/qr/history`,
  )

  return data.data.qr_identities
}

export async function regenerateRoomQr(id: number): Promise<RoomQrIdentity> {
  const { data } = await apiClient.post<ApiSuccessResponse<{ qr_identity: RoomQrIdentity }>>(
    `/rooms/${id}/qr/regenerate`,
  )

  return data.data.qr_identity
}

export async function revokeRoomQr(id: number, reason: string): Promise<RoomQrIdentity> {
  const { data } = await apiClient.post<ApiSuccessResponse<{ qr_identity: RoomQrIdentity }>>(
    `/rooms/${id}/qr/revoke`,
    { reason },
  )

  return data.data.qr_identity
}

export async function fetchRoomOccupancies(
  id: number,
  filters: { date?: string; per_page?: number } = {},
): Promise<{ occupancies: RoomOccupancyRecord[]; pagination: RoomOccupancyPagination }> {
  const { data } = await apiClient.get<
    ApiSuccessResponse<{ occupancies: RoomOccupancyRecord[]; pagination: RoomOccupancyPagination }>
  >(`/rooms/${id}/occupancies`, { params: filters })

  return data.data
}

export async function resolveRoomDiscrepancy(
  occupancyId: number,
  resolutionNotes: string,
): Promise<RoomOccupancyRecord> {
  const { data } = await apiClient.post<ApiSuccessResponse<{ occupancy: RoomOccupancyRecord }>>(
    `/rooms/occupancies/${occupancyId}/resolve-discrepancy`,
    { resolution_notes: resolutionNotes },
  )

  return data.data.occupancy
}

export async function fetchRoom(id: number): Promise<RoomDetail> {
  const { data } = await apiClient.get<ApiSuccessResponse<{ room: RoomDetail }>>(`/rooms/${id}`)

  return data.data.room
}

export async function createRoom(payload: RoomInput): Promise<Room> {
  const { data } = await apiClient.post<ApiSuccessResponse<{ room: Room }>>('/rooms', payload)

  return data.data.room
}

export async function updateRoom(id: number, payload: RoomUpdateInput): Promise<Room> {
  const { data } = await apiClient.patch<ApiSuccessResponse<{ room: Room }>>(
    `/rooms/${id}`,
    payload,
  )

  return data.data.room
}

export async function updateRoomStatus(id: number, status: RoomStatus): Promise<Room> {
  const { data } = await apiClient.patch<ApiSuccessResponse<{ room: Room }>>(
    `/rooms/${id}/status`,
    { status },
  )

  return data.data.room
}
