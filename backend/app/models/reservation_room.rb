class ReservationRoom < ApplicationRecord
  belongs_to :reservation
  belongs_to :room_type
  belongs_to :room, optional: true

  validates :nightly_rate, numericality: { greater_than_or_equal_to: 0 }
  validates :nights, numericality: { only_integer: true, greater_than: 0 }
end
