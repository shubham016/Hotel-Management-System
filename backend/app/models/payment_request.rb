class PaymentRequest < ApplicationRecord
  KINDS = %w[ADVANCE CHECKOUT].freeze
  STATUSES = %w[PENDING INITIATED COMPLETED FAILED].freeze
  GATEWAYS = %w[ESEWA KHALTI].freeze

  belongs_to :folio
  belongs_to :payment, optional: true

  validates :public_token, presence: true, uniqueness: true
  validates :kind, inclusion: { in: KINDS }
  validates :status, inclusion: { in: STATUSES }
  validates :gateway, inclusion: { in: GATEWAYS }, allow_nil: true
  validates :amount, numericality: { greater_than: 0 }

  def expired?
    expires_at <= Time.current
  end
end
