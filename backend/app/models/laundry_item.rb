class LaundryItem < ApplicationRecord
  belongs_to :property

  validates :name, presence: true
  validates :price, numericality: { greater_than_or_equal_to: 0 }
  validates :position, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
end
