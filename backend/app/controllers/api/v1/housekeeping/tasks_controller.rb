module Api
  module V1
    module Housekeeping
      class TasksController < BackendController
        def index
          rooms = default_property.rooms.includes(:room_type, :housekeeping_tasks).order(:floor, :room_number)
          dirty = rooms.select { |room| room.status.in?(%w[VACANT_DIRTY INSPECTION_REQUIRED OUT_OF_ORDER]) }
          render json: {
            success: true,
            rooms: rooms.map { |room| { id: room.id, roomNumber: room.room_number, floor: room.floor, status: room.status, roomType: room.room_type.name, latestTask: room.housekeeping_tasks.max_by(&:created_at)&.as_json } },
            dirtyCount: dirty.length
          }
        end

        def create
          room = default_property.rooms.find(params.require(:roomId))
          raise ApiError.new("Invalid housekeeping action", status: :bad_request, code: "INVALID_ACTION") unless params.require(:action) == "MARK_CLEAN"

          room.housekeeping_tasks.create!(task_type: "CLEANING", status: "COMPLETED", assigned_to: params[:housekeeperName].presence || "Sita Thapa", completed_at: Time.current)
          room.update!(status: "VACANT_CLEAN")
          audit!("HOUSEKEEPING", "UPDATE", "Room", room.id, new_values: { status: room.status })
          render json: { success: true, message: "Room ##{room.room_number} marked clean and available!" }
        end
      end
    end
  end
end
