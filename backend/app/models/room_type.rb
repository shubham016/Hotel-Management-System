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
  validates :bed_category, presence: true
  validates :max_adults, :max_children, :max_occupancy, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :bed_count, numericality: { only_integer: true, greater_than: 0 }
  validates :code, uniqueness: { scope: :property_id }

  def accommodates?(adults_count:, children_count:, rooms_count: 1)
    rooms_count.positive? && adults_count.positive? && children_count >= 0 &&
      adults_count <= max_adults * rooms_count &&
      children_count <= max_children * rooms_count &&
      adults_count + children_count <= max_occupancy * rooms_count
  end
end
