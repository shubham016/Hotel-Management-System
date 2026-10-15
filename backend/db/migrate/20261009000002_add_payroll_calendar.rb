class AddPayrollCalendar < ActiveRecord::Migration[8.1]
  def change
    # Preserve existing Gregorian payroll periods; new BS periods are explicitly
    # marked by the controller and stored as their exact Gregorian start date.
    add_column :payroll_entries, :period_calendar, :string, null: false, default: "AD"
    remove_index :payroll_entries, [:staff_member_id, :period]
    add_index :payroll_entries, [:staff_member_id, :period_calendar, :period], unique: true, name: "index_payroll_employee_calendar_period"
    add_check_constraint :payroll_entries, "period_calendar IN ('AD', 'BS')", name: "payroll_calendar_valid"
  end
end
