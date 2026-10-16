class StockMovement < ApplicationRecord
  belongs_to :property
  belongs_to :inventory_item
  belongs_to :user
  belongs_to :source_store, class_name: "Store", optional: true
  belongs_to :destination_store, class_name: "Store", optional: true
  belongs_to :purchase_receipt, optional: true
  belongs_to :purchase_order_item, optional: true
  validates :kind, inclusion: { in: %w[RECEIPT ISSUE TRANSFER] }
  validates :quantity, numericality: { greater_than: 0 }
  validates :unit_cost, :total_cost, numericality: { greater_than_or_equal_to: 0 }
  before_update { raise ActiveRecord::ReadOnlyRecord, "Stock movements cannot be edited" }
  before_destroy { raise ActiveRecord::ReadOnlyRecord, "Stock movements cannot be deleted" }
end
