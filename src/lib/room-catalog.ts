import { DEFAULT_ROOM_IMAGE, ROOM_IMAGES } from '@/pages/public/book/constants';

export type PublicRoomType = {
  id: string;
  name: string;
  code: string;
  slug: string;
  description?: string;
  image_url?: string | null;
  base_price: number;
  bed_category: string;
  bed_count: number;
  max_adults: number;
  max_children: number;
  max_occupancy: number;
  amenities: string[];
  active: boolean;
};

type RoomTypesResponse = { success: boolean; data?: PublicRoomType[]; error?: string };

export async function loadPublicRoomTypes(signal?: AbortSignal): Promise<PublicRoomType[]> {
  const propertyCode = import.meta.env.VITE_DEFAULT_PROPERTY_CODE || 'HNE-BTW';
  const query = new URLSearchParams({ propertyCode });
  const response = await fetch(`/api/room_catalog?${query}`, { signal });
  const result = await response.json() as RoomTypesResponse;
  if (!response.ok || !result.success || !result.data) {
    throw new Error(result.error || 'Unable to load room categories.');
  }
  return result.data;
}

export function roomTypeToCard(roomType: PublicRoomType) {
  const bedLabel = `${roomType.bed_count} ${roomType.bed_category} ${roomType.bed_count === 1 ? 'bed' : 'beds'}`;
  return {
    id: roomType.id,
    name: roomType.name,
    code: roomType.code,
    slug: roomType.slug,
    description: roomType.description || `${bedLabel} with accommodation for up to ${roomType.max_occupancy} guests.`,
    basePrice: Number(roomType.base_price),
    maxOccupancy: roomType.max_occupancy,
    maxAdults: roomType.max_adults,
    maxChildren: roomType.max_children,
    bedType: bedLabel,
    coverImageUrl: roomType.image_url || ROOM_IMAGES[roomType.code] || DEFAULT_ROOM_IMAGE,
    amenities: roomType.amenities || []
  };
}
