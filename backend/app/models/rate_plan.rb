class RatePlan < ApplicationRecord
  belongs_to :property
  belongs_to :room_type
  has_many :reservations, dependent: :restrict_with_error

  normalizes :code, with: ->(value) { value.to_s.strip.upcase }

  validates :name, :code, presence: true
  validates :code, uniqueness: { scope: :property_id }
  validates :price_modifier, numericality: true
end
