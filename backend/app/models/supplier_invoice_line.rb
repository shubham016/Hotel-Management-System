class SupplierInvoiceLine < ApplicationRecord
  belongs_to :supplier_invoice
  belongs_to :stock_movement
  before_update { raise ActiveRecord::ReadOnlyRecord, "Posted supplier invoice lines cannot be edited" unless supplier_invoice.status == "DRAFT" }
  before_destroy do
    raise ActiveRecord::ReadOnlyRecord, "Posted invoice lines cannot be deleted" unless supplier_invoice.status == "DRAFT"
  end
end
