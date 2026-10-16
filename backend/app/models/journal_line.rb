class JournalLine < ApplicationRecord
  belongs_to :journal_entry
  belongs_to :account

  validates :debit, :credit, numericality: { greater_than_or_equal_to: 0 }
  validate do
    errors.add(:account, "must belong to the journal company") unless account&.company_id == journal_entry&.company_id
    errors.add(:base, "Enter either a debit or a credit") unless debit && credit && (debit.positive? != credit.positive?)
  end

  before_update :protect_posted_line
  before_destroy :protect_posted_line

  private

  def protect_posted_line
    original = JournalEntry.find_by(id: journal_entry_id_in_database)
    raise ActiveRecord::ReadOnlyRecord, "Posted journal lines cannot be changed" if original&.status == "POSTED"
  end
end
