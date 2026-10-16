class HousekeepingTask < ApplicationRecord
  belongs_to :room
  belongs_to :assigned_staff_member, class_name: "StaffMember", optional: true
  belongs_to :completed_by, class_name: "User", optional: true

  validates :task_type, :status, presence: true
  validates :service_date, presence: true, if: -> { task_type == "STAYOVER" }
  validate do
    if assigned_staff_member && assigned_staff_member.property_id != room.property_id
      errors.add(:assigned_staff_member, "must belong to the room's property")
    end
    if completed_by && completed_by.company_id != room.property.company_id
      errors.add(:completed_by, "must belong to the room's company")
    end
  end
end
