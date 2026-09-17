module Availability
  class RoomInventory
    def self.available_count(property:, room_type:, check_in_date:, check_out_date:, exclude_reservation: nil)
      total = sellable_rooms(property:, room_type:).count
      reserved = reserved_scope(property:, room_type:, check_in_date:, check_out_date:, exclude_reservation:).count

      [ total - reserved, 0 ].max
    end

    def self.available_rooms(property:, room_type:, check_in_date:, check_out_date:, exclude_reservation: nil)
      available_count = available_count(property:, room_type:, check_in_date:, check_out_date:, exclude_reservation:)
      assigned_room_ids = reserved_scope(property:, room_type:, check_in_date:, check_out_date:, exclude_reservation:)
        .where.not(room_id: nil)
        .select(:room_id)

      sellable_rooms(property:, room_type:)
        .where.not(id: assigned_room_ids)
        .by_floor_and_room_number
        .limit(available_count)
    end

    def self.sellable_rooms(property:, room_type:)
      property.rooms.active.setup_managed.where(room_type:).where.not(status: %w[OUT_OF_ORDER OUT_OF_SERVICE])
    end
    private_class_method :sellable_rooms

    def self.reserved_scope(property:, room_type:, check_in_date:, check_out_date:, exclude_reservation: nil)
      scope = ReservationRoom
        .joins(:reservation)
        .where(room_type:)
        .where(reservations: { property_id: property.id, status: Reservation::INVENTORY_BLOCKING_STATUSES })
        .where("reservations.check_in_date < ? AND reservations.check_out_date > ?", check_out_date, check_in_date)
      scope = scope.where.not(reservations: { id: exclude_reservation.id }) if exclude_reservation
      scope
    end
    private_class_method :reserved_scope
  end
end
