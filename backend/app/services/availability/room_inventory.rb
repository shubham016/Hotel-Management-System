module Availability
  class RoomInventory
    def self.available_count(property:, room_type:, check_in_date:, check_out_date:, exclude_reservation: nil)
      total = property.rooms.where(room_type:, active: true).where.not(status: %w[OUT_OF_ORDER OUT_OF_SERVICE]).count
      reserved_scope = ReservationRoom
        .joins(:reservation)
        .where(room_type:)
        .where(reservations: { property_id: property.id, status: Reservation::ACTIVE_STATUSES })
        .where("reservations.check_in_date < ? AND reservations.check_out_date > ?", check_out_date, check_in_date)
      reserved_scope = reserved_scope.where.not(reservations: { id: exclude_reservation.id }) if exclude_reservation
      reserved = reserved_scope.count

      [ total - reserved, 0 ].max
    end
  end
end
