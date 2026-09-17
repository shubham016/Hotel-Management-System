module Api
  module V1
    module Hotel
      class AvailabilityController < BaseController
        skip_before_action :authenticate!
        skip_before_action :authorize_request!

        def index
          property = Property.find_by!(code: params.require(:propertyCode).to_s.upcase, active: true)
          check_in_date = Date.iso8601(params.require(:checkInDate))
          check_out_date = Date.iso8601(params.require(:checkOutDate))
          raise ApiError.new("Check-out must be after check-in", code: "INVALID_STAY") unless check_out_date > check_in_date

          rooms_count = Integer(params[:roomsCount].presence || 1)
          adults_count = Integer(params[:adultsCount].presence || 1)
          children_count = Integer(params[:childrenCount].presence || 0)
          add_on_codes = params[:addOnCodes].to_s.split(",").map(&:strip).reject(&:blank?)
          room_types = property.room_types.setup_managed.where(active: true).includes(:rate_plans)
          room_types = room_types.where(code: params[:roomTypeCode].to_s.upcase) if params[:roomTypeCode].present?

          results = room_types.filter_map do |room_type|
            next if adults_count > room_type.max_adults * rooms_count
            next if children_count > room_type.max_children * rooms_count

            available = Availability::RoomInventory.available_count(property:, room_type:, check_in_date:, check_out_date:)
            next if available < rooms_count

            rate_plan = room_type.rate_plans.find(&:active?)
            quote = Pricing::RoomQuote.call(
              property:,
              room_type:,
              rate_plan:,
              check_in_date:,
              check_out_date:,
              rooms_count:,
              adults_count:,
              children_count:,
              add_on_codes:
            )
            physical_rooms = Availability::RoomInventory.available_rooms(property:, room_type:, check_in_date:, check_out_date:)
            {
              roomType: room_type.as_json(only: %i[id name code slug description base_price bed_category amenities bed_count max_adults max_children max_occupancy]),
              availableRooms: available,
              rooms: physical_rooms.map { |room| serialize_room(room, room_type) },
              quote: quote_payload(quote)
            }
          end

          render json: { success: true, data: results }
        rescue Date::Error, ArgumentError
          raise ApiError.new("Dates and guest counts must be valid", status: :bad_request, code: "INVALID_REQUEST")
        end

        private

        def serialize_room(room, room_type)
          {
            id: room.id,
            roomNumber: room.room_number,
            floor: room.floor,
            status: room.status,
            roomType: room_type.name,
            roomTypeCode: room_type.code
          }
        end

        def quote_payload(quote)
          {
            nights: quote.nights,
            nightlyRate: quote.nightly_rate.to_f,
            roomTotal: quote.room_total.to_f,
            addOnTotal: quote.add_on_total.to_f,
            subTotal: quote.sub_total.to_f,
            serviceCharge: quote.service_charge.to_f,
            vatAmount: quote.vat_amount.to_f,
            grandTotal: quote.grand_total.to_f
          }
        end
      end
    end
  end
end
