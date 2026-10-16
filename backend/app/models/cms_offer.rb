class CmsOffer < ApplicationRecord
  belongs_to :property

  validates :title, :code, :valid_from, :valid_until, presence: true
  validates :code, uniqueness: { scope: :property_id }
  validates :discount_pct, numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 100 }
  validates :price_starting_at, numericality: { greater_than_or_equal_to: 0 }
  validate do
    errors.add(:valid_until, "must be on or after the start date") if valid_from && valid_until && valid_until < valid_from
  end
end
