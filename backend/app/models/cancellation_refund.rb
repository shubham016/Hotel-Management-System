class CancellationRefund < ApplicationRecord
  PAYOUT_METHODS = %w[CASH BANK_TRANSFER ESEWA KHALTI CARD FONEPAY].freeze
  belongs_to :folio
  before_validation do
    if status == "PAID" && status_changed?
      BusinessDays::Context.ensure_cashier_open!(folio.property)
      self.business_date ||= folio.property.operating_date
    end
  end
  validates :folio_id, uniqueness: true
  validates :status, inclusion: { in: %w[PENDING PAID] }
  validates :paid_amount, numericality: { greater_than: 0 }
  validates :deduction_amount, :refund_amount, numericality: { greater_than_or_equal_to: 0 }
  validates :payment_method, inclusion: { in: PAYOUT_METHODS }, if: -> { status == "PAID" }
  validates :paid_at, :transaction_reference, presence: true, if: -> { status == "PAID" }
end
