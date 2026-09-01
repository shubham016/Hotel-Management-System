class PurchaseOrderItem < ApplicationRecord
  belongs_to :purchase_order
  belongs_to :inventory_item, optional: true

  validates :description, presence: true
end
