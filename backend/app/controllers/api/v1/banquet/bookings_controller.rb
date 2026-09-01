module Api
  module V1
    module Banquet
      class BookingsController < BackendController
        def index
          property = default_property
          bookings = property.banquet_bookings.includes(:banquet_hall, :guest).order(:start_date_time)
          render json: { success: true, halls: property.banquet_halls.where(active: true).order(theater_capacity: :desc).as_json, bookings: bookings.map { |booking| serialize(booking) } }
        end

        def create
          property = default_property
          hall = property.banquet_halls.find_by!(code: params[:hallCode].presence || "NILKANTHA-01")
          first, last = split_name(params[:guestName].presence || "Valued Client")
          guest = property.company.guests.find_or_create_by!(phone: params[:phone].presence || "+977-9800000000") { |g| g.first_name = first; g.last_name = last; g.email = params[:email] }
          rent = BigDecimal(params[:hallRent].presence || hall.base_rent.to_s)
          catering = BigDecimal(params[:cateringTotal].presence || "0")
          booking = property.banquet_bookings.create!(
            banquet_hall: hall,
            guest:,
            booking_ref: DocumentNumbers::NextNumber.call(company: property.company, property:, document_type: "BANQUET"),
            event_name: params[:eventName].presence || "#{hall.name} Event",
            event_type: params[:eventType].presence || "CONFERENCE",
            start_date_time: params[:startDate].presence || Time.current,
            end_date_time: params[:endDate].presence || params[:startDate].presence || Time.current,
            nepali_date: Date.current.iso8601,
            pax_count: params[:expectedPax].presence || 100,
            hall_layout: params[:setupLayout],
            hall_charge: rent,
            catering_charge: catering,
            grand_total: rent + catering,
            advance_paid: params[:advancePaid].presence || 0,
            notes: params[:specialRequests],
            status: "CONFIRMED"
          )
          audit!("BANQUET", "CREATE", "BanquetBooking", booking.id, new_values: { booking_ref: booking.booking_ref })
          render json: { success: true, message: "Banquet event booked successfully!", data: booking.as_json }
        end

        private

        def serialize(booking)
          {
            id: booking.id,
            bookingNumber: booking.booking_ref,
            eventName: booking.event_name,
            eventType: booking.event_type,
            hallId: booking.banquet_hall_id,
            hallName: booking.banquet_hall.name,
            hallCode: booking.banquet_hall.code,
            guestName: booking.guest.full_name,
            phone: booking.guest.phone,
            startDate: booking.start_date_time.to_date.iso8601,
            endDate: booking.end_date_time.to_date.iso8601,
            nepaliDate: booking.nepali_date,
            expectedPax: booking.pax_count,
            setupLayout: booking.hall_layout,
            hallRent: booking.hall_charge.to_f,
            cateringTotal: booking.catering_charge.to_f,
            grandTotal: booking.grand_total.to_f,
            advancePaid: booking.advance_paid.to_f,
            balanceDue: (booking.grand_total - booking.advance_paid).to_f,
            status: booking.status
          }
        end
      end
    end
  end
end
