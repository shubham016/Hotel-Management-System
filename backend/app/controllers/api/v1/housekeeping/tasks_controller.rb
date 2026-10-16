module Api
  module V1
    module Housekeeping
      class TasksController < BackendController
        def index
          property = default_property
          rooms = property.rooms.active.setup_managed.includes(:room_type, housekeeping_tasks: :completed_by, reservation_rooms: :reservation).order(:floor, :room_number)
          dirty = rooms.select { |room| room.status.in?(%w[VACANT_DIRTY INSPECTION_REQUIRED]) }
          render json: {
            success: true,
            rooms: rooms.map { |room| serialize(room, property) },
            dirtyCount: dirty.length,
            canAssign: can_assign?,
            staff: can_assign? ? property.staff_members.where(active: true).order(:position, :name).map { |staff| { id: staff.id, name: staff.name } } : []
          }
        end

        def create
          room = default_property.rooms.active.setup_managed.find(params.require(:roomId))
          # Rails reserves params[:action] for the controller action ("create").
          housekeeping_action = request.request_parameters["action"]
          authorize!("TASKS", "assign") if housekeeping_action == "ASSIGN"
          ::Housekeeping::UpdateTask.call(room:, action: housekeeping_action, user: Current.user, staff_member_id: params[:staffMemberId])
          room.reload
          render json: { success: true, data: serialize(room, room.property), message: housekeeping_action == "ASSIGN" ? "Assignment saved." : "Housekeeping updated." }
        end

        private

        def can_assign?
          Current.user.role.name == "SUPER_ADMIN" || Current.user.role.allows?("TASKS", "assign")
        end

        def serialize(room, property)
          occupied = room.active_reservations.any? { |reservation| reservation.status == "CHECKED_IN" }
          tasks = room.housekeeping_tasks.to_a
          task = if occupied
            tasks.find { |entry| entry.task_type == "STAYOVER" && entry.service_date == property.operating_date }
          else
            tasks.select { |entry| entry.task_type != "STAYOVER" }.max_by { |entry| [entry.status == "PENDING" ? 1 : 0, entry.created_at] }
          end
          { id: room.id, roomNumber: room.room_number, floor: room.floor, status: room.operational_status,
            roomType: room.room_type.name, stayoverEligible: occupied,
            latestTask: task&.as_json&.merge("completed_by_name" => task.completed_by&.full_name) }
        end
      end
    end
  end
end
