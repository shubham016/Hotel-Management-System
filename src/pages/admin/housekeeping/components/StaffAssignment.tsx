import React from 'react';
import type { HousekeepingRoom, HousekeepingStaff } from '../types';

export function StaffAssignment({ room, staff, canAssign, disabled, onAssign }: {
  room: HousekeepingRoom; staff: HousekeepingStaff[]; canAssign: boolean; disabled: boolean; onAssign: (id: string) => void;
}) {
  const actionable = room.stayoverEligible || ['VACANT_DIRTY', 'INSPECTION_REQUIRED'].includes(room.status);
  const completed = room.stayoverEligible && room.latestTask?.status === 'COMPLETED';
  return <div style={{ display: 'grid', gap: 4 }}>
    {canAssign && actionable && !completed ? <select className="hne-input" aria-label={`Assign room ${room.roomNumber}`} value={room.latestTask?.assigned_staff_member_id || ''} disabled={disabled} onChange={event => onAssign(event.target.value)}>
      <option value="">Unassigned</option>
      {room.latestTask?.assigned_staff_member_id && !staff.some(person => person.id === room.latestTask?.assigned_staff_member_id) && <option value={room.latestTask.assigned_staff_member_id} disabled>{room.latestTask.assigned_to} (inactive)</option>}
      {staff.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}
    </select> : <span>{room.latestTask?.assigned_to || 'Unassigned'}</span>}
    {room.latestTask?.completed_by_name && room.latestTask.status === 'COMPLETED' && <span>Completed by {room.latestTask.completed_by_name}</span>}
  </div>;
}
