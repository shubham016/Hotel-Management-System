module Api
  module V1
    module Hotel
      class RoomsController < BackendController
        self.authorization_module_name = "ROOM_SETUP"

        def index
          rooms = default_property.rooms.setup_managed.includes(:room_type).by_floor_and_room_number
          render json: { success: true, data: rooms.map { |room| serialize(room) } }
        end

        def show
          room = default_property.rooms.setup_managed.includes(:room_type).find(params[:id])
          render json: { success: true, data: serialize(room) }
        end

        def create
          ensure_setup_room_type!
          room = default_property.rooms.create!(room_params.merge(setup_managed: true))
          audit!("ROOMS", "CREATE", "Room", room.id, new_values: room.attributes.slice("room_number", "floor", "room_type_id"))
          render json: { success: true, data: serialize(room) }, status: :created
        end

        def bulk_create
          attributes = bulk_room_params
          quantity = Integer(attributes.delete(:quantity))
          start_number = Integer(attributes.delete(:start_room_number))
          raise ApiError.new("Quantity must be between 1 and 100", status: :unprocessable_content, code: "INVALID_QUANTITY") unless quantity.between?(1, 100)
          raise ApiError.new("Starting room number must be positive", status: :unprocessable_content, code: "INVALID_ROOM_NUMBER") unless start_number.positive?

          ensure_setup_room_type!(attributes[:room_type_id])
          room_numbers = (start_number...(start_number + quantity)).map(&:to_s)
          duplicates = default_property.rooms.where(room_number: room_numbers).pluck(:room_number)
          if duplicates.any?
            raise ApiError.new("Room number already exists: #{duplicates.join(', ')}", status: :unprocessable_content, code: "DUPLICATE_ROOM_NUMBER")
          end

          rooms = Room.transaction do
            room_numbers.map do |room_number|
              default_property.rooms.create!(attributes.merge(room_number:, status: "VACANT_CLEAN", setup_managed: true))
            end
          end

          audit!("ROOM_SETUP", "CREATE_BULK", "RoomBatch", rooms.first.id, new_values: { room_numbers:, floor: attributes[:floor], room_type_id: attributes[:room_type_id] })
          render json: { success: true, data: rooms.map { |room| serialize(room) }, count: rooms.length }, status: :created
        rescue ArgumentError, TypeError
          raise ApiError.new("Starting room number and quantity must be whole numbers", status: :unprocessable_content, code: "INVALID_ROOM_NUMBER")
        end

        def update
          room = default_property.rooms.setup_managed.find(params[:id])
          ensure_setup_room_type! if room_params[:room_type_id].present?
          old_values = room.attributes.slice("room_number", "floor", "room_type_id", "status", "active", "smoking", "accessible")
          room.update!(room_params)
          audit!("ROOMS", "UPDATE", "Room", room.id, old_values:, new_values: room.attributes.slice("room_number", "floor", "room_type_id", "status", "active", "smoking", "accessible"))
          render json: { success: true, data: serialize(room) }
        end

        def destroy
          room = default_property.rooms.setup_managed.find(params[:id])
          audit!("ROOMS", "DELETE", "Room", room.id, old_values: room.attributes.slice("room_number", "floor", "room_type_id"))
          room.destroy!
          render json: { success: true }
        end

        def destroy_floor
          floor = Integer(params.require(:floor))
          rooms = default_property.rooms.setup_managed.where(floor:).order(:room_number)
          raise ApiError.new("No setup-managed rooms found on this floor", status: :not_found, code: "NOT_FOUND") unless rooms.exists?

          room_numbers = rooms.pluck(:room_number)
          Room.transaction { rooms.each(&:destroy!) }
          audit!("ROOM_SETUP", "DELETE_BULK", "RoomFloor", floor.to_s, old_values: { room_numbers:, floor: })
          render json: { success: true, count: room_numbers.length }
        rescue ArgumentError, TypeError
          raise ApiError.new("Floor must be a whole number", status: :unprocessable_content, code: "INVALID_FLOOR")
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

        def bulk_room_params
          params.require(:rooms).permit(:start_room_number, :quantity, :floor, :room_type_id, :active, :smoking, :accessible)
        end

        def ensure_setup_room_type!(room_type_id = room_params[:room_type_id])
          default_property.room_types.setup_managed.find(room_type_id)
        end

        def authorize_request!
          return authorize!("ROOM_SETUP", "create") if action_name == "bulk_create"
          return authorize!("ROOM_SETUP", "delete") if action_name == "destroy_floor"

          super
        end
      end
    end
  end
end
