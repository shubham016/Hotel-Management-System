import type { SetupData } from './types';

type ApiResponse<T> = { success: boolean; data: T; error?: string };

async function setupRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/setup/${path}`, { headers: { 'Content-Type': 'application/json' }, ...init });
  const result = await response.json() as ApiResponse<T>;
  if (!response.ok || !result.success) throw new Error(result.error || 'The hotel setup request failed.');
  return result.data;
}

export async function loadHotelSetup(): Promise<SetupData> {
  const [floors, roomTypes, rooms] = await Promise.all([
    setupRequest<SetupData['floors']>('floors'),
    setupRequest<SetupData['roomTypes']>('room_types'),
    setupRequest<SetupData['rooms']>('rooms')
  ]);
  return { floors, roomTypes, rooms };
}

export function saveSetupRecord(resource: string, key: string, data: unknown, id?: string | null) {
  return setupRequest(`${resource}${id ? `?id=${id}` : ''}`, { method: id ? 'PATCH' : 'POST', body: JSON.stringify({ [key]: data }) });
}

export function deleteSetupRecord(resource: string, id: string) {
  return setupRequest(`${resource}?id=${id}`, { method: 'DELETE' });
}
