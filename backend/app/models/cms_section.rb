class CmsSection < ApplicationRecord
  belongs_to :cms_page

  validates :section_key, presence: true, uniqueness: { scope: :cms_page_id }
end
