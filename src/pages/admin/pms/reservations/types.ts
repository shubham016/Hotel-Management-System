export type Reservation = {
  totalPaid: number;
  cancellationRefund: { status: 'PENDING' | 'PAID'; paidAmount: number; deductionAmount: number; refundAmount: number; paymentMethod: string | null; reference: string | null; paidAt: string | null } | null;
  id: string; confirmationNumber: string; status: string; source: string; checkInDate: string; checkOutDate: string;
  guest: { id: string; name: string; phone: string; idType?: string; idNumber?: string }; adultsCount: number; childrenCount: number; grandTotal: number; advancePaid: number; folioId?: string; folioNumber?: string;
  rooms: Array<{ id: string; roomTypeId: string; roomType: string; roomId?: string; roomNumber?: string; nightlyRate: number; nights: number }>;
};
