class ConvertLegacyConfirmedReservationsToPending < ActiveRecord::Migration[8.0]
  # Before the pending-at-booking workflow, every new booking was stored as
  # CONFIRMED. In the current workflow confirmation happens when reception
  # verifies the arriving guest and checks them in, so untouched legacy
  # confirmed bookings belong in the pending queue.
  def up
    Reservation.where(status: "CONFIRMED").update_all(status: "INQUIRY", updated_at: Time.current)
  end

  # This data change is intentionally not reversible: a previous CONFIRMED
  # value did not record whether staff had actually verified the guest.
  def down
  end
end
