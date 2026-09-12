import { Pencil, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { readableStatus } from '../constants';
import type { Floor, Room, RoomType, SetupTab } from '../types';

type Props = {
  tab: SetupTab;
  floors: Floor[];
  roomTypes: RoomType[];
  rooms: Room[];
  onEditFloor: (floor: Floor) => void;
  onEditRoomType: (roomType: RoomType) => void;
  onEditRoom: (room: Room) => void;
  onRemove: (resource: string, id: string, name: string) => void;
};

function Actions({ onEdit, onRemove }: { onEdit: () => void; onRemove: () => void }) {
  return <td style={{ whiteSpace: 'nowrap' }}><button className="hne-btn hne-btn-secondary hne-btn-xs" onClick={onEdit} aria-label="Edit"><Pencil size={13} /></button>{' '}<button className="hne-btn hne-btn-danger hne-btn-xs" onClick={onRemove} aria-label="Delete"><Trash2 size={13} /></button></td>;
}

export function SetupTable({ tab, floors, roomTypes, rooms, onEditFloor, onEditRoomType, onEditRoom, onRemove }: Props) {
  const count = tab === 'floors' ? floors.length : tab === 'room_types' ? roomTypes.length : rooms.length;
  const title = tab === 'floors' ? 'Floors' : tab === 'room_types' ? 'Room Categories' : 'Rooms';

  return <Card title={`${title} (${count})`}>
    {tab === 'floors' && <table className="hne-table"><thead><tr><th>No.</th><th>Name</th><th>Status</th><th /></tr></thead><tbody>{floors.map((floor) => <tr key={floor.id}><td>{floor.number}</td><td>{floor.name}</td><td>{floor.active ? 'Active' : 'Inactive'}</td><Actions onEdit={() => onEditFloor(floor)} onRemove={() => onRemove('floors', floor.id, floor.name)} /></tr>)}</tbody></table>}
    {tab === 'room_types' && <table className="hne-table"><thead><tr><th>Category</th><th>Code</th><th>Rate</th><th>Capacity</th><th /></tr></thead><tbody>{roomTypes.map((roomType) => <tr key={roomType.id}><td>{roomType.name}{!roomType.active && ' (Inactive)'}</td><td>{roomType.code}</td><td>Rs. {Number(roomType.base_price).toLocaleString()}</td><td>{roomType.max_occupancy}</td><Actions onEdit={() => onEditRoomType(roomType)} onRemove={() => onRemove('room_types', roomType.id, roomType.name)} /></tr>)}</tbody></table>}
    {tab === 'rooms' && <table className="hne-table"><thead><tr><th>Room</th><th>Floor</th><th>Category</th><th>Status</th><th /></tr></thead><tbody>{rooms.map((room) => <tr key={room.id}><td>{room.roomNumber}</td><td>{room.floor}</td><td>{room.roomType.name}</td><td>{readableStatus(room.status)}</td><Actions onEdit={() => onEditRoom(room)} onRemove={() => onRemove('rooms', room.id, `room ${room.roomNumber}`)} /></tr>)}</tbody></table>}
  </Card>;
}
