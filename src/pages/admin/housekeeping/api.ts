import type { HousekeepingAction, HousekeepingRoom, HousekeepingStaff } from './types';

async function request<T>(init?: RequestInit): Promise<T> {
  const response = await fetch('/api/housekeeping/tasks', init);
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.error || 'Unable to update housekeeping.');
  return data;
}

export const loadHousekeeping = () => request<{ rooms: HousekeepingRoom[]; staff: HousekeepingStaff[]; canAssign: boolean }>();
export const updateHousekeeping = (roomId: string, action: HousekeepingAction, staffMemberId?: string) =>
  request<{ data: HousekeepingRoom; message: string }>({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roomId, action, staffMemberId }) });
