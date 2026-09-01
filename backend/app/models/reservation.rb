class Reservation < ApplicationRecord
  ACTIVE_STATUSES = %w[CONFIRMED CHECKED_IN].freeze
  STATUSES = %w[INQUIRY CONFIRMED CHECKED_IN CHECKED_OUT CANCELLED NO_SHOW].freeze
  SOURCES = %w[DIRECT_WEB WALK_IN PHONE EMAIL OTA CORPORATE TRAVEL_AGENT].freeze

  belongs_to :property
  belongs_to :guest
  belongs_to :rate_plan, optional: true
  has_many :reservation_rooms, dependent: :destroy
  has_one :folio, dependent: :restrict_with_error

  validates :confirmation_number, presence: true, uniqueness: true
  validates :status, inclusion: { in: STATUSES }
  validates :source, inclusion: { in: SOURCES }
  validates :adults_count, numericality: { only_integer: true, greater_than: 0 }
  validates :children_count, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validate :checkout_after_checkin

  private

  def checkout_after_checkin
    return if check_in_date.blank? || check_out_date.blank? || check_out_date > check_in_date

    errors.add(:check_out_date, "must be after check-in date")
  end
end
