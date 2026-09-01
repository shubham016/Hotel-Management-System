module Api
  module V1
    module Hotel
      class RoomsController < BaseController
        def index
          rooms = require_property!.rooms.includes(:room_type).order(:room_number)
          render json: { success: true, data: rooms.map { |room| serialize(room) } }
        end

        def show
          room = require_property!.rooms.includes(:room_type).find(params[:id])
          render json: { success: true, data: serialize(room) }
        end

        def update
          authorize!("ROOMS", "update")
          room = require_property!.rooms.find(params[:id])
          previous_status = room.status
          room.update!(params.require(:room).permit(:status))
          AuditLog.create!(
            company: Current.company,
            property: room.property,
            user: Current.user,
            module_name: "ROOMS",
            action: "UPDATE",
            entity_type: "Room",
            entity_id: room.id,
            old_values: { status: previous_status },
            new_values: { status: room.status },
            request_id: Current.request_id,
            ip_address: Current.ip_address
          )
          render json: { success: true, data: serialize(room) }
        end

        private

        def serialize(room)
          {
            id: room.id,
            roomNumber: room.room_number,
            floor: room.floor,
            status: room.status,
            roomType: { id: room.room_type_id, code: room.room_type.code, name: room.room_type.name }
          }
        end
      end
    end
  end
end
