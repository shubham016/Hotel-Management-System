export type HousekeepingTask = {
  id: string;
  status: string;
  task_type: string;
  assigned_to: string | null;
  assigned_staff_member_id: string | null;
  completed_by_name: string | null;
};

export type HousekeepingRoom = {
  id: string;
  roomNumber: string;
  floor: number;
  status: string;
  roomType: string;
  stayoverEligible: boolean;
  latestTask: HousekeepingTask | null;
};

export type HousekeepingStaff = { id: string; name: string };
export type HousekeepingAction = 'MARK_CLEAN' | 'MARK_FOR_INSPECTION' | 'MARK_INSPECTED' | 'SERVICE_STAYOVER' | 'ASSIGN';
