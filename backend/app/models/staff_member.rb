class StaffMember < ApplicationRecord
  belongs_to :property
  has_many :payroll_entries, dependent: :restrict_with_error
  validates :monthly_salary, numericality: { greater_than_or_equal_to: 0, less_than: 1_000_000_000_000 }, allow_nil: true

  validates :name, :department, presence: true
  validates :position, numericality: { only_integer: true, greater_than_or_equal_to: 0 }

  def basic_salary
    (monthly_salary * BigDecimal("0.60")).round(2, BigDecimal::ROUND_HALF_UP) if monthly_salary
  end

  def monthly_allowance
    monthly_salary - basic_salary if monthly_salary
  end
end
