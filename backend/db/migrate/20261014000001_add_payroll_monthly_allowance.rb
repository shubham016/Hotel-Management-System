class AddPayrollMonthlyAllowance < ActiveRecord::Migration[8.1]
  def up
    # Historical payroll retains its original base, gross, net and journal amounts.
    add_column :payroll_entries, :monthly_allowance, :decimal, precision: 14, scale: 2, null: false, default: 0
    remove_check_constraint :payroll_entries, name: "payroll_valid_amounts"
    add_check_constraint :payroll_entries, "base_salary >= 0 AND monthly_allowance >= 0 AND earnings >= 0 AND deductions >= 0 AND advance_amount >= 0 AND tds_amount >= 0 AND net_pay >= 0 AND net_pay = base_salary + monthly_allowance + earnings - deductions - advance_amount - tds_amount", name: "payroll_valid_amounts"
    remove_check_constraint :payroll_entries, name: "payroll_tds_amount_valid"
    add_check_constraint :payroll_entries, "tds_amount = CASE WHEN tds_rate IS NULL THEN 0 ELSE round((base_salary + monthly_allowance + earnings) * tds_rate / 100, 2) END", name: "payroll_tds_amount_valid"
  end

  def down
    raise ActiveRecord::IrreversibleMigration, "Removing allowance components would change recorded salary amounts"
  end
end
