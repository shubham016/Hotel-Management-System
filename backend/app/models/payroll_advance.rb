class PayrollAdvance < ApplicationRecord
  belongs_to :payroll_entry
  belongs_to :journal_entry
  validates :amount, numericality: { greater_than: 0 }
  validates :paid_on, :payment_method, :request_key, presence: true
end
