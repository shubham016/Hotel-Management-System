class MenuItem < ApplicationRecord
  belongs_to :restaurant

  validates :name, :category, presence: true
  validates :price, numericality: { greater_than: 0 }

  scope :active, -> { where(active: true) }
end
