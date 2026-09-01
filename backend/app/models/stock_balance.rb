class StockBalance < ApplicationRecord
  belongs_to :inventory_item
  belongs_to :store

  validates :quantity_on_hand, numericality: true
end
