class CmsPage < ApplicationRecord
  belongs_to :company
  belongs_to :property, optional: true
  has_many :cms_sections, dependent: :destroy

  validates :slug, :title, presence: true
  validates :slug, uniqueness: { scope: :company_id }
end
