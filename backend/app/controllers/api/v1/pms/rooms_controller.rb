module Api
  module V1
    module Pms
      class RoomsController < BackendController
        self.authorization_module_name = "ROOMS"

        MANUAL_STATUSES = %w[VACANT_CLEAN VACANT_DIRTY INSPECTION_REQUIRED OUT_OF_ORDER OUT_OF_SERVICE].freeze

        def index
          property = default_property
          rooms = property.rooms.active.setup_managed.includes(:room_type, reservation_rooms: { reservation: %i[guest folio] })
          rooms = rooms.where(floor: params[:floor]) if params[:floor].present? && params[:floor] != "ALL"
          rooms = available_rooms(rooms, property) if params[:availableOnly] == "true"
          data = rooms.by_floor_and_room_number.map { |room| serialize(room) }
          data = data.select { |room| room[:status] == params[:status] } if params[:status].present? && params[:status] != "ALL"

          render json: {
            success: true,
            data:,
            summary: {
              totalRooms: data.length,
              vacantClean: data.count { |room| room[:status] == "VACANT_CLEAN" },
              occupied: data.count { |room| room[:status] == "OCCUPIED" },
              vacantDirty: data.count { |room| room[:status] == "VACANT_DIRTY" },
              inspectionNeeded: data.count { |room| room[:status] == "INSPECTION_REQUIRED" },
              outOfOrder: data.count { |room| room[:status] == "OUT_OF_ORDER" },
              outOfService: data.count { |room| room[:status] == "OUT_OF_SERVICE" },
              reserved: data.count { |room| room[:status] == "RESERVED" },
              dueOut: data.count { |room| room[:status] == "DUE_OUT" }
            }
          }
        end

        def update
          property = default_property
          room = params[:id] == "lookup" ? property.rooms.find_by!(room_number: params.require(:roomNumber)) : property.rooms.find(params[:id])
          raise ApiError.new("This room is not managed through Hotel Setup", status: :not_found, code: "NOT_FOUND") unless room.setup_managed?
          ensure_manual_status!(params.require(:status))
          room.with_lock do
            ensure_not_lifecycle_managed!(room)
            old_status = room.status
            room.update!(status: params.require(:status), maintenance_notes: params[:maintenanceNotes].presence)
            audit!("PMS_ROOMS", "UPDATE", "Room", room.id, old_values: { status: old_status }, new_values: { status: room.status })
          end
          render json: { success: true, data: serialize(room) }
        end

        private

        def ensure_manual_status!(status)
          return if status.in?(MANUAL_STATUSES)

          raise ApiError.new("Occupied, Reserved, and Due Out are set only by the reservation and front-desk workflow", status: :unprocessable_content, code: "LIFECYCLE_MANAGED_STATUS")
        end

        def ensure_not_lifecycle_managed!(room)
          stays = room.reservation_rooms.joins(:reservation)
          occupied = room.status.in?(%w[OCCUPIED DUE_OUT]) || stays.where(reservations: { status: "CHECKED_IN" }).exists?
          blocking_booking = params[:status].in?(%w[OUT_OF_ORDER OUT_OF_SERVICE]) && stays.where(reservations: { status: %w[INQUIRY CONFIRMED] }).exists?
          return unless occupied || blocking_booking

          raise ApiError.new("This room is managed by an active reservation. Use reservation confirmation, check-in, checkout, or cancellation instead.", status: :conflict, code: "LIFECYCLE_MANAGED_ROOM")
        end

        def available_rooms(rooms, property)
          check_in = Date.iso8601(params.require(:checkInDate))
          check_out = Date.iso8601(params.require(:checkOutDate))
          raise ApiError.new("Check-out must be after check-in", code: "INVALID_STAY") unless check_out > check_in

          available_ids = property.room_types.where(id: rooms.select(:room_type_id)).flat_map do |room_type|
            Availability::RoomInventory.available_rooms(property:, room_type:, check_in_date: check_in, check_out_date: check_out).pluck(:id)
          end
          rooms.where(id: available_ids)
        rescue Date::Error
          raise ApiError.new("Dates must be valid", status: :bad_request, code: "INVALID_REQUEST")
        end

        def serialize(room)
          reservations = room.active_reservations
          active = reservations.find { |reservation| reservation.status == "CHECKED_IN" } || reservations.min_by(&:check_in_date)
          {
            id: room.id,
            roomNumber: room.room_number,
            floor: room.floor,
            status: room.operational_status,
            hasActiveReservation: reservations.any?,
            roomType: room.room_type.name,
            roomTypeCode: room.room_type.code,
            basePrice: room.room_type.base_price.to_f,
            amenities: room.room_type.amenities,
            activeGuest: active ? {
              id: active.guest.id,
              name: active.guest.full_name,
              phone: active.guest.phone,
              vipLevel: active.guest.vip_level,
              confirmationNumber: active.confirmation_number,
              folioNumber: active.folio&.folio_number
            } : nil
          }.merge(room.bed_details)
        end
      end
    end
  end
end
