import type { Reservation } from './types';

export async function loadReservations() {
  const response = await fetch('/api/pms/reservations');
  const result = await response.json() as { success: boolean; data: Reservation[]; error?: string };
  if (!response.ok || !result.success) throw new Error(result.error || 'Unable to load reservations.');
  return result.data;
}

export async function updateReservationStatus(id: string, action: 'check-in' | 'cancel', details: { reason?: string; roomId?: string } = {}) {
  const response = await fetch(`/api/pms/reservations/${id}/${action}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(details)
  });
  const result = await response.json() as { success: boolean; data?: Reservation; error?: string };
  if (!response.ok || !result.success || !result.data) throw new Error(result.error || `Unable to ${action} reservation.`);
  return result.data;
}
