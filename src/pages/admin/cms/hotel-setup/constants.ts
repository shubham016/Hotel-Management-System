import type { BulkRoomForm, FloorForm, RoomForm, RoomTypeForm } from './types';

export const ROOM_STATUSES = ['VACANT_CLEAN', 'VACANT_DIRTY', 'OCCUPIED', 'RESERVED', 'DUE_OUT', 'OUT_OF_ORDER', 'OUT_OF_SERVICE', 'INSPECTION_REQUIRED'] as const;
export const BLANK_FLOOR: FloorForm = { number: 1, name: '', active: true };
export const BLANK_ROOM_TYPE: RoomTypeForm = { name: '', code: '', slug: '', description: '', base_price: '', bed_count: '', max_adults: '', max_children: '', max_occupancy: '', amenities: [], active: true };
export const BLANK_ROOM: RoomForm = { room_number: '', floor: 1, room_type_id: '', status: 'VACANT_CLEAN', active: true, smoking: false, accessible: false };
export const BLANK_BULK_ROOM: BulkRoomForm = { start_room_number: '', quantity: 1, floor: 1, room_type_id: '', active: true, smoking: false, accessible: false };
export const readableStatus = (value: string) => value.replaceAll('_', ' ');
