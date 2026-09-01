export type UserRole =
  | 'SUPER_ADMIN'
  | 'COMPANY_ADMIN'
  | 'GENERAL_MANAGER'
  | 'FRONT_OFFICE_MANAGER'
  | 'FRONT_DESK_USER'
  | 'RESERVATION_USER'
  | 'ACCOUNTANT'
  | 'FINANCE_MANAGER'
  | 'CASHIER'
  | 'RESTAURANT_MANAGER'
  | 'RESTAURANT_CASHIER'
  | 'HOUSEKEEPING_MANAGER'
  | 'HOUSEKEEPER'
  | 'STORE_MANAGER'
  | 'PURCHASE_OFFICER'
  | 'HR_MANAGER'
  | 'EVENT_MANAGER'
  | 'AUDITOR'
  | 'REPORT_VIEWER';

export type RoomStatus =
  | 'VACANT_CLEAN'
  | 'VACANT_DIRTY'
  | 'OCCUPIED'
  | 'RESERVED'
  | 'DUE_OUT'
  | 'OUT_OF_ORDER'
  | 'OUT_OF_SERVICE'
  | 'INSPECTION_REQUIRED';

export type ReservationStatus =
  | 'INQUIRY'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'CHECKED_OUT'
  | 'CANCELLED'
  | 'NO_SHOW';

export type FolioStatus = 'OPEN' | 'SETTLED' | 'CLOSED' | 'VOID';

export type PaymentMethodType =
  | 'CASH'
  | 'CREDIT_CARD'
  | 'DEBIT_CARD'
  | 'BANK_TRANSFER'
  | 'ESEWA'
  | 'KHALTI'
  | 'FONEPAY'
  | 'CORPORATE_CREDIT';

export interface AuthSession {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  companyId: string;
  propertyName?: string;
  propertyId?: string;
}

export interface KPIStats {
  occupancyRate: number;
  totalRooms: number;
  occupiedRooms: number;
  availableRooms: number;
  dirtyRooms: number;
  todayArrivals: number;
  todayDepartures: number;
  inHouseGuests: number;
  todayRevenue: number;
  roomRevenue: number;
  fnbRevenue: number;
  adr: number;
  revPar: number;
  pendingReceivables: number;
  pendingPayables: number;
}
