class SupplierInvoice < ApplicationRecord
  belongs_to :company
  belongs_to :property
  belongs_to :supplier
  belongs_to :purchase_order
  belongs_to :user
  belongs_to :journal_entry, optional: true
  belongs_to :reversal_journal, class_name: "JournalEntry", optional: true
  has_many :supplier_invoice_lines, dependent: :restrict_with_exception
  has_many :supplier_payments, dependent: :restrict_with_exception
  validates :status, inclusion: { in: %w[DRAFT POSTED PAID VOID] }
  validates :invoice_reference, :invoice_date, :due_date, :document_number, presence: true
  before_update do
    if status_was.in?(%w[POSTED PAID VOID]) && (changed_attribute_names_to_save - %w[status total_paid void_reason voided_at reversal_journal_id updated_at lock_version]).any?
      raise ActiveRecord::ReadOnlyRecord, "Posted supplier invoice details cannot be edited"
    end
  end
  before_destroy { raise ActiveRecord::ReadOnlyRecord, "Supplier invoices cannot be deleted" }
end
