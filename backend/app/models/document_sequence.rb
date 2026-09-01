class DocumentSequence < ApplicationRecord
  belongs_to :company
  belongs_to :property, optional: true

  validates :document_type, :year, presence: true
  validates :current_value, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
end
