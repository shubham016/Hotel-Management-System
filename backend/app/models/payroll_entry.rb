class PayrollEntry < ApplicationRecord
  belongs_to :property
  belongs_to :staff_member
  belongs_to :approval_journal, class_name: "JournalEntry", optional: true
  belongs_to :payment_journal, class_name: "JournalEntry", optional: true
  has_many :payroll_advances, dependent: :restrict_with_error
  scope :visible, -> { where(archived_at: nil) }
  before_validation :calculate_draft_totals, if: -> { status == "DRAFT" }
  validates :period, :employee_name, :department, presence: true
  validates :period_calendar, inclusion: { in: %w[AD BS] }
  validates :status, inclusion: { in: %w[DRAFT APPROVED PAID] }
  validates :base_salary, :monthly_allowance, :earnings, :deductions, :advance_amount, :tds_amount, :net_pay, numericality: { greater_than_or_equal_to: 0, less_than: 1_000_000_000_000 }
  validates :tds_rate, numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 100 }, allow_nil: true
  validates :tds_reason, length: { maximum: 2000 }
  validate do
    errors.add(:archived_at, "can only be set for paid payroll") if archived_at.present? && status != "PAID"
    errors.add(:staff_member, "must belong to this property") unless staff_member&.property_id == property_id
    errors.add(:net_pay, "must equal gross salary less TDS, other deductions, and advances") unless net_pay == gross_salary - deductions - advance_amount - tds_amount
    errors.add(:tds_amount, "must match the saved rate and gross salary") unless tds_amount == calculated_tds
    errors.add(:base, "Gross salary exceeds the maximum supported amount") if gross_salary >= 1_000_000_000_000
    if period
      if period_calendar == "BS"
        begin
          errors.add(:period, "must be the first day of a BS month") unless Calendars::BikramSambat.ad_to_bs(period)[:day] == 1
        rescue ArgumentError => error
          errors.add(:period, error.message)
        end
      elsif period.day != 1
        errors.add(:period, "must be the first day of the AD month")
      end
    end
  end

  def gross_salary
    base_salary + monthly_allowance + earnings
  end

  def calculated_tds
    (gross_salary * (tds_rate || 0) / 100).round(2, BigDecimal::ROUND_HALF_UP)
  end

  def tds_review_required?
    status == "DRAFT" && tds_rate.nil?
  end

  def tds_fiscal_year
    bs = Calendars::BikramSambat.ad_to_bs(period)
    bs[:month] >= 4 ? bs[:year] : bs[:year] - 1
  rescue ArgumentError
    nil
  end

  def calculate_draft_totals
    self.tds_amount = calculated_tds
    self.net_pay = gross_salary - deductions - advance_amount - tds_amount
  end

  def period_details
    if period_calendar == "BS"
      Calendars::BikramSambat.month(Calendars::BikramSambat.iso(period).first(7))
    else
      { system: "AD", period: period.strftime("%Y-%m"), label: period.strftime("%B %Y AD"), start_ad: period.iso8601, end_ad: period.end_of_month.iso8601 }
    end
  end
end
