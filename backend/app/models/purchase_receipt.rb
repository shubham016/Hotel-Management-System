class PurchaseReceipt < ApplicationRecord
  belongs_to :purchase_order
  belongs_to :store
  belongs_to :user
  has_many :stock_movements, dependent: :restrict_with_exception
  has_one :supply_posting
  validates :receipt_number, :delivery_reference, :idempotency_key, :request_digest, presence: true
  before_update { raise ActiveRecord::ReadOnlyRecord, "Goods receipts cannot be edited" }
  before_destroy { raise ActiveRecord::ReadOnlyRecord, "Goods receipts cannot be deleted" }
end
