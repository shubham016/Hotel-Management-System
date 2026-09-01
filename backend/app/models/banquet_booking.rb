class BanquetBooking < ApplicationRecord
  belongs_to :property
  belongs_to :banquet_hall
  belongs_to :guest

  validates :booking_ref, :event_name, presence: true
end
