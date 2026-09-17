import type { AvailabilityOption, BookingConfirmation, BookingPayload } from './types';

type ApiResponse<T> = { success: boolean; data: T; error?: string; code?: string };

export async function loadBookingAvailability(input: { propertyCode: string; checkInDate: string; checkOutDate: string; adultsCount: number; childrenCount: number; signal?: AbortSignal }) {
  const query = new URLSearchParams({ propertyCode: input.propertyCode, checkInDate: input.checkInDate, checkOutDate: input.checkOutDate, roomsCount: '1', adultsCount: String(input.adultsCount), childrenCount: String(input.childrenCount) });
  const response = await fetch(`/api/availability?${query}`, { signal: input.signal });
  const result = await response.json() as ApiResponse<AvailabilityOption[]>;
  if (!response.ok || !result.success) throw new Error(result.error || 'Unable to load available rooms.');
  return result.data;
}

export async function createBooking(payload: BookingPayload) {
  const response = await fetch('/api/pms/reservations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const result = await response.json() as ApiResponse<BookingConfirmation>;
  if (!response.ok || !result.success) throw new Error(result.error || 'Failed to create reservation.');
  return result.data;
}
