class Room < ApplicationRecord
  STATUSES = %w[VACANT_CLEAN VACANT_DIRTY OCCUPIED RESERVED DUE_OUT OUT_OF_ORDER OUT_OF_SERVICE INSPECTION_REQUIRED].freeze

  belongs_to :property
  belongs_to :room_type
  has_many :reservation_rooms, dependent: :restrict_with_error
  has_many :housekeeping_tasks, dependent: :restrict_with_error

  scope :active, -> { where(active: true) }

  validates :room_number, presence: true, uniqueness: { scope: :property_id }
  validates :floor, numericality: { only_integer: true, greater_than: 0 }
  validates :status, inclusion: { in: STATUSES }
  validate :room_type_belongs_to_property

  private

  def room_type_belongs_to_property
    errors.add(:room_type, "must belong to the same property") if room_type && room_type.property_id != property_id
  end
end
