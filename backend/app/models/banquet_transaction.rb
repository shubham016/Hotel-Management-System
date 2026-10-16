class BanquetTransaction < ApplicationRecord
  KINDS = %w[RECEIPT REFUND SETTLEMENT CANCELLATION LEGACY_LINK].freeze
  belongs_to :banquet_booking
  belongs_to :journal_entry, optional: true
  belongs_to :account, optional: true
  belongs_to :user
  validates :kind, inclusion: { in: KINDS }
  validates :amount, numericality: { greater_than_or_equal_to: 0 }
  validates :idempotency_key, :request_digest, :document_number, :business_date, presence: true
  before_update { raise ActiveRecord::ReadOnlyRecord, "Banquet transactions cannot be edited" }
  before_destroy { raise ActiveRecord::ReadOnlyRecord, "Banquet transactions cannot be deleted" }
end
