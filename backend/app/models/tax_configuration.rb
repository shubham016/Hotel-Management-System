class TaxConfiguration < ApplicationRecord
  belongs_to :company

  validates :code, :name, :effective_from, presence: true
  validates :rate, numericality: { greater_than_or_equal_to: 0 }
  validates :code, uniqueness: { scope: %i[company_id effective_from] }

  scope :for_date, ->(date) { where("effective_from <= ? AND (effective_until IS NULL OR effective_until >= ?)", date, date) }
  scope :for_rooms, -> { where(active: true, applies_to_rooms: true).order(:calculation_order) }
end
