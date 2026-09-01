class Restaurant < ApplicationRecord
  belongs_to :property
  has_many :restaurant_tables, dependent: :destroy

  validates :name, :outlet_code, presence: true
  validates :outlet_code, uniqueness: { scope: :property_id }
end
