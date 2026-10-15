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
  validates :bed_category, presence: true, if: :bed_details_set?
  validates :bed_count, :bed_length_inches, :bed_width_inches, numericality: { only_integer: true, greater_than: 0 }, if: :bed_details_set?
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

  def bed_details_set?
    [bed_category, bed_count, bed_length_inches, bed_width_inches].any? { |value| !value.nil? }
  end

  def bed_label
    return room_type.default_bed_label unless bed_details_set?

    length = format("%g", bed_length_inches.to_f / 12)
    width = format("%g", bed_width_inches.to_f / 12)
    "#{bed_count} #{bed_category} #{bed_count == 1 ? 'bed' : 'beds'} (#{length} × #{width} ft)"
  end

  def bed_details
    { bedCategory: bed_category, bedCount: bed_count, bedLengthInches: bed_length_inches, bedWidthInches: bed_width_inches, bedLabel: bed_label }
  end

  private

  def room_type_belongs_to_property
    errors.add(:room_type, "must belong to the same property") if room_type && room_type.property_id != property_id
  end
end
