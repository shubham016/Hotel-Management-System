class AddPayrollTds < ActiveRecord::Migration[8.1]
  def up
    # Historical records keep their original net salary and journal amounts.
    add_column :payroll_entries, :tds_rate, :decimal, precision: 5, scale: 2
    add_column :payroll_entries, :tds_amount, :decimal, precision: 14, scale: 2, null: false, default: 0
    add_column :payroll_entries, :tds_reason, :text
    add_reference :payroll_configurations, :tds_account, type: :uuid, foreign_key: { to_table: :accounts }
    remove_check_constraint :payroll_entries, name: "payroll_valid_amounts"
    add_check_constraint :payroll_entries, "base_salary >= 0 AND earnings >= 0 AND deductions >= 0 AND advance_amount >= 0 AND tds_amount >= 0 AND net_pay >= 0 AND net_pay = base_salary + earnings - deductions - advance_amount - tds_amount", name: "payroll_valid_amounts"
    add_check_constraint :payroll_entries, "tds_rate IS NULL OR (tds_rate >= 0 AND tds_rate <= 100)", name: "payroll_tds_rate_valid"
    add_check_constraint :payroll_entries, "tds_amount = CASE WHEN tds_rate IS NULL THEN 0 ELSE round((base_salary + earnings) * tds_rate / 100, 2) END", name: "payroll_tds_amount_valid"
  end

  def down
    raise ActiveRecord::IrreversibleMigration, "Removing TDS would change recorded salary amounts"
  end
end
