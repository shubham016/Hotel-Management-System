export type AvailableRoom = { id: string; roomNumber: string; floor: number; status: string; roomType: string; roomTypeCode: string };

export type AvailabilityOption = {
  roomType: { id: string; name: string; code: string; description?: string; base_price: number; bed_category: string; amenities: string[]; bed_count: number; max_adults: number; max_children: number; max_occupancy: number };
  availableRooms: number;
  rooms: AvailableRoom[];
  quote: { nights: number; nightlyRate: number; roomTotal: number; subTotal: number; serviceCharge: number; vatAmount: number; grandTotal: number };
};

export type BookingConfirmation = { id: string; confirmationNumber: string; folioNumber: string; guestName: string; roomName: string; roomId: string; roomNumber: string; checkInDate: string; checkOutDate: string; nights: number; subTotal: number; serviceCharge: number; vatAmount: number; grandTotal: number; paymentStatus: string };

export type BookingPayload = { propertyCode: string; checkInDate: string; checkOutDate: string; roomTypeCode: string; roomId: string; roomsCount: number; adultsCount: number; childrenCount: number; firstName: string; lastName: string; email: string; phone: string; idType: string; idNumber: string; specialRequests: string; addOns: Record<string, boolean>; source: 'DIRECT_WEB' | 'WALK_IN' };
