class PurchaseOrder < ApplicationRecord
  belongs_to :company
  belongs_to :property
  belongs_to :supplier, optional: true
  has_many :purchase_order_items, dependent: :destroy
  has_many :purchase_receipts, dependent: :restrict_with_exception
  has_many :supplier_invoices, dependent: :restrict_with_exception

  validates :po_number, :order_date, presence: true
end
