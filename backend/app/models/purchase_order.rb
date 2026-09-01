class PurchaseOrder < ApplicationRecord
  belongs_to :company
  belongs_to :property
  belongs_to :supplier, optional: true
  has_many :purchase_order_items, dependent: :destroy

  validates :po_number, :order_date, presence: true
end
