class Account < ApplicationRecord
  CATEGORIES = %w[ASSET LIABILITY EQUITY REVENUE EXPENSE COST_OF_SALES].freeze

  belongs_to :company
  has_many :journal_lines, dependent: :restrict_with_error

  validates :account_code, :name, presence: true
  validates :account_code, uniqueness: { scope: :company_id }
  validates :category, inclusion: { in: CATEGORIES }

  # This chart has no account subtype; use the cash/bank names configured in it.
  def cash_or_bank?
    category == "ASSET" && name.match?(/\b(?:cash|bank)\b/i) && !name.match?(/\b(?:receivable|advance)\b/i)
  end
end
