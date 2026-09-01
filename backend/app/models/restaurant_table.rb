class RestaurantTable < ApplicationRecord
  belongs_to :restaurant

  validates :table_number, presence: true, uniqueness: { scope: :restaurant_id }
end
