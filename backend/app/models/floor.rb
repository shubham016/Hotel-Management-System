class Floor < ApplicationRecord
  belongs_to :property

  validates :number, numericality: { only_integer: true, greater_than: 0 }, uniqueness: { scope: :property_id }
  validates :name, presence: true
end
