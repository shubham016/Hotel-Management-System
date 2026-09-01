class Supplier < ApplicationRecord
  belongs_to :company
  has_many :purchase_orders, dependent: :restrict_with_error

  validates :name, presence: true
end
