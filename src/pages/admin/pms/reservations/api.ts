import type { Reservation } from './types';

export async function loadReservations() {
  const response = await fetch('/api/pms/reservations');
  const result = await response.json() as { success: boolean; data: Reservation[]; error?: string };
  if (!response.ok || !result.success) throw new Error(result.error || 'Unable to load reservations.');
  return result.data;
}
