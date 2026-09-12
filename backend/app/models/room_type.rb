class RoomType < ApplicationRecord
  belongs_to :property
  has_many :rooms, dependent: :restrict_with_error
  has_many :rate_plans, dependent: :restrict_with_error
  has_many :reservation_rooms, dependent: :restrict_with_error

  normalizes :code, with: ->(value) { value.to_s.strip.upcase }
  normalizes :slug, with: ->(value) { value.to_s.strip.downcase }

  scope :setup_managed, -> { where(setup_managed: true) }

  validates :name, :code, :slug, presence: true
  validates :base_price, numericality: { greater_than_or_equal_to: 0 }
  validates :max_adults, :max_children, :max_occupancy, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :code, uniqueness: { scope: :property_id }
end
