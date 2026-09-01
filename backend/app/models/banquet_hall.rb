class BanquetHall < ApplicationRecord
  belongs_to :property
  has_many :banquet_bookings, dependent: :restrict_with_error

  validates :name, :code, presence: true
  validates :code, uniqueness: { scope: :property_id }
end
