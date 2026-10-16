class SupplierPayment < ApplicationRecord
  belongs_to :supplier_invoice
  belongs_to :property
  belongs_to :account
  belongs_to :user
  belongs_to :journal_entry
  before_update { raise ActiveRecord::ReadOnlyRecord, "Supplier payments cannot be edited" }
  before_destroy { raise ActiveRecord::ReadOnlyRecord, "Supplier payments cannot be deleted" }
end
