module Reservations
  class Lifecycle
    ROOM_READY_STATUSES = %w[VACANT_CLEAN RESERVED].freeze

    def self.modify(reservation:, params:)
      new(reservation:, params:).modify
    end

    def self.cancel(reservation:, params:)
      new(reservation:, params:).cancel
    end

    def self.archive(reservation:, params:)
      new(reservation:, params:).archive
    end

    def self.assign_room(reservation:, params:)
      new(reservation:, params:).assign_room
    end

    def self.check_in(reservation:, params:)
      new(reservation:, params:).check_in
    end

    def self.no_show(reservation:, params:)
      new(reservation:, params:).no_show
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
        ensure_assigned_rooms_available!(@check_in_date, @check_out_date)
        quote = build_quote(@check_in_date, @check_out_date, @room_type, @rate_plan, @rooms_count, @adults_count, @children_count)

        @reservation.update!(
          rate_plan: @rate_plan,
          check_in_date: @check_in_date,
          check_out_date: @check_out_date,
          adults_count: @adults_count,
          children_count: @children_count,
          special_requests: @params[:specialRequests].presence || @reservation.special_requests,
          room_total: quote.room_total,
          service_total: quote.add_on_total,
          tax_total: quote.vat_amount,
          grand_total: quote.grand_total
        )
        sync_room_lines!(quote, @room_type, @rooms_count)
        audit!("MODIFY", old_values)
      end

      @reservation.reload
    end

    def cancel
      ensure_status_in!([ "INQUIRY", "CONFIRMED" ], "Only pending or confirmed reservations can be cancelled before check-in")
      old_values = snapshot

      Reservation.transaction do
        folio = @reservation.folio
        folio&.lock!
        @reservation.lock!
        return @reservation.reload if @reservation.status == "CANCELLED"
        ensure_status_in!([ "INQUIRY", "CONFIRMED" ], "Only pending or confirmed reservations can be cancelled before check-in")
        ensure_no_gateway_payment!
        paid = folio ? folio.payments.sum(:amount) : 0.to_d
        if paid.positive? && BigDecimal(@params[:expectedPaidAmount].to_s, exception: false) != paid
          raise ApiError.new("Payment amount changed. Refresh the booking and review the refund before cancelling.", status: :conflict, code: "REFUND_REVIEW_REQUIRED")
        end
        invalidate_payment_requests!(folio, reason: "Booking cancelled by staff")
        refund = Payments::CancellationRefunds.create!(folio) if folio

        release_rooms!("VACANT_CLEAN")
        @reservation.update!(status: "CANCELLED")
        folio&.update!(status: "VOID", balance_due: 0, total_paid: paid)
        audit!("CANCEL", old_values, reason: @params[:reason].presence, refund_amount: refund&.refund_amount&.to_s, cancellation_deduction: refund&.deduction_amount&.to_s)
      end

      @reservation.reload
    end

    def archive
      ensure_status_in!(Reservation::STATUSES - [ "ARCHIVED" ], "This booking has already been deleted")
      old_values = snapshot

      Reservation.transaction do
        folio = @reservation.folio
        folio&.lock!
        @reservation.lock!
        refund = folio&.cancellation_refund
        refunded_cancellation = @reservation.status == "CANCELLED" && refund&.status == "PAID" && refund.paid_amount == folio.payments.sum(:amount)
        if @reservation.status != "CHECKED_OUT" && folio&.payments&.exists? && !refunded_cancellation
          raise ApiError.new("This active booking has payments and requires a refund before it can be deleted", status: :conflict, code: "PAYMENT_EXISTS")
        end
        invalidate_payment_requests!(folio)

        if @reservation.status == "CHECKED_IN"
          release_rooms!("VACANT_DIRTY")
        elsif @reservation.status != "CHECKED_OUT"
          release_rooms!("VACANT_CLEAN")
        end
        folio&.update!(status: "VOID", balance_due: 0) unless @reservation.status == "CHECKED_OUT"
        @reservation.update!(status: "ARCHIVED")
        audit!("DELETE", old_values, reason: @params[:reason].presence || "Deleted by staff")
      end

      @reservation.reload
    end

    def assign_room
      ensure_status!("CONFIRMED", "Only confirmed reservations can receive a room assignment")
      old_values = snapshot

      Reservation.transaction do
        room = load_room!
        lock_inventory!(room.room_type)
        room.lock!
        reservation_room = load_reservation_room!(room.room_type)
        ensure_room_available!(room, @reservation.check_in_date, @reservation.check_out_date)
        unless Availability::RoomInventory.room_available?(room:, check_in_date: @reservation.check_in_date, check_out_date: @reservation.check_out_date, exclude_reservation: @reservation)
          raise ApiError.new("Room is not available for this stay window", status: :conflict, code: "ROOM_UNAVAILABLE")
        end
        release_room!(reservation_room.room, "VACANT_CLEAN") if reservation_room.room && reservation_room.room != room
        reservation_room.update!(room:)
        room.update!(status: "RESERVED") if room.status.in?(%w[VACANT_CLEAN RESERVED])
        audit!("ASSIGN_ROOM", old_values, room_id: room.id, room_number: room.room_number)
      end

      @reservation.reload
    end

    def check_in
      # Reception's verification at arrival is the confirmation step. Keep the
      # persisted CHECKED_IN state so in-house guests and checkout remain
      # operationally distinct, while the UI presents it as confirmed/check-in.
      ensure_status_in!([ "INQUIRY", "CONFIRMED" ], "Reservation is not ready for check-in")
      ensure_check_in_date!
      old_values = snapshot

      Reservation.transaction do
        booked = @reservation.reservation_rooms.includes(:room).order(:id).to_a
        if @params[:roomAssignments].present? && !@params[:roomAssignments].is_a?(Array)
          raise ApiError.new("Choose a room for each booked room", status: :unprocessable_content, code: "ROOM_ASSIGNMENTS_REQUIRED")
        end
        assignments = Array(@params[:roomAssignments])
        assignments = booked.map { |rr| { reservationRoomId: rr.id, roomId: rr.room_id } } if assignments.empty?
        assignments.first[:roomId] = @params[:roomId] if booked.one? && @params[:roomId].present?
        raise ApiError.new("Choose a room for each booked room", status: :unprocessable_content, code: "ROOM_ASSIGNMENTS_REQUIRED") unless assignments.all? { |a| a.is_a?(Hash) }
        assignments = assignments.map(&:with_indifferent_access)
        unless assignments.size == booked.size && assignments.map { |a| a[:reservationRoomId] }.sort == booked.map(&:id).sort && assignments.all? { |a| a[:roomId].present? } && assignments.map { |a| a[:roomId] }.uniq.size == booked.size
          raise ApiError.new("Assign a different room to every booked room", status: :unprocessable_content, code: "ROOM_ASSIGNMENTS_REQUIRED")
        end
        selected = @property.rooms.active.setup_managed.includes(:room_type).where(id: assignments.map { |a| a[:roomId] }).index_by(&:id)
        raise ActiveRecord::RecordNotFound unless selected.size == booked.size
        booked.map(&:room_type_id).uniq.sort.each { |id| lock_inventory!(@property.room_types.find(id)) }
        selected.values.sort_by(&:id).each(&:lock!)
        @reservation.lock!
        ensure_status_in!([ "INQUIRY", "CONFIRMED" ], "Reservation is not ready for check-in")
        pairs = assignments.map { |a| [ booked.find { |rr| rr.id == a[:reservationRoomId] }, selected.fetch(a[:roomId]) ] }
        pairs.each do |rr, room|
          raise ApiError.new("Room does not match the booked room type", status: :unprocessable_content, code: "ROOM_TYPE_MISMATCH") unless rr.room_type_id == room.room_type_id
          ensure_room_available!(room, @reservation.check_in_date, @reservation.check_out_date)
          ensure_room_ready!(room)
        end
        previous_rooms = booked.map(&:room).compact
        pairs.each { |rr, room| rr.update!(room:); room.update!(status: "OCCUPIED") }
        (previous_rooms - selected.values).each { |room| release_room!(room, "VACANT_CLEAN") }
        @reservation.update!(status: "CHECKED_IN", checked_in_at: Time.current)
        @reservation.guest.increment!(:stay_count)
        audit!("CHECKIN", old_values, room_id: pairs.first.last.id, room_number: pairs.first.last.room_number, room_assignments: assignments)
      end

      @reservation.reload
    end

    def extend_stay
      ensure_status!("CHECKED_IN", "Only checked-in stays can be extended")
      old_values = snapshot
      additional_nights = Integer(@params[:additionalNights])
      reason = @params[:reason].to_s.strip
      raise ApiError.new("Extension must be between 1 and 365 nights", status: :unprocessable_content, code: "INVALID_EXTENSION") unless additional_nights.between?(1, 365)
      raise ApiError.new("A short reason is required to extend the stay", status: :unprocessable_content, code: "EXTENSION_REASON_REQUIRED") if reason.length < 3
      Reservation.transaction do
        room_type = @reservation.reservation_rooms.first.room_type
        rooms_count = @reservation.reservation_rooms.count
        lock_inventory!(room_type)
        @reservation.folio&.lock!
        @reservation.lock!
        ensure_status!("CHECKED_IN", "Only checked-in stays can be extended")
        old_values = snapshot
        new_check_out = @reservation.check_out_date + additional_nights.days
        ensure_assigned_rooms_available_until!(new_check_out)
        service_items = @reservation.folio.folio_items.where(source_module: "SERVICE", voided: false).to_a
        periodic_codes = @property.service_offerings.where(id: service_items.map(&:source_reference), pricing_unit: %w[PER_NIGHT PER_GUEST_PER_NIGHT]).pluck(:code)
        quote = build_quote(@reservation.check_out_date, new_check_out, room_type, @reservation.rate_plan, rooms_count, @reservation.adults_count, @reservation.children_count,
          nightly_rate: @reservation.reservation_rooms.first.nightly_rate, add_on_codes: periodic_codes,
          add_on_prices: service_items.to_h { |item| [item.source_reference, item.unit_price] })
        total_nights = (new_check_out - @reservation.check_in_date).to_i
        @reservation.reservation_rooms.update_all(nights: total_nights, updated_at: Time.current)
        @reservation.update!(
          check_out_date: new_check_out,
          room_total: @reservation.room_total + quote.room_total,
          service_total: @reservation.service_total + quote.add_on_total,
          tax_total: @reservation.tax_total + quote.vat_amount,
          grand_total: @reservation.grand_total + quote.grand_total
        )
        sync_extension_lines!(quote, room_type, total_nights)
        audit!(@params[:automatic] ? "AUTO_EXTEND_STAY" : "EXTEND_STAY", old_values, check_out_date: new_check_out, additional_nights:, reason:)
      end

      @reservation.reload
    rescue ArgumentError, TypeError
      raise ApiError.new("Additional nights must be a whole number", status: :unprocessable_content, code: "INVALID_EXTENSION")
    end

    def no_show
      ensure_status_in!(%w[INQUIRY CONFIRMED], "Only pending arrivals can be marked no-show")
      raise ApiError.new("Arrival date has not been reached", status: :conflict, code: "ARRIVAL_NOT_DUE") if @reservation.check_in_date > @property.operating_date
      Reservation.transaction do
        @reservation.folio.lock!
        @reservation.lock!
        ensure_status_in!(%w[INQUIRY CONFIRMED], "Only pending arrivals can be marked no-show")
        ensure_no_gateway_payment!
        raise ApiError.new("Cancel and review the advance refund before resolving this arrival", status: :conflict, code: "ADVANCE_REVIEW_REQUIRED") if @reservation.folio.payments.exists?
        invalidate_payment_requests!(@reservation.folio, reason: "Guest did not arrive")
        release_rooms!("VACANT_CLEAN")
        @reservation.update!(status: "NO_SHOW")
        @reservation.folio.update!(status: "VOID", balance_due: 0)
        audit!("NO_SHOW", {}, reason: @params[:reason].presence || "Guest did not arrive")
      end
      @reservation.reload
    end

    def transfer_room
      ensure_status!("CHECKED_IN", "Only checked-in stays can be transferred")
      old_values = snapshot

      Reservation.transaction do
        new_room = load_room!
        lock_inventory!(new_room.room_type)
        new_room.lock!
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

    def sync_extension_lines!(quote, room_type, total_nights)
      folio = @reservation.folio
      item = folio.folio_items.find_by!(source_module: "ROOM", source_reference: @reservation.id, voided: false)
      old_taxes = item.calculation_snapshot.to_h["taxes"] || []
      item.update!(description: "#{room_type.name} - #{total_nights} night(s)",
        unit_price: item.unit_price + quote.nightly_rate * quote.nights,
        sub_total: item.sub_total + quote.room_total, tax_amount: item.tax_amount + quote.vat_amount,
        total_amount: item.total_amount + quote.grand_total,
        calculation_snapshot: { taxes: old_taxes + quote.tax_lines })
      quote.add_on_lines.each do |line|
        service = folio.folio_items.find_by!(source_module: "SERVICE", source_reference: line[:id], voided: false)
        service.update!(quantity: service.quantity + line[:quantity], sub_total: service.sub_total + line[:total], total_amount: service.total_amount + line[:total])
      end
      Folios::Recalculate.call(folio)
    end

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
      unless @room_type.accommodates?(adults_count: @adults_count, children_count: @children_count, rooms_count: @rooms_count)
        raise ApiError.new("Guest count exceeds room capacity", code: "INVALID_OCCUPANCY")
      end
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
        tax_amount: quote.vat_amount,
        total_amount: quote.grand_total,
        calculation_snapshot: { taxes: quote.tax_lines }
      )
      sync_service_lines!(folio, quote)
      Folios::Recalculate.call(folio)
      @reservation.reservation_rooms.update_all(nightly_rate: quote.nightly_rate, nights: quote.nights, updated_at: Time.current)
    end

    def sync_service_lines!(folio, quote)
      quote.add_on_lines.each do |line|
        item = folio.folio_items.where(source_module: "SERVICE", source_reference: line[:id]).first_or_initialize
        item.update!(
          description: line[:name],
          quantity: line[:quantity],
          unit_price: line[:unit_price],
          sub_total: line[:total],
          tax_amount: 0,
          total_amount: line[:total]
        )
      end
    end

    def build_quote(check_in_date, check_out_date, room_type, rate_plan, rooms_count, adults_count, children_count, nightly_rate: nil, add_on_codes: nil, add_on_prices: {})
      Pricing::RoomQuote.call(
        property: @property,
        room_type:,
        rate_plan:,
        check_in_date:,
        check_out_date:,
        rooms_count:,
        adults_count:,
        children_count:,
        add_on_codes: add_on_codes || reservation_add_on_codes,
        nightly_rate:,
        add_on_prices:
      )
    end

    def reservation_add_on_codes
      source_ids = @reservation.folio&.folio_items&.where(source_module: "SERVICE", voided: false)&.pluck(:source_reference) || []
      return [] if source_ids.empty?

      @property.service_offerings.where(id: source_ids, active: true).pluck(:code)
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

    def ensure_assigned_rooms_available!(check_in_date, check_out_date)
      @reservation.reservation_rooms.includes(:room).each do |reservation_room|
        next unless reservation_room.room

        ensure_room_available!(reservation_room.room, check_in_date, check_out_date)
      end
    end

    def ensure_room_available!(room, check_in_date, check_out_date)
      conflict = Availability::RoomInventory.conflicting_reservation_rooms(
        property: @property, room_type: room.room_type, check_in_date:, check_out_date:, exclude_reservation: @reservation
      ).where(room_id: room.id)
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

      @property.rooms.includes(:room_type).active.setup_managed.find(room_id)
    end

    def load_reservation_room!(room_type)
      @reservation.reservation_rooms.where(room_type:).first ||
        raise(ApiError.new("Reservation does not include this room type", status: :unprocessable_content, code: "ROOM_TYPE_MISMATCH"))
    end

    def release_rooms!(status)
      @reservation.reservation_rooms.includes(:room).each { |rr| release_room!(rr.room, status) }
    end

    def ensure_no_gateway_payment!
      requests = @reservation.folio&.payment_requests&.where(status: "INITIATED")
      return unless requests

      requests.each do |request|
        next unless request.expired? && Payments::Gateway.modes[request.gateway&.to_sym] == "SANDBOX"

        request.update!(status: "FAILED")
        AuditLog.create!(
          company: @property.company, property: @property, user: Current.user,
          module_name: "PAYMENTS", action: "EXPIRE", entity_type: "PaymentRequest", entity_id: request.id,
          new_values: { status: "FAILED", reason: "Expired sandbox payment request" },
          request_id: Current.request_id, ip_address: Current.ip_address
        )
      end
      return unless requests.exists?

      raise ApiError.new("A gateway payment is in progress for this booking", status: :conflict, code: "PAYMENT_IN_PROGRESS")
    end

    def invalidate_payment_requests!(folio, reason: "Booking deleted by staff")
      return unless folio

      folio.payment_requests.where(status: %w[PENDING INITIATED]).lock.each do |request|
        request.update!(status: "FAILED", expires_at: Time.current)
        AuditLog.create!(
          company: @property.company, property: @property, user: Current.user,
          module_name: "PAYMENTS", action: "CANCEL", entity_type: "PaymentRequest", entity_id: request.id,
          new_values: { status: "FAILED", reason: },
          request_id: Current.request_id, ip_address: Current.ip_address
        )
      end
    end

    def release_room!(room, status)
      return unless room
      return if room.reservation_rooms.joins(:reservation).where(reservations: { status: "CHECKED_IN" }).where.not(reservations: { id: @reservation.id }).exists?
      # Cancelling an advance booking must not clean a room awaiting housekeeping.
      return if status == "VACANT_CLEAN" && !room.status.in?(%w[VACANT_CLEAN RESERVED])

      room.update!(status:)
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

    def ensure_status_in!(statuses, message)
      return if @reservation.status.in?(statuses)

      raise ApiError.new(message, status: :conflict, code: "INVALID_RESERVATION_STATUS")
    end

    def ensure_check_in_date!
      return if Date.current.between?(@reservation.check_in_date, @reservation.check_out_date)

      if Date.current < @reservation.check_in_date
        raise ApiError.new("This reservation can be checked in from #{@reservation.check_in_date}", status: :conflict, code: "CHECKIN_NOT_OPEN")
      end

      raise ApiError.new("This reservation ended on #{@reservation.check_out_date}. Extend or rebook the stay before check-in.", status: :conflict, code: "STAY_EXPIRED")
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
