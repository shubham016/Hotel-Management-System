class InventoryItem < ApplicationRecord
  belongs_to :company
  has_many :stock_balances, dependent: :restrict_with_error

  validates :item_code, :name, presence: true
  validates :item_code, uniqueness: { scope: :company_id }
end
