class RestaurantTable < ApplicationRecord
  belongs_to :restaurant
  has_many :kitchen_orders, dependent: :restrict_with_error

  validates :table_number, presence: true, uniqueness: { scope: :restaurant_id }
end
