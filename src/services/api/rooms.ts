import type { ApiSuccessResponse } from '@/types/api'
import type {
  Room,
  RoomDetail,
  RoomFilters,
  RoomInput,
  RoomPagination,
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
  const { data } = await apiClient.get<ApiSuccessResponse<RoomDirectoryResponse>>('/rooms', {
    params: filters,
  })

  return data.data
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
