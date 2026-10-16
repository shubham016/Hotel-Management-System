module Housekeeping
  class UpdateTask
    ACTIONS = %w[MARK_CLEAN MARK_FOR_INSPECTION MARK_INSPECTED SERVICE_STAYOVER ASSIGN].freeze

    def self.call(room:, action:, user:, staff_member_id: nil)
      raise ApiError.new("Invalid housekeeping action", status: :bad_request, code: "INVALID_ACTION") unless ACTIONS.include?(action)

      room.with_lock do
        occupied = room.reservation_rooms.joins(:reservation).where(reservations: { status: "CHECKED_IN" }).exists?
        if action == "SERVICE_STAYOVER" || (action == "ASSIGN" && occupied)
          raise ApiError.new("This room has no checked-in guest", status: :conflict, code: "ROOM_NOT_OCCUPIED") unless occupied
          task = room.housekeeping_tasks.find_or_initialize_by(task_type: "STAYOVER", service_date: room.property.operating_date)
        else
          if occupied || room.status.in?(%w[OCCUPIED DUE_OUT])
            raise ApiError.new("Check the guest out before marking this room clean", status: :conflict, code: "ROOM_OCCUPIED")
          end
          unless room.status.in?(%w[VACANT_DIRTY INSPECTION_REQUIRED])
            raise ApiError.new("Only rooms awaiting cleaning or inspection can be updated here", status: :conflict, code: "ROOM_NOT_IN_QUEUE")
          end
          if action == "MARK_INSPECTED" && room.status != "INSPECTION_REQUIRED"
            raise ApiError.new("Clean the room before completing its inspection", status: :conflict, code: "INSPECTION_NOT_READY")
          end
          if action == "MARK_FOR_INSPECTION" && room.status != "VACANT_DIRTY"
            raise ApiError.new("This room is already awaiting inspection", status: :conflict, code: "INSPECTION_ALREADY_PENDING")
          end
          task_type = room.status == "INSPECTION_REQUIRED" ? "INSPECTION" : "CLEANING"
          task = room.housekeeping_tasks.find_or_initialize_by(task_type:, status: "PENDING")
        end

        if action == "ASSIGN"
          raise ApiError.new("This service is already completed", status: :conflict, code: "TASK_COMPLETED") if task.status == "COMPLETED"
          staff = room.property.staff_members.where(active: true).find(staff_member_id) if staff_member_id.present?
          task.update!(assigned_staff_member: staff, assigned_to: staff&.name)
        else
          next task if task.persisted? && task.status == "COMPLETED"
          task.update!(status: "COMPLETED", assigned_to: task.assigned_to.presence || user.full_name, completed_by: user, completed_at: Time.current)
          room.update!(status: action == "MARK_FOR_INSPECTION" ? "INSPECTION_REQUIRED" : "VACANT_CLEAN") unless action == "SERVICE_STAYOVER"
        end
        AuditLog.create!(company: room.property.company, property: room.property, user:, module_name: "HOUSEKEEPING", action:,
          entity_type: "HousekeepingTask", entity_id: task.id,
          new_values: { room_id: room.id, status: room.status, task_type: task.task_type, task_status: task.status,
            service_date: task.service_date, assigned_staff_member_id: task.assigned_staff_member_id, completed_by_id: task.completed_by_id },
          request_id: Current.request_id, ip_address: Current.ip_address)
        task
      end
    end
  end
end
