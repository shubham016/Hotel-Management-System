class AddPayrollArchiving < ActiveRecord::Migration[8.1]
  def change
    add_column :payroll_entries, :archived_at, :datetime
    add_check_constraint :payroll_entries, "archived_at IS NULL OR status = 'PAID'", name: "payroll_archive_paid_only"
  end
end
