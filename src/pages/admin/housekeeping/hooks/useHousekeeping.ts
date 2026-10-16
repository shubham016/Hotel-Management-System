import { useEffect, useState } from 'react';
import { publishRoomUpdate, useRoomUpdates } from '@/lib/room-updates';
import { loadHousekeeping, updateHousekeeping } from '../api';
import type { HousekeepingAction, HousekeepingRoom, HousekeepingStaff } from '../types';

export function useHousekeeping() {
  const [rooms, setRooms] = useState<HousekeepingRoom[]>([]);
  const [staff, setStaff] = useState<HousekeepingStaff[]>([]);
  const [canAssign, setCanAssign] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const fetchHousekeeping = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const data = await loadHousekeeping();
      setRooms(data.rooms); setStaff(data.staff); setCanAssign(data.canAssign); setError('');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load housekeeping.'); }
    finally { if (showLoading) setIsLoading(false); }
  };
  useEffect(() => { void fetchHousekeeping(); }, []);
  useRoomUpdates(() => { void fetchHousekeeping(false); });

  const update = async (room: HousekeepingRoom, action: HousekeepingAction, staffMemberId?: string) => {
    setIsUpdating(room.id); setMessage('');
    try {
      const result = await updateHousekeeping(room.id, action, staffMemberId);
      setRooms(current => current.map(item => item.id === result.data.id ? result.data : item));
      setError(''); setMessage(result.message); publishRoomUpdate();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to update housekeeping.'); }
    finally { setIsUpdating(null); }
  };
  return { rooms, staff, canAssign, isLoading, isUpdating, error, message, fetchHousekeeping, update,
    dirtyCount: rooms.filter(room => ['VACANT_DIRTY', 'INSPECTION_REQUIRED'].includes(room.status)).length };
}
