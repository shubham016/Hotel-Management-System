export type SetupTab = 'floors' | 'room_types' | 'rooms';
export type Floor = { id: string; number: number; name: string; active: boolean };
export type RoomType = { id: string; name: string; code: string; slug: string; description?: string; image_url?: string | null; base_price: number; bed_category: string; bed_count: number; max_adults: number; max_children: number; max_occupancy: number; amenities: string[]; active: boolean };
export type Room = { id: string; roomNumber: string; floor: number; status: string; active: boolean; smoking: boolean; accessible: boolean; roomType: { id: string; name: string; code: string } };
export type FloorForm = Omit<Floor, 'id'>;
export type RoomTypeForm = Omit<RoomType, 'id' | 'description' | 'image_url' | 'base_price' | 'bed_count' | 'max_adults' | 'max_children' | 'max_occupancy'> & {
  description: string;
  image_url: string;
  base_price: number | '';
  bed_count: number | '';
  max_adults: number | '';
  max_children: number | '';
  max_occupancy: number | '';
};
export type RoomForm = { room_number: string; floor: number; room_type_id: string; status: string; active: boolean; smoking: boolean; accessible: boolean };
export type BulkRoomForm = { start_room_number: string; quantity: number; floor: number; room_type_id: string; active: boolean; smoking: boolean; accessible: boolean };
export type BulkRoomUpdateForm = { floor: number | ''; room_type_id: string; status: string; active: boolean | ''; smoking: boolean | ''; accessible: boolean | '' };
export type SetupData = { floors: Floor[]; roomTypes: RoomType[]; rooms: Room[] };
