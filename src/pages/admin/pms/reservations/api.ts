import type { Reservation } from './types';

export async function loadReservations({ page = 1, query = '', status = 'ALL', reservationId, signal }: { page?: number; query?: string; status?: string; reservationId?: string; signal?: AbortSignal } = {}) {
  const params = new URLSearchParams({ page: String(page), perPage: '10', query, status });
  if (reservationId) params.set('reservationId', reservationId);
  const response = await fetch(`/api/pms/reservations?${params}`, { signal });
  const result = await response.json() as { success: boolean; data: Reservation[]; pagination: { total: number }; error?: string };
  if (!response.ok || !result.success) throw new Error(result.error || 'Unable to load reservations.');
  return { reservations: result.data, total: result.pagination.total };
}

export async function loadReservation(id: string) {
  const response = await fetch(`/api/pms/reservations/${encodeURIComponent(id)}`);
  const result = await response.json() as { success: boolean; data: Reservation; error?: string };
  if (!response.ok || !result.success) throw new Error(result.error || 'Unable to load booking.');
  return result.data;
}

export async function recordAdvance(id: string, details: { amount: number; paymentMethod: string; transactionRef: string; idempotencyKey: string }) {
  const response = await fetch(`/api/pms/reservations/${encodeURIComponent(id)}/advance`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(details) });
  const result = await response.json() as { success: boolean; data: Reservation; error?: string };
  if (!response.ok || !result.success) throw new Error(result.error || 'Unable to record advance.');
  return result.data;
}

export async function updateReservationStatus(id: string, action: 'check-in' | 'cancel' | 'refund', details: { reason?: string; roomId?: string; expectedPaidAmount?: number; refundMethod?: string; refundReference?: string } = {}) {
  const response = await fetch(`/api/pms/reservations/${id}/${action}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(details)
  });
  const result = await response.json() as { success: boolean; data?: Reservation; error?: string };
  if (!response.ok || !result.success || !result.data) throw new Error(result.error || `Unable to ${action} reservation.`);
  return result.data;
}

export async function deleteReservation(id: string) {
  const response = await fetch(`/api/pms/reservations/${id}`, { method: 'DELETE' });
  const result = await response.json() as { success: boolean; data?: { id: string }; error?: string };
  if (!response.ok || !result.success || !result.data) throw new Error(result.error || 'Unable to delete booking.');
  return result.data.id;
}
