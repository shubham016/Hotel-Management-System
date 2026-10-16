class InventoryItem < ApplicationRecord
  belongs_to :company
  has_many :stock_balances, dependent: :restrict_with_error

  validates :item_code, :name, :unit_of_measure, presence: true
  validates :standard_cost, :min_reorder_level, numericality: { greater_than_or_equal_to: 0 }
  validates :item_code, uniqueness: { scope: :company_id }
end
