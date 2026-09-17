import type { AddOnOffering, AvailabilityOption, BookingConfirmation, BookingPayload } from './types';

type ApiResponse<T> = { success: boolean; data: T; error?: string; code?: string };

export async function loadAddOnCatalog(propertyCode: string, signal?: AbortSignal) {
  const query = new URLSearchParams({ propertyCode });
  const response = await fetch(`/api/add_on_catalog?${query}`, { signal });
  const result = await response.json() as ApiResponse<AddOnOffering[]>;
  if (!response.ok || !result.success) throw new Error(result.error || 'Unable to load optional experiences.');
  return result.data;
}

export async function loadBookingAvailability(input: { propertyCode: string; checkInDate: string; checkOutDate: string; adultsCount: number; childrenCount: number; addOnCodes?: string[]; signal?: AbortSignal }) {
  const query = new URLSearchParams({ propertyCode: input.propertyCode, checkInDate: input.checkInDate, checkOutDate: input.checkOutDate, roomsCount: '1', adultsCount: String(input.adultsCount), childrenCount: String(input.childrenCount) });
  if (input.addOnCodes?.length) query.set('addOnCodes', input.addOnCodes.join(','));
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
