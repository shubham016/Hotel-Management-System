export const PROPERTY_CODE = import.meta.env.VITE_DEFAULT_PROPERTY_CODE || 'HNE-BTW';
export const DEFAULT_ROOM_IMAGE = 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80';
export const ROOM_IMAGES: Record<string, string> = {
  'LUX-01': DEFAULT_ROOM_IMAGE,
  'DLX-01': 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80',
  'FAM-01': 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=600&q=80',
  'HNY-01': 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=600&q=80',
  'STD-AC': 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85b?auto=format&fit=crop&w=600&q=80',
  'STD-01': 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=600&q=80'
};
