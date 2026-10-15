module Api
  module V1
    module Hotel
      class HotelSetupController < BackendController
        self.authorization_module_name = "ROOM_SETUP"

        def index
          property = default_property
          floors = property.floors.order(:number)
          room_types = property.room_types.setup_managed.includes(:rooms).order(:name)
          rooms = property.rooms.setup_managed.includes(:room_type).by_floor_and_room_number

          render json: {
            success: true,
            data: {
              floors: floors.map { |floor| serialize_floor(floor) },
              roomTypes: room_types.map { |room_type| serialize_room_type(room_type) },
              rooms: rooms.map { |room| serialize_room(room) }
            }
          }
        end

        private

        def serialize_floor(floor)
          floor.as_json(only: %i[id number name active])
        end

        def serialize_room_type(room_type)
          room_type.as_json(only: %i[id name code slug description image_url base_price bed_category bed_count max_adults max_children max_occupancy amenities active], methods: %i[bed_label bed_count_label])
        end

        def serialize_room(room)
          {
            id: room.id,
            roomNumber: room.room_number,
            floor: room.floor,
            status: room.status,
            active: room.active,
            smoking: room.smoking,
            accessible: room.accessible,
            roomType: { id: room.room_type_id, code: room.room_type.code, name: room.room_type.name }
          }.merge(room.bed_details)
        end
      end
    end
  end
end
