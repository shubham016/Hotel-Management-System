module Reservations
  class Create
    Result = Data.define(:reservation, :folio, :quote)

    def self.call(params:, request_context: {})
      new(params:, request_context:).call
    end

    def initialize(params:, request_context:)
      @params = params.to_h.with_indifferent_access
      @request_context = request_context
    end

    def call
      load_context!
      validate_request!

      Reservation.transaction do
        lock_inventory!
        ensure_availability!
        guest = find_or_create_guest!
        quote = build_quote
        reservation = create_reservation!(guest, quote)
        folio = create_folio!(reservation, guest, quote)
        create_audit_log!(reservation, quote)

        Result.new(reservation:, folio:, quote:)
      end
    end

    private

    def load_context!
      @property = Property.find_by!(code: @params[:propertyCode].to_s.upcase, active: true)
      @check_in_date = Date.iso8601(@params[:checkInDate].to_s)
      @check_out_date = Date.iso8601(@params[:checkOutDate].to_s)
      @room_type = @property.room_types.find_by!(code: @params[:roomTypeCode].to_s.upcase, active: true)
      @rate_plan = if @params[:ratePlanCode].present?
        @property.rate_plans.find_by!(code: @params[:ratePlanCode].to_s.upcase, room_type: @room_type, active: true)
      else
        @property.rate_plans.find_by(room_type: @room_type, active: true)
      end
      @rooms_count = Integer(@params[:roomsCount].presence || 1)
      @adults_count = Integer(@params[:adultsCount].presence || 1)
      @children_count = Integer(@params[:childrenCount].presence || 0)
    rescue Date::Error, ArgumentError
      raise ApiError.new("Dates and guest counts must be valid", status: :bad_request, code: "INVALID_REQUEST")
    end

    def validate_request!
      required = %i[propertyCode checkInDate checkOutDate roomTypeCode firstName lastName phone]
      missing = required.select { |key| @params[key].blank? }
      raise ApiError.new("Missing required fields", status: :bad_request, code: "MISSING_FIELDS", details: missing) if missing.any?
      raise ApiError.new("Check-out must be after check-in", code: "INVALID_STAY") unless @check_out_date > @check_in_date
      raise ApiError.new("Check-in cannot be in the past", code: "INVALID_STAY") if @check_in_date < Date.current
      raise ApiError.new("At least one room is required", code: "INVALID_OCCUPANCY") unless @rooms_count.positive?
      raise ApiError.new("Guest count exceeds room capacity", code: "INVALID_OCCUPANCY") if @adults_count > @room_type.max_adults * @rooms_count
      raise ApiError.new("Child count exceeds room capacity", code: "INVALID_OCCUPANCY") if @children_count > @room_type.max_children * @rooms_count
    end

    def lock_inventory!
      lock_key = "reservation:#{@property.id}:#{@room_type.id}"
      quoted_key = ActiveRecord::Base.connection.quote(lock_key)
      ActiveRecord::Base.connection.execute("SELECT pg_advisory_xact_lock(hashtext(#{quoted_key}))")
    end

    def ensure_availability!
      available = Availability::RoomInventory.available_count(
        property: @property,
        room_type: @room_type,
        check_in_date: @check_in_date,
        check_out_date: @check_out_date
      )
      return if available >= @rooms_count

      raise ApiError.new("The requested room type is no longer available", status: :conflict, code: "ROOM_UNAVAILABLE")
    end

    def find_or_create_guest!
      normalized_phone = @params[:phone].to_s.gsub(/\D/, "")
      scope = @property.company.guests.where(normalized_phone:)
      scope = scope.or(@property.company.guests.where("lower(email) = ?", @params[:email].to_s.downcase)) if @params[:email].present?
      guest = scope.first_or_initialize
      guest.assign_attributes(
        first_name: @params[:firstName],
        last_name: @params[:lastName],
        phone: @params[:phone],
        email: @params[:email].presence,
        id_type: @params[:idType].presence,
        id_number: @params[:idNumber].presence
      )
      guest.save!
      guest
    end

    def add_on_codes
      raw = @params[:addOns] || @params[:addons] || []
      return raw.select { |_code, enabled| ActiveModel::Type::Boolean.new.cast(enabled) }.keys if raw.respond_to?(:keys)

      Array(raw)
    end

    def build_quote
      Pricing::RoomQuote.call(
        property: @property,
        room_type: @room_type,
        rate_plan: @rate_plan,
        check_in_date: @check_in_date,
        check_out_date: @check_out_date,
        rooms_count: @rooms_count,
        adults_count: @adults_count,
        add_on_codes:
      )
    end

    def create_reservation!(guest, quote)
      confirmation_number = DocumentNumbers::NextNumber.call(
        company: @property.company,
        property: @property,
        document_type: "RESERVATION",
        date: @check_in_date
      )
      reservation = @property.reservations.create!(
        guest:,
        rate_plan: @rate_plan,
        confirmation_number:,
        source: @params[:source].presence || "DIRECT_WEB",
        status: "CONFIRMED",
        check_in_date: @check_in_date,
        check_out_date: @check_out_date,
        adults_count: @adults_count,
        children_count: @children_count,
        special_requests: @params[:specialRequests].presence,
        room_total: quote.room_total,
        service_total: quote.add_on_total,
        tax_total: quote.service_charge + quote.vat_amount,
        grand_total: quote.grand_total,
        advance_paid: 0
      )

      @rooms_count.times do
        reservation.reservation_rooms.create!(room_type: @room_type, nightly_rate: quote.nightly_rate, nights: quote.nights)
      end
      reservation
    end

    def create_folio!(reservation, guest, quote)
      folio_number = DocumentNumbers::NextNumber.call(
        company: @property.company,
        property: @property,
        document_type: "FOLIO",
        date: @check_in_date
      )
      folio = Folio.create!(
        property: @property,
        reservation:,
        guest:,
        folio_number:,
        status: "OPEN",
        sub_total: quote.sub_total,
        service_charge: quote.service_charge,
        tax_amount: quote.vat_amount,
        grand_total: quote.grand_total,
        total_paid: 0,
        balance_due: quote.grand_total
      )
      folio.folio_items.create!(
        source_module: "ROOM",
        source_reference: reservation.id,
        description: "#{@room_type.name} - #{quote.nights} night(s)",
        quantity: @rooms_count,
        unit_price: quote.nightly_rate * quote.nights,
        sub_total: quote.room_total,
        tax_amount: quote.service_charge + quote.vat_amount,
        total_amount: quote.grand_total,
        calculation_snapshot: { taxes: quote.tax_lines }
      )
      quote.add_on_lines.each do |line|
        folio.folio_items.create!(
          source_module: "SERVICE",
          source_reference: line[:id],
          description: line[:name],
          quantity: line[:quantity],
          unit_price: line[:unit_price],
          sub_total: line[:total],
          total_amount: line[:total]
        )
      end
      folio
    end

    def create_audit_log!(reservation, quote)
      AuditLog.create!(
        company: @property.company,
        property: @property,
        user: Current.user,
        module_name: "RESERVATIONS",
        action: "CREATE",
        entity_type: "Reservation",
        entity_id: reservation.id,
        new_values: {
          confirmation_number: reservation.confirmation_number,
          source: reservation.source,
          grand_total: quote.grand_total.to_s
        },
        request_id: @request_context[:request_id],
        ip_address: @request_context[:ip_address]
      )
    end
  end
end
