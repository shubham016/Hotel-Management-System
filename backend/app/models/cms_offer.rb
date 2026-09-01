class CmsOffer < ApplicationRecord
  belongs_to :property

  validates :title, :code, :valid_from, :valid_until, presence: true
  validates :code, uniqueness: { scope: :property_id }
end
