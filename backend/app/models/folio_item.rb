class FolioItem < ApplicationRecord
  belongs_to :folio

  validates :source_module, :description, presence: true
  validates :quantity, numericality: { greater_than: 0 }
end
