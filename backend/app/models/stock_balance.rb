class StockBalance < ApplicationRecord
  belongs_to :inventory_item
  belongs_to :store

  validates :quantity_on_hand, :inventory_value, numericality: { greater_than_or_equal_to: 0 }
  validate do
    errors.add(:inventory_item, "must belong to the store's company") if inventory_item && store && inventory_item.company_id != store.property.company_id
  end
end
