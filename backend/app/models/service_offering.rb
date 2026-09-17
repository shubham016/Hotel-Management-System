class ServiceOffering < ApplicationRecord
  PRICING_UNITS = %w[PER_BOOKING PER_NIGHT PER_GUEST PER_GUEST_PER_NIGHT].freeze

  belongs_to :property

  normalizes :code, with: ->(value) { value.to_s.strip.upcase }

  validates :code, :name, presence: true
  validates :code, uniqueness: { scope: :property_id }
  validates :pricing_unit, inclusion: { in: PRICING_UNITS }
  validates :unit_price, numericality: { greater_than_or_equal_to: 0 }
end
