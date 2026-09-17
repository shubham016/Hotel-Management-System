import type { BulkRoomUpdateForm, Room, SetupData } from './types';

type ApiResponse<T> = { success: boolean; data: T; error?: string; details?: Record<string, string[]> };

function errorMessage<T>(result: ApiResponse<T>) {
  if (!result.details) return result.error || 'The hotel setup request failed.';
  return Object.entries(result.details)
    .map(([field, messages]) => `${field.replaceAll('_', ' ')} ${messages.join(', ')}`)
    .join('. ');
}

async function setupRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/setup/${path}`, { headers: { 'Content-Type': 'application/json' }, ...init });
  const result = await response.json() as ApiResponse<T>;
  if (!response.ok || !result.success) throw new Error(errorMessage(result));
  return result.data;
}

export async function loadHotelSetup(): Promise<SetupData> {
  return setupRequest<SetupData>('hotel_setup');
}

export function saveSetupRecord<T>(resource: string, key: string, data: unknown, id?: string | null) {
  return setupRequest<T>(`${resource}${id ? `?id=${id}` : ''}`, { method: id ? 'PATCH' : 'POST', body: JSON.stringify({ [key]: data }) });
}

export function createRoomBatch(data: unknown): Promise<Room[]> {
  return setupRequest<Room[]>('rooms/bulk', { method: 'POST', body: JSON.stringify({ rooms: data }) });
}

export function deleteSetupRecord(resource: string, id: string) {
  return setupRequest(`${resource}?id=${id}`, { method: 'DELETE' });
}

export function deleteRoomsOnFloor(floor: number) {
  return setupRequest(`rooms/floor/${floor}`, { method: 'DELETE' });
}

export function updateRoomsOnFloor(floor: number, data: BulkRoomUpdateForm): Promise<Room[]> {
  const changes = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== ''));
  return setupRequest<Room[]>(`rooms/floor/${floor}`, { method: 'PATCH', body: JSON.stringify({ rooms: changes }) });
}
