module Banquet
  class SaveBooking
    include Support
    FIELDS = %w[eventName eventType hallCode guestName phone email startDate endDate expectedPax hallRent cateringTotal setupLayout specialRequests advancePaid].freeze
    def self.call(property:, params:, booking: nil)
      new.call(property, params, booking)
    end

    def call(property, params, booking)
      BusinessDays::Context.with(property) do
        key = retry_key(params) unless booking
        request_digest = digest(params, FIELDS)
        if !booking && (existing = property.banquet_bookings.find_by(creation_key: key))
          invalid!("This identifier was used for a different booking", code: "RETRY_CONFLICT", status: :conflict) unless existing.creation_digest == request_digest
          return existing
        end
        if booking
          booking.lock!
          invalid!("Only confirmed events can be edited", status: :conflict) unless booking.status == "CONFIRMED"
          invalid!("Event changed. Refresh before editing.", code: "STALE_EVENT", status: :conflict) unless Integer(params[:version].to_s, exception: false) == booking.lock_version
        end
        invalid!("Use Record payment to receive an advance") unless money(params[:advancePaid] || 0).zero?
        hall = property.banquet_halls.where(active: true).find_by!(code: params.require(:hallCode))
        date = Date.iso8601(params.require(:startDate).to_s)
        invalid!("Event date cannot be in the past") if date < property.operating_date && (!booking || booking.start_date_time.to_date != date)
        invalid!("Use a single event date") if params[:endDate].present? && Date.iso8601(params[:endDate].to_s) != date
        starts, ends = date.in_time_zone, (date + 1).in_time_zone
        pax = Integer(params.require(:expectedPax).to_s, exception: false)
        invalid!("Enter a guest count within the hall capacity") unless pax && pax.between?(1, hall.theater_capacity)
        rent, catering = money(params.require(:hallRent)), money(params.require(:cateringTotal))
        if booking && booking.hall_charge == rent && booking.catering_charge == catering
          quote = { hall_net: booking.hall_net, catering_net: booking.catering_net, tax_amount: booking.tax_amount, grand_total: booking.grand_total, tax_snapshot: booking.tax_snapshot }
        else
          quote = Quote.call(hall: rent, catering:, tax: Quote.tax(property.company, property.operating_date))
        end
        money(quote[:grand_total])
        invalid!("Refund the excess payment before reducing the total") if booking && quote[:grand_total] < booking.advance_paid
        hall.lock!
        conflicts = hall.banquet_bookings.where.not(status: "CANCELLED")
        conflicts = conflicts.where.not(id: booking.id) if booking
        if conflicts.where("start_date_time < ? AND (end_date_time > ? OR (end_date_time = start_date_time AND end_date_time >= ?))", ends, starts, starts).exists?
          invalid!("This hall is already booked on this date", code: "HALL_UNAVAILABLE", status: :conflict)
        end
        names = params.require(:guestName).to_s.strip.split
        invalid!("Enter the organizer name") if names.empty?
        phone = params.require(:phone).to_s.strip
        guest = property.company.guests.find_or_initialize_by(normalized_phone: phone.gsub(/\D/, ""))
        if guest.new_record?
          guest.assign_attributes(first_name: names.first, last_name: names.drop(1).join(" ").presence || "Guest", phone:, email: params[:email])
          guest.save!
        elsif guest.full_name != names.join(" ")
          invalid!("This phone belongs to #{guest.full_name}. Update the guest name in Guest CRM or use the correct phone.")
        end
        booking ||= property.banquet_bookings.new(creation_key: key, creation_digest: request_digest,
          booking_ref: DocumentNumbers::NextNumber.call(company: property.company, property:, document_type: "BANQUET"))
        action = booking.new_record? ? "CREATE" : "UPDATE"
        booking.assign_attributes(quote.merge(banquet_hall: hall, guest:, event_name: params.require(:eventName).to_s.strip,
          event_type: params[:eventType].presence || "CONFERENCE", start_date_time: starts, end_date_time: ends,
          nepali_date: Calendars::BikramSambat.iso(date), pax_count: pax, hall_layout: params[:setupLayout],
          hall_charge: rent, catering_charge: catering, notes: params[:specialRequests]))
        booking.save!
        audit(booking, action, { reference: booking.booking_ref, total: booking.grand_total.to_s, version: booking.lock_version })
        booking
      end
    rescue ArgumentError
      invalid!("Enter a valid event date")
    end
  end
end
