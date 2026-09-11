module Api
  module V1
    module Pms
      class RoomsController < BackendController
        def index
          property = default_property
          rooms = property.rooms.active.includes(:room_type, reservation_rooms: { reservation: %i[guest folio] })
          rooms = rooms.where(floor: params[:floor]) if params[:floor].present? && params[:floor] != "ALL"
          rooms = rooms.where(status: params[:status]) if params[:status].present? && params[:status] != "ALL"
          rooms = available_rooms(rooms, property) if params[:availableOnly] == "true"
          data = rooms.order(:floor, :room_number).map { |room| serialize(room) }

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
          old_status = room.status
          room.update!(status: params.require(:status), maintenance_notes: params[:maintenanceNotes].presence)
          audit!("PMS_ROOMS", "UPDATE", "Room", room.id, old_values: { status: old_status }, new_values: { status: room.status })
          render json: { success: true, data: serialize(room) }
        end

        private

        def available_rooms(rooms, property)
          check_in = Date.iso8601(params.require(:checkInDate))
          check_out = Date.iso8601(params.require(:checkOutDate))
          raise ApiError.new("Check-out must be after check-in", code: "INVALID_STAY") unless check_out > check_in

          conflicting_ids = ReservationRoom
            .joins(:reservation)
            .where(reservations: { property_id: property.id, status: Reservation::ACTIVE_STATUSES })
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
