class Store < ApplicationRecord
  belongs_to :property
  has_many :stock_balances, dependent: :restrict_with_error

  validates :name, :code, presence: true
  validates :code, uniqueness: { scope: :property_id }
end
