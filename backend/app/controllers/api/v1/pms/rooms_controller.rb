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
          rooms = rooms.where(status: params[:status]) if params[:status].present? && params[:status] != "ALL"
          rooms = available_rooms(rooms, property) if params[:availableOnly] == "true"
          data = rooms.by_floor_and_room_number.map { |room| serialize(room) }

          render json: {
            success: true,
            data:,
            summary: {
              totalRooms: data.length,
              vacantClean: data.count { |room| room[:status] == "VACANT_CLEAN" },
              occupied: data.count { |room| room[:status] == "OCCUPIED" },
              vacantDirty: data.count { |room| room[:status] == "VACANT_DIRTY" },
              inspectionNeeded: data.count { |room| room[:status] == "INSPECTION_REQUIRED" },
              outOfOrder: data.count { |room| room[:status] == "OUT_OF_ORDER" }
            }
          }
        end

        def update
          property = default_property
          room = params[:id] == "lookup" ? property.rooms.find_by!(room_number: params.require(:roomNumber)) : property.rooms.find(params[:id])
          raise ApiError.new("This room is not managed through Hotel Setup", status: :not_found, code: "NOT_FOUND") unless room.setup_managed?
          ensure_manual_status!(params.require(:status))
          ensure_not_lifecycle_managed!(room)
          old_status = room.status
          room.update!(status: params.require(:status), maintenance_notes: params[:maintenanceNotes].presence)
          audit!("PMS_ROOMS", "UPDATE", "Room", room.id, old_values: { status: old_status }, new_values: { status: room.status })
          render json: { success: true, data: serialize(room) }
        end

        private

        def ensure_manual_status!(status)
          return if status.in?(MANUAL_STATUSES)

          raise ApiError.new("Occupied, Reserved, and Due Out are set only by the reservation and front-desk workflow", status: :unprocessable_content, code: "LIFECYCLE_MANAGED_STATUS")
        end

        def ensure_not_lifecycle_managed!(room)
          return unless room.reservation_rooms.joins(:reservation).where(reservations: { status: %w[INQUIRY CONFIRMED CHECKED_IN] }).exists?

          raise ApiError.new("This room is managed by an active reservation. Use reservation confirmation, check-in, checkout, or cancellation instead.", status: :conflict, code: "LIFECYCLE_MANAGED_ROOM")
        end

        def available_rooms(rooms, property)
          check_in = Date.iso8601(params.require(:checkInDate))
          check_out = Date.iso8601(params.require(:checkOutDate))
          raise ApiError.new("Check-out must be after check-in", code: "INVALID_STAY") unless check_out > check_in

          conflicting_ids = ReservationRoom
            .joins(:reservation)
            .where(reservations: { property_id: property.id, status: Reservation::INVENTORY_BLOCKING_STATUSES })
            .where("reservations.check_in_date < ? AND reservations.check_out_date > ?", check_out, check_in)
            .where.not(room_id: nil)
            .select(:room_id)

          rooms.where.not(id: conflicting_ids).where.not(status: %w[OUT_OF_ORDER OUT_OF_SERVICE])
        rescue Date::Error
          raise ApiError.new("Dates must be valid", status: :bad_request, code: "INVALID_REQUEST")
        end

        def serialize(room)
          active = room.reservation_rooms.find { |rr| rr.reservation.status.in?(Reservation::ACTIVE_STATUSES) }&.reservation
          {
            id: room.id,
            roomNumber: room.room_number,
            floor: room.floor,
            status: room.status,
            roomType: room.room_type.name,
            roomTypeCode: room.room_type.code,
            basePrice: room.room_type.base_price.to_f,
            amenities: room.room_type.amenities,
            viewType: "City View",
            activeGuest: active ? {
              id: active.guest.id,
              name: active.guest.full_name,
              phone: active.guest.phone,
              vipLevel: active.guest.vip_level,
              confirmationNumber: active.confirmation_number,
              folioNumber: active.folio&.folio_number
            } : nil
          }
        end
      end
    end
  end
end
