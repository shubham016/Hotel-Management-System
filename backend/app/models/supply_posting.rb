class SupplyPosting < ApplicationRecord
  belongs_to :property
  belongs_to :user
  belongs_to :purchase_receipt, optional: true
  belongs_to :stock_movement, optional: true
  belongs_to :journal_entry, optional: true
  before_update { raise ActiveRecord::ReadOnlyRecord, "Supply postings cannot be edited" }
  before_destroy { raise ActiveRecord::ReadOnlyRecord, "Supply postings cannot be deleted" }
end
