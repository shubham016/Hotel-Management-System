class BanquetBooking < ApplicationRecord
  belongs_to :property
  belongs_to :banquet_hall
  belongs_to :guest
  has_many :banquet_transactions, dependent: :restrict_with_exception

  def refund_due
    status == "CANCELLED" ? [advance_paid - cancellation_fee, 0.to_d].max : 0.to_d
  end

  def balance_due
    status == "CANCELLED" ? 0.to_d : [grand_total - advance_paid, 0.to_d].max
  end

  validates :booking_ref, :event_name, presence: true
  validates :start_date_time, :end_date_time, presence: true
  validates :pax_count, numericality: { only_integer: true, greater_than: 0 }
  validates :hall_charge, :catering_charge, :grand_total, :advance_paid,
    numericality: { greater_than_or_equal_to: 0 }
  validate :valid_event

  private

  def valid_event
    errors.add(:end_date_time, "must follow the start") if start_date_time && end_date_time && end_date_time < start_date_time
    errors.add(:pax_count, "exceeds the hall capacity") if banquet_hall && pax_count && pax_count > banquet_hall.theater_capacity
    errors.add(:advance_paid, "cannot exceed the event total") if advance_paid && grand_total && advance_paid > grand_total
    errors.add(:banquet_hall, "must belong to this property") if banquet_hall && banquet_hall.property_id != property_id
    errors.add(:guest, "must belong to this company") if guest && property && guest.company_id != property.company_id
  end
end
