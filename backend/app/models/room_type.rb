class RoomType < ApplicationRecord
  belongs_to :property
  has_many :rooms, dependent: :restrict_with_error
  has_many :rate_plans, dependent: :restrict_with_error
  has_many :reservation_rooms, dependent: :restrict_with_error

  normalizes :code, with: ->(value) { value.to_s.strip.upcase }
  normalizes :slug, with: ->(value) { value.to_s.strip.downcase }

  scope :setup_managed, -> { where(setup_managed: true) }

  before_validation :calculate_max_occupancy

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

  def default_bed_label
    category = bed_category.to_s.casecmp?("Not specified") ? "" : "#{bed_category} "
    "#{bed_count} #{category}#{bed_count == 1 ? 'bed' : 'beds'}"
  end

  def bed_label
    labels = physical_bed_rooms.map(&:bed_label).uniq
    return default_bed_label if labels.empty?

    labels.one? ? labels.first : "Beds vary by room — select a room to see its bed details"
  end

  def bed_count_label
    counts = physical_bed_rooms.map { |room| room.bed_count || bed_count }.uniq.sort
    counts.empty? ? bed_count.to_s : counts.one? ? counts.first.to_s : "#{counts.first}–#{counts.last}"
  end

  private

  def physical_bed_rooms
    rooms.select { |room| room.active? && room.setup_managed? }
  end

  def calculate_max_occupancy
    return if max_adults.nil? || max_children.nil?

    self.max_occupancy = max_adults + max_children
  end
end
