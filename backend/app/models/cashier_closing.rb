class CashierClosing < ApplicationRecord
  belongs_to :property
  belongs_to :closed_by, class_name: "User"
  validates :business_date, presence: true
  validates :status, inclusion: { in: %w[CLOSED REOPENED] }
  validates :opening_cash, :expected_cash, :counted_cash, numericality: { greater_than_or_equal_to: 0 }
  before_update do
    unless status_was == "CLOSED" && status == "REOPENED" && (changed_attribute_names_to_save - %w[status reopened_at reopen_reason updated_at]).empty?
      raise ActiveRecord::ReadOnlyRecord, "Cashier reconciliation records cannot be changed"
    end
  end
  before_destroy { raise ActiveRecord::ReadOnlyRecord, "Cashier reconciliation records cannot be deleted" }
end
