module Api
  module V1
    module Hotel
      class RoomsController < BackendController
        self.authorization_module_name = "ROOMS"

        def index
          rooms = default_property.rooms.includes(:room_type).order(:floor, :room_number)
          render json: { success: true, data: rooms.map { |room| serialize(room) } }
        end

        def show
          room = default_property.rooms.includes(:room_type).find(params[:id])
          render json: { success: true, data: serialize(room) }
        end

        def create
          room = default_property.rooms.create!(room_params)
          audit!("ROOMS", "CREATE", "Room", room.id, new_values: room.attributes.slice("room_number", "floor", "room_type_id"))
          render json: { success: true, data: serialize(room) }, status: :created
        end

        def update
          room = default_property.rooms.find(params[:id])
          old_values = room.attributes.slice("room_number", "floor", "room_type_id", "status", "active", "smoking", "accessible")
          room.update!(room_params)
          audit!("ROOMS", "UPDATE", "Room", room.id, old_values:, new_values: room.attributes.slice("room_number", "floor", "room_type_id", "status", "active", "smoking", "accessible"))
          render json: { success: true, data: serialize(room) }
        end

        def destroy
          room = default_property.rooms.find(params[:id])
          audit!("ROOMS", "DELETE", "Room", room.id, old_values: room.attributes.slice("room_number", "floor", "room_type_id"))
          room.destroy!
          render json: { success: true }
        end

        private

        def serialize(room)
          {
            id: room.id,
            roomNumber: room.room_number,
            floor: room.floor,
            status: room.status,
            active: room.active,
            smoking: room.smoking,
            accessible: room.accessible,
            roomType: { id: room.room_type_id, code: room.room_type.code, name: room.room_type.name }
          }
        end

        def room_params
          params.require(:room).permit(:room_number, :floor, :room_type_id, :status, :active, :smoking, :accessible)
        end
      end
    end
  end
end
