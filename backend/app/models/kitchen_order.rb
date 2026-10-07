class KitchenOrder < ApplicationRecord
  belongs_to :property
  belongs_to :restaurant_table
  belongs_to :user

  validates :status, inclusion: { in: %w[PLACED PREPARING READY SERVED] }
  validates :ticket_number, :idempotency_key, :items, presence: true

  scope :unsettled, -> { where(settled_at: nil) }

  def portal_json
    restaurant = restaurant_table.restaurant
    { id:, number: ticket_number, tableId: restaurant_table_id, table: restaurant_table.table_number,
      outlet: restaurant.name, outletCode: restaurant.outlet_code, server: user.full_name,
      createdAt: created_at.iso8601, status:, notes:, items: }
  end
end
