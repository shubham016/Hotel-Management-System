module Api
  module V1
    module Housekeeping
      class TasksController < BackendController
        def index
          rooms = default_property.rooms.active.setup_managed.includes(:room_type, :housekeeping_tasks, reservation_rooms: :reservation).order(:floor, :room_number)
          dirty = rooms.select { |room| room.status.in?(%w[VACANT_DIRTY INSPECTION_REQUIRED]) }
          render json: {
            success: true,
            rooms: rooms.map { |room| { id: room.id, roomNumber: room.room_number, floor: room.floor, status: room.operational_status, roomType: room.room_type.name, latestTask: room.housekeeping_tasks.max_by(&:created_at)&.as_json } },
            dirtyCount: dirty.length
          }
        end

        def create
          room = default_property.rooms.active.setup_managed.find(params.require(:roomId))
          # Rails reserves params[:action] for the controller action ("create").
          housekeeping_action = request.request_parameters["action"]
          raise ApiError.new("Invalid housekeeping action", status: :bad_request, code: "INVALID_ACTION") unless housekeeping_action.in?(%w[MARK_CLEAN MARK_FOR_INSPECTION MARK_INSPECTED])

          Room.transaction do
            room.lock!
            if room.status.in?(%w[OCCUPIED DUE_OUT]) || room.reservation_rooms.joins(:reservation).where(reservations: { status: "CHECKED_IN" }).exists?
              raise ApiError.new("Check the guest out before marking this room clean", status: :conflict, code: "ROOM_OCCUPIED")
            end
            unless room.status.in?(%w[VACANT_DIRTY INSPECTION_REQUIRED])
              raise ApiError.new("Only rooms awaiting cleaning or inspection can be updated here", status: :conflict, code: "ROOM_NOT_IN_QUEUE")
            end
            if housekeeping_action == "MARK_INSPECTED" && room.status != "INSPECTION_REQUIRED"
              raise ApiError.new("Clean the room before completing its inspection", status: :conflict, code: "INSPECTION_NOT_READY")
            end
            if housekeeping_action == "MARK_FOR_INSPECTION" && room.status != "VACANT_DIRTY"
              raise ApiError.new("This room is already awaiting inspection", status: :conflict, code: "INSPECTION_ALREADY_PENDING")
            end
            task_type = room.status == "INSPECTION_REQUIRED" ? "INSPECTION" : "CLEANING"
            task = room.housekeeping_tasks.find_or_initialize_by(task_type:, status: "PENDING")
            task.update!(status: "COMPLETED", assigned_to: Current.user.full_name, completed_at: Time.current)
            room.update!(status: housekeeping_action == "MARK_FOR_INSPECTION" ? "INSPECTION_REQUIRED" : "VACANT_CLEAN")
            audit!("HOUSEKEEPING", "UPDATE", "Room", room.id, new_values: { status: room.status })
          end
          render json: { success: true, message: "Room ##{room.room_number} #{room.status == 'INSPECTION_REQUIRED' ? 'cleaned and awaiting inspection' : 'clean and ready for check-in'}." }
        end
      end
    end
  end
end
