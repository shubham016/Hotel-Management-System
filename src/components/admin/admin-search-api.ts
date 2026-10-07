export type ReservationSearchResult = {
  id: string;
  confirmationNumber: string;
  status: string;
  guest: { name: string; phone: string; idType?: string; idNumber?: string };
  rooms: Array<{ roomNumber?: string; roomType: string }>;
};

export async function searchReservations(query: string, signal: AbortSignal) {
  const params = new URLSearchParams({ query, perPage: '8' });
  const response = await fetch(`/api/pms/reservations?${params}`, { signal });
  const result = await response.json() as { success: boolean; data: ReservationSearchResult[]; pagination: { total: number }; error?: string };
  if (!response.ok || !result.success) throw new Error(result.error || 'Unable to search reservations.');
  return { matches: result.data, total: result.pagination.total };
}
