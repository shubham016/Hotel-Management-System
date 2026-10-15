module Availability
  class RoomInventory
    def self.available_count(property:, room_type: nil, check_in_date:, check_out_date:, exclude_reservation: nil)
      rooms = eligible_rooms(property:, room_type:, check_in_date:)
      reserved = conflicting_reservation_rooms(property:, room_type:, check_in_date:, check_out_date:, exclude_reservation:)
      assigned_ids = reserved.where.not(room_id: nil).select(:room_id)
      # Count physical rooms once even when an overdue stay conflicts with an
      # existing advance reservation. Unassigned category holds still consume inventory.
      [ rooms.where.not(id: assigned_ids).count - reserved.where(room_id: nil).count, 0 ].max
    end

    def self.available_rooms(property:, room_type: nil, check_in_date:, check_out_date:, exclude_reservation: nil, ready_only: false)
      available_count = available_count(property:, room_type:, check_in_date:, check_out_date:, exclude_reservation:)
      assigned_room_ids = conflicting_reservation_rooms(property:, room_type:, check_in_date:, check_out_date:, exclude_reservation:)
        .where.not(room_id: nil)
        .select(:room_id)

      rooms = eligible_rooms(property:, room_type:, check_in_date:)
      rooms = rooms.where(status: %w[VACANT_CLEAN RESERVED]) if ready_only
      rooms
        .where.not(id: assigned_room_ids)
        .by_floor_and_room_number
        .limit(available_count)
    end

    def self.room_available?(room:, check_in_date:, check_out_date:, exclude_reservation: nil)
      eligible_rooms(property: room.property, room_type: room.room_type, check_in_date:).where(id: room.id).exists? &&
        !conflicting_reservation_rooms(property: room.property, room_type: room.room_type, check_in_date:, check_out_date:, exclude_reservation:).where(room_id: room.id).exists?
    end

    def self.eligible_rooms(property:, room_type:, check_in_date:)
      rooms = property.rooms.active.setup_managed.where.not(status: "OUT_OF_ORDER")
      rooms = rooms.where(room_type:) if room_type
      # Cleanliness controls check-in, not saleable inventory. Occupancy is
      # protected by reservation conflicts even when a departure is overdue.
      rooms = rooms.where(status: %w[VACANT_CLEAN VACANT_DIRTY INSPECTION_REQUIRED RESERVED OUT_OF_SERVICE]) if check_in_date <= Date.current
      rooms
    end
    private_class_method :eligible_rooms

    def self.conflicting_reservation_rooms(property:, room_type: nil, check_in_date:, check_out_date:, exclude_reservation: nil)
      scope = ReservationRoom
        .joins(:reservation)
        .where(reservations: { property_id: property.id, status: Reservation::INVENTORY_BLOCKING_STATUSES })
        .where(<<~SQL.squish, check_in: check_in_date, check_out: check_out_date, today: Date.current, overdue: property.overdue_departure_cutoff_date)
          reservations.check_in_date < :check_out AND (
            reservations.check_out_date > :check_in OR
            (reservations.status = 'CHECKED_IN' AND
              (:check_in <= :today OR reservations.check_out_date <= :overdue))
          )
        SQL
      scope = scope.where(room_type:) if room_type
      scope = scope.where.not(reservations: { id: exclude_reservation.id }) if exclude_reservation
      scope
    end
  end
end
