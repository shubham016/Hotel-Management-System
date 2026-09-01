class Payment < ApplicationRecord
  METHODS = %w[CASH CARD FONEPAY ESEWA KHALTI BANK_TRANSFER OTA CREDIT_NOTE].freeze

  belongs_to :folio

  validates :receipt_number, presence: true, uniqueness: true
  validates :payment_method, inclusion: { in: METHODS }
  validates :amount, numericality: { greater_than: 0 }
end
