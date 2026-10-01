import { Fragment, useState } from 'react';
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
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
  onAdd: () => void;
  onRemove: (resource: string, id: string, name: string) => void;
  onRemoveFloorRooms: (floor: number, name: string, count: number) => void;
  onEditFloorRooms: (floor: number, name: string, count: number) => void;
};

function Actions({ onEdit, onRemove }: { onEdit: () => void; onRemove: () => void }) {
  return <td style={{ whiteSpace: 'nowrap' }}><button className="hne-btn hne-btn-secondary hne-btn-xs" onClick={onEdit} aria-label="Edit"><Pencil size={13} /></button>{' '}<button className="hne-btn hne-btn-danger hne-btn-xs" onClick={onRemove} aria-label="Delete"><Trash2 size={13} /></button></td>;
}

function roomRange(rooms: Room[]) {
  const numbers = rooms.map((room) => Number(room.roomNumber)).filter(Number.isFinite).sort((a, b) => a - b);
  if (!numbers.length) return rooms.map((room) => room.roomNumber).join(', ');
  const ranges: string[] = [];
  let start = numbers[0];
  let end = numbers[0];
  numbers.slice(1).forEach((number) => {
    if (number === end + 1) end = number;
    else { ranges.push(start === end ? String(start) : `${start}–${end}`); start = number; end = number; }
  });
  ranges.push(start === end ? String(start) : `${start}–${end}`);
  return ranges.join(', ');
}

function summary<T>(items: T[], label: (item: T) => string) {
  return Array.from(items.reduce((counts, item) => counts.set(label(item), (counts.get(label(item)) || 0) + 1), new Map<string, number>()).entries())
    .map(([name]) => name).join(', ');
}

export function SetupTable({ tab, floors, roomTypes, rooms, onEditFloor, onEditRoomType, onEditRoom, onAdd, onRemove, onRemoveFloorRooms, onEditFloorRooms }: Props) {
  const [expandedFloor, setExpandedFloor] = useState<number | null>(null);
  const count = tab === 'floors' ? floors.length : tab === 'room_types' ? roomTypes.length : rooms.length;
  const title = tab === 'floors' ? 'Floors' : tab === 'room_types' ? 'Room Categories' : 'Rooms';
  const addLabel = tab === 'floors' ? 'Add Floor' : tab === 'room_types' ? 'Add Room Category' : 'Add Rooms';
  const roomsByFloor = rooms.reduce((groups, room) => {
    const group = groups.get(room.floor) || [];
    group.push(room);
    groups.set(room.floor, group);
    return groups;
  }, new Map<number, Room[]>());

  return <Card className="hne-setup-table-card" title={`${title} (${count})`} action={<Button size="sm" onClick={onAdd}><Plus size={15} />{addLabel}</Button>}>
    {tab === 'floors' && <table className="hne-table"><thead><tr><th>No.</th><th>Name</th><th>Status</th><th>Actions</th></tr></thead><tbody>{floors.map((floor) => <tr key={floor.id}><td>{floor.number}</td><td>{floor.name}</td><td>{floor.active ? 'Active' : 'Inactive'}</td><Actions onEdit={() => onEditFloor(floor)} onRemove={() => onRemove('floors', floor.id, floor.name)} /></tr>)}</tbody></table>}
    {tab === 'room_types' && <table className="hne-table"><thead><tr><th>Image</th><th>Category</th><th>Code</th><th>Rate</th><th>Bed category</th><th>Beds</th><th>Capacity</th><th>Actions</th></tr></thead><tbody>{roomTypes.map((roomType) => <tr key={roomType.id}><td>{roomType.image_url ? <img src={roomType.image_url} alt={roomType.name} style={{ width: 64, height: 44, objectFit: 'cover', borderRadius: 4 }} /> : '—'}</td><td>{roomType.name}{!roomType.active && ' (Inactive)'}</td><td>{roomType.code}</td><td>Rs. {Number(roomType.base_price).toLocaleString()}</td><td>{roomType.bed_category}</td><td>{roomType.bed_count}</td><td>{roomType.max_occupancy}</td><Actions onEdit={() => onEditRoomType(roomType)} onRemove={() => onRemove('room_types', roomType.id, roomType.name)} /></tr>)}</tbody></table>}
    {tab === 'rooms' && <table className="hne-table"><thead><tr><th>Floor</th><th>Rooms</th><th>Categories</th><th>Status</th><th>Actions</th></tr></thead><tbody>{Array.from(roomsByFloor.entries()).sort(([left], [right]) => left - right).map(([floorNumber, floorRooms]) => {
      const isExpanded = expandedFloor === floorNumber;
      const floorName = floors.find((floor) => floor.number === floorNumber)?.name || `Floor ${floorNumber}`;
      return <Fragment key={`floor-group-${floorNumber}`}>
        <tr key={`floor-${floorNumber}`}><td><strong>{floorName}</strong></td><td><strong>{roomRange(floorRooms)}</strong></td><td>{summary(floorRooms, (room) => room.roomType.name)}</td><td>{summary(floorRooms, (room) => readableStatus(room.status))}</td><td style={{ whiteSpace: 'nowrap' }}><button type="button" className="hne-btn hne-btn-secondary hne-btn-xs" onClick={() => setExpandedFloor(isExpanded ? null : floorNumber)}>{isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}<span>{isExpanded ? 'Hide' : 'Manage'}</span></button>{' '}<button type="button" className="hne-btn hne-btn-secondary hne-btn-xs" onClick={() => onEditFloorRooms(floorNumber, floorName, floorRooms.length)} aria-label={`Edit all rooms on ${floorName}`} title="Edit all rooms on this floor"><Pencil size={13} /></button>{' '}<button type="button" className="hne-btn hne-btn-danger hne-btn-xs" onClick={() => onRemoveFloorRooms(floorNumber, floorName, floorRooms.length)} aria-label={`Delete all rooms on ${floorName}`} title="Delete all rooms on this floor"><Trash2 size={13} /></button></td></tr>
        {isExpanded && <tr key={`details-${floorNumber}`}><td colSpan={5} style={{ padding: 12, background: 'var(--bg-subtle)' }}><table className="hne-table" style={{ background: 'var(--bg-card)' }}><thead><tr><th>Room</th><th>Category</th><th>Status</th><th>Actions</th></tr></thead><tbody>{floorRooms.map((room) => <tr key={room.id}><td>{room.roomNumber}</td><td>{room.roomType.name}</td><td>{readableStatus(room.status)}</td><Actions onEdit={() => onEditRoom(room)} onRemove={() => onRemove('rooms', room.id, `room ${room.roomNumber}`)} /></tr>)}</tbody></table></td></tr>}
      </Fragment>;
    })}</tbody></table>}
  </Card>;
}
