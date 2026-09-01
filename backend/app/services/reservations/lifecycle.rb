module Reservations
  class Lifecycle
    ROOM_READY_STATUSES = %w[VACANT_CLEAN RESERVED].freeze

    def self.modify(reservation:, params:)
      new(reservation:, params:).modify
    end

    def self.cancel(reservation:, params:)
      new(reservation:, params:).cancel
    end

    def self.assign_room(reservation:, params:)
      new(reservation:, params:).assign_room
    end

    def self.check_in(reservation:, params:)
      new(reservation:, params:).check_in
    end

    def self.extend_stay(reservation:, params:)
      new(reservation:, params:).extend_stay
    end

    def self.transfer_room(reservation:, params:)
      new(reservation:, params:).transfer_room
    end

    def initialize(reservation:, params:)
      @reservation = reservation
      @params = params.to_h.with_indifferent_access
      @property = reservation.property
    end

    def modify
      ensure_status!("CONFIRMED", "Only confirmed reservations can be modified")
      old_values = snapshot

      Reservation.transaction do
        load_modified_context!
        lock_inventory!(@room_type)
        ensure_type_availability!(@room_type, @rooms_count)
        clear_assignments_if_room_type_changed!
        resize_reservation_rooms!
        quote = build_quote(@check_in_date, @check_out_date, @room_type, @rate_plan, @rooms_count, @adults_count)

        @reservation.update!(
          rate_plan: @rate_plan,
          check_in_date: @check_in_date,
          check_out_date: @check_out_date,
          adults_count: @adults_count,
          children_count: @children_count,
          special_requests: @params[:specialRequests].presence || @reservation.special_requests,
          room_total: quote.room_total,
          service_total: quote.add_on_total,
          tax_total: quote.service_charge + quote.vat_amount,
          grand_total: quote.grand_total
        )
        sync_room_lines!(quote, @room_type, @rooms_count)
        audit!("MODIFY", old_values)
      end

      @reservation.reload
    end

    def cancel
      ensure_status!("CONFIRMED", "Only confirmed reservations can be cancelled before check-in")
      old_values = snapshot

      Reservation.transaction do
        if @reservation.folio&.payments&.exists?
          raise ApiError.new("Reservation has payments and cannot be cancelled without a refund workflow", status: :conflict, code: "PAYMENT_EXISTS")
        end

        release_rooms!("VACANT_CLEAN")
        @reservation.update!(status: "CANCELLED")
        @reservation.folio&.update!(status: "VOID", balance_due: 0)
        audit!("CANCEL", old_values, reason: @params[:reason].presence)
      end

      @reservation.reload
    end

    def assign_room
      ensure_status!("CONFIRMED", "Only confirmed reservations can receive a room assignment")
      old_values = snapshot

      Reservation.transaction do
        room = load_room!
        reservation_room = load_reservation_room!(room.room_type)
        ensure_room_available!(room, @reservation.check_in_date, @reservation.check_out_date)
        release_room!(reservation_room.room, "VACANT_CLEAN") if reservation_room.room && reservation_room.room != room
        reservation_room.update!(room:)
        room.update!(status: "RESERVED")
        audit!("ASSIGN_ROOM", old_values, room_id: room.id, room_number: room.room_number)
      end

      @reservation.reload
    end

    def check_in
      ensure_status!("CONFIRMED", "Reservation is not ready for check-in")
      old_values = snapshot

      Reservation.transaction do
        room = @params[:roomId].present? ? load_room! : @reservation.reservation_rooms.first&.room
        raise ApiError.new("A room assignment is required for check-in", status: :bad_request, code: "ROOM_REQUIRED") unless room

        reservation_room = load_reservation_room!(room.room_type)
        ensure_room_available!(room, @reservation.check_in_date, @reservation.check_out_date)
        ensure_room_ready!(room)
        reservation_room.update!(room:)
        room.update!(status: "OCCUPIED")
        @reservation.update!(status: "CHECKED_IN", checked_in_at: Time.current)
        @reservation.guest.increment!(:stay_count)
        audit!("CHECKIN", old_values, room_id: room.id, room_number: room.room_number)
      end

      @reservation.reload
    end

    def extend_stay
      ensure_status!("CHECKED_IN", "Only checked-in stays can be extended")
      old_values = snapshot
      new_check_out = parse_date!(@params[:checkOutDate] || @params[:newCheckOutDate])
      raise ApiError.new("New check-out must be after current check-out", code: "INVALID_STAY") unless new_check_out > @reservation.check_out_date

      Reservation.transaction do
        room_type = @reservation.reservation_rooms.first.room_type
        rooms_count = @reservation.reservation_rooms.count
        lock_inventory!(room_type)
        ensure_assigned_rooms_available_until!(new_check_out)
        quote = build_quote(@reservation.check_in_date, new_check_out, room_type, @reservation.rate_plan, rooms_count, @reservation.adults_count)
        @reservation.reservation_rooms.update_all(nights: quote.nights, updated_at: Time.current)
        @reservation.update!(
          check_out_date: new_check_out,
          room_total: quote.room_total,
          service_total: quote.add_on_total,
          tax_total: quote.service_charge + quote.vat_amount,
          grand_total: quote.grand_total
        )
        sync_room_lines!(quote, room_type, rooms_count)
        audit!("EXTEND_STAY", old_values, check_out_date: new_check_out)
      end

      @reservation.reload
    end

    def transfer_room
      ensure_status!("CHECKED_IN", "Only checked-in stays can be transferred")
      old_values = snapshot

      Reservation.transaction do
        new_room = load_room!
        current_rr = @reservation.reservation_rooms.includes(:room).find { |rr| rr.room.present? }
        raise ApiError.new("Current room assignment was not found", status: :conflict, code: "ROOM_ASSIGNMENT_REQUIRED") unless current_rr
        raise ApiError.new("Transfer room must match the booked room type", status: :unprocessable_content, code: "ROOM_TYPE_MISMATCH") unless new_room.room_type_id == current_rr.room_type_id

        ensure_room_available!(new_room, Date.current, @reservation.check_out_date)
        ensure_room_ready!(new_room)
        release_room!(current_rr.room, "VACANT_DIRTY")
        current_rr.update!(room: new_room)
        new_room.update!(status: "OCCUPIED")
        audit!("TRANSFER_ROOM", old_values, from_room_id: current_rr.room_id_before_last_save, to_room_id: new_room.id, to_room_number: new_room.room_number)
      end

      @reservation.reload
    end

    private

    def load_modified_context!
      @check_in_date = @params[:checkInDate].present? ? parse_date!(@params[:checkInDate]) : @reservation.check_in_date
      @check_out_date = @params[:checkOutDate].present? ? parse_date!(@params[:checkOutDate]) : @reservation.check_out_date
      raise ApiError.new("Check-out must be after check-in", code: "INVALID_STAY") unless @check_out_date > @check_in_date
      raise ApiError.new("Check-in cannot be in the past", code: "INVALID_STAY") if @check_in_date < Date.current

      @room_type = if @params[:roomTypeCode].present?
        @property.room_types.find_by!(code: @params[:roomTypeCode].to_s.upcase, active: true)
      else
        @reservation.reservation_rooms.first.room_type
      end
      @rate_plan = if @params[:ratePlanCode].present?
        @property.rate_plans.find_by!(code: @params[:ratePlanCode].to_s.upcase, room_type: @room_type, active: true)
      elsif @reservation.rate_plan&.room_type_id == @room_type.id
        @reservation.rate_plan
      else
        @property.rate_plans.find_by(room_type: @room_type, active: true)
      end
      @rooms_count = Integer(@params[:roomsCount].presence || @reservation.reservation_rooms.count)
      @adults_count = Integer(@params[:adultsCount].presence || @reservation.adults_count)
      @children_count = Integer(@params[:childrenCount].presence || @reservation.children_count)
      raise ApiError.new("At least one room is required", code: "INVALID_OCCUPANCY") unless @rooms_count.positive?
      raise ApiError.new("Guest count exceeds room capacity", code: "INVALID_OCCUPANCY") if @adults_count > @room_type.max_adults * @rooms_count
      raise ApiError.new("Child count exceeds room capacity", code: "INVALID_OCCUPANCY") if @children_count > @room_type.max_children * @rooms_count
    rescue Date::Error, ArgumentError
      raise ApiError.new("Dates and guest counts must be valid", status: :bad_request, code: "INVALID_REQUEST")
    end

    def clear_assignments_if_room_type_changed!
      return if @reservation.reservation_rooms.all? { |rr| rr.room_type_id == @room_type.id }

      release_rooms!("VACANT_CLEAN")
      @reservation.reservation_rooms.destroy_all
    end

    def resize_reservation_rooms!
      existing = @reservation.reservation_rooms.to_a
      existing.each { |rr| rr.update!(room_type: @room_type) }
      if existing.size < @rooms_count
        (@rooms_count - existing.size).times { @reservation.reservation_rooms.create!(room_type: @room_type, nightly_rate: 0, nights: 1) }
      elsif existing.size > @rooms_count
        existing.last(existing.size - @rooms_count).each(&:destroy!)
      end
    end

    def sync_room_lines!(quote, room_type, rooms_count)
      folio = @reservation.folio
      return unless folio

      item = folio.folio_items.where(source_module: "ROOM", source_reference: @reservation.id).first_or_initialize
      item.update!(
        description: "#{room_type.name} - #{quote.nights} night(s)",
        quantity: rooms_count,
        unit_price: quote.nightly_rate * quote.nights,
        sub_total: quote.room_total,
        tax_amount: quote.service_charge + quote.vat_amount,
        total_amount: quote.grand_total,
        calculation_snapshot: { taxes: quote.tax_lines }
      )
      folio.update!(
        sub_total: folio.folio_items.where(voided: false).sum(:sub_total),
        service_charge: quote.service_charge,
        tax_amount: quote.vat_amount,
        grand_total: folio.folio_items.where(voided: false).sum(:sub_total) + folio.folio_items.where(voided: false).sum(:tax_amount),
        total_paid: folio.payments.sum(:amount)
      )
      folio.update!(balance_due: [ folio.grand_total - folio.total_paid, 0 ].max)
      @reservation.reservation_rooms.update_all(nightly_rate: quote.nightly_rate, nights: quote.nights, updated_at: Time.current)
    end

    def build_quote(check_in_date, check_out_date, room_type, rate_plan, rooms_count, adults_count)
      Pricing::RoomQuote.call(
        property: @property,
        room_type:,
        rate_plan:,
        check_in_date:,
        check_out_date:,
        rooms_count:,
        adults_count:,
        add_on_codes: []
      )
    end

    def ensure_type_availability!(room_type, rooms_count)
      available = Availability::RoomInventory.available_count(
        property: @property,
        room_type:,
        check_in_date: @check_in_date,
        check_out_date: @check_out_date,
        exclude_reservation: @reservation
      )
      raise ApiError.new("The requested room type is no longer available", status: :conflict, code: "ROOM_UNAVAILABLE") if available < rooms_count
    end

    def ensure_assigned_rooms_available_until!(new_check_out)
      @reservation.reservation_rooms.includes(:room).each do |rr|
        next unless rr.room

        ensure_room_available!(rr.room, @reservation.check_out_date, new_check_out)
      end
    end

    def ensure_room_available!(room, check_in_date, check_out_date)
      conflict = ReservationRoom
        .joins(:reservation)
        .where(room:)
        .where(reservations: { property_id: @property.id, status: Reservation::ACTIVE_STATUSES })
        .where.not(reservations: { id: @reservation.id })
        .where("reservations.check_in_date < ? AND reservations.check_out_date > ?", check_out_date, check_in_date)
        .exists?
      raise ApiError.new("Room is already assigned for this stay window", status: :conflict, code: "ROOM_UNAVAILABLE") if conflict
    end

    def ensure_room_ready!(room)
      return if ROOM_READY_STATUSES.include?(room.status)

      raise ApiError.new("Room is not ready for guest occupancy", status: :conflict, code: "ROOM_NOT_READY")
    end

    def load_room!
      room_id = @params[:roomId].presence
      raise ApiError.new("A room id is required", status: :bad_request, code: "ROOM_REQUIRED") unless room_id

      @property.rooms.includes(:room_type).active.find(room_id)
    end

    def load_reservation_room!(room_type)
      @reservation.reservation_rooms.where(room_type:).first ||
        raise(ApiError.new("Reservation does not include this room type", status: :unprocessable_content, code: "ROOM_TYPE_MISMATCH"))
    end

    def release_rooms!(status)
      @reservation.reservation_rooms.includes(:room).each { |rr| release_room!(rr.room, status) }
    end

    def release_room!(room, status)
      room&.update!(status:)
    end

    def lock_inventory!(room_type)
      lock_key = "reservation:#{@property.id}:#{room_type.id}"
      quoted_key = ActiveRecord::Base.connection.quote(lock_key)
      ActiveRecord::Base.connection.execute("SELECT pg_advisory_xact_lock(hashtext(#{quoted_key}))")
    end

    def ensure_status!(status, message)
      return if @reservation.status == status

      raise ApiError.new(message, status: :conflict, code: "INVALID_RESERVATION_STATUS")
    end

    def parse_date!(value)
      Date.iso8601(value.to_s)
    end

    def audit!(action, old_values, new_values = {})
      AuditLog.create!(
        company: @property.company,
        property: @property,
        user: Current.user,
        module_name: "RESERVATIONS",
        action:,
        entity_type: "Reservation",
        entity_id: @reservation.id,
        old_values:,
        new_values: new_values.merge(snapshot),
        request_id: Current.request_id,
        ip_address: Current.ip_address
      )
    end

    def snapshot
      rr = @reservation.reservation_rooms.includes(:room, :room_type).map do |reservation_room|
        {
          room_type: reservation_room.room_type.code,
          room_id: reservation_room.room_id,
          room_number: reservation_room.room&.room_number
        }
      end
      {
        status: @reservation.status,
        check_in_date: @reservation.check_in_date,
        check_out_date: @reservation.check_out_date,
        grand_total: @reservation.grand_total.to_s,
        rooms: rr
      }
    end
  end
end
