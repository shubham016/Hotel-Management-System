class Payment < ApplicationRecord
  METHODS = %w[CASH CARD FONEPAY ESEWA KHALTI BANK_TRANSFER OTA CREDIT_NOTE].freeze

  belongs_to :folio
  before_validation on: :create do
    if folio
      BusinessDays::Context.ensure_cashier_open!(folio.property)
      self.business_date ||= folio.property.operating_date
    end
  end

  validates :receipt_number, presence: true, uniqueness: true
  validates :payment_method, inclusion: { in: METHODS }
  validates :amount, numericality: { greater_than: 0 }
end
