export type Reservation = {
  id: string; confirmationNumber: string; status: string; source: string; checkInDate: string; checkOutDate: string;
  guest: { id: string; name: string; phone: string }; adultsCount: number; childrenCount: number; grandTotal: number; advancePaid: number; folioNumber?: string;
  rooms: Array<{ id: string; roomTypeId: string; roomType: string; roomId?: string; roomNumber?: string; nightlyRate: number; nights: number }>;
};
