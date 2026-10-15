class JournalEntry < ApplicationRecord
  belongs_to :company
  belongs_to :property, optional: true

  before_update :forbid_posted_mutation
  before_destroy :forbid_posted_destroy

  has_many :journal_lines, dependent: :restrict_with_exception

  validates :voucher_number, presence: true, uniqueness: true
  validates :payment_method, inclusion: { in: Payment::METHODS }, allow_nil: true
  validates :payment_method, inclusion: { in: Payment::METHODS }, allow_nil: true

  private

  # Reversal workflow (posting a balanced offsetting entry instead of editing/deleting)
  # is Phase 5 scope (docs/plans/IMPLEMENTATION_PLAN_v3.0_OWNER_PORTAL.md) — for now a
  # posted entry is simply immutable.
  def forbid_posted_mutation
    return unless status_was == "POSTED"

    changed_financial_fields = (changed_attribute_names_to_save - %w[updated_at]).any?
    raise ActiveRecord::ReadOnlyRecord, "Posted journal entries cannot be edited" if changed_financial_fields
  end

  def forbid_posted_destroy
    raise ActiveRecord::ReadOnlyRecord, "Posted journal entries cannot be deleted" if status == "POSTED"
  end
end
