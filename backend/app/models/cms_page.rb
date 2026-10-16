class CmsPage < ApplicationRecord
  belongs_to :company
  belongs_to :property, optional: true
  has_many :cms_sections, dependent: :destroy

  validates :slug, :title, presence: true
  validates :slug, uniqueness: { scope: %i[company_id property_id] }
  validate do
    errors.add(:property, "must belong to the page company") if property && property.company_id != company_id
  end
end
