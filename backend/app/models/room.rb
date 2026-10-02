class Room < ApplicationRecord
  STATUSES = %w[VACANT_CLEAN VACANT_DIRTY OCCUPIED RESERVED DUE_OUT OUT_OF_ORDER OUT_OF_SERVICE INSPECTION_REQUIRED].freeze

  belongs_to :property
  belongs_to :room_type
  has_many :reservation_rooms, dependent: :restrict_with_error
  has_many :housekeeping_tasks, dependent: :restrict_with_error

  scope :active, -> { where(active: true) }
  scope :setup_managed, -> { where(setup_managed: true) }
  scope :by_floor_and_room_number, -> {
    order(
      :floor,
      Arel.sql("NULLIF(regexp_replace(room_number, '[^0-9]', '', 'g'), '')::integer"),
      :room_number
    )
  }

  validates :room_number, presence: true, uniqueness: { scope: :property_id }
  validates :floor, numericality: { only_integer: true, greater_than: 0 }
  validates :status, inclusion: { in: STATUSES }
  validate :room_type_belongs_to_property
  after_save :queue_housekeeping!, if: :saved_change_to_status?

  def queue_housekeeping!
    if status.in?(%w[VACANT_DIRTY INSPECTION_REQUIRED])
      task_type = status == "VACANT_DIRTY" ? "CLEANING" : "INSPECTION"
      task = housekeeping_tasks.find_or_create_by!(task_type:, status: "PENDING")
      Housekeeping::NotifyStaff.call(room: self, task:)
    elsif status == "VACANT_CLEAN"
      housekeeping_tasks.where(status: "PENDING").update_all(status: "COMPLETED", completed_at: Time.current, updated_at: Time.current)
    end
  end

  private

  def room_type_belongs_to_property
    errors.add(:room_type, "must belong to the same property") if room_type && room_type.property_id != property_id
  end
end
