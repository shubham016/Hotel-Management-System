class CreateStaffPayroll < ActiveRecord::Migration[8.1]
  def change
    add_column :staff_members, :monthly_salary, :decimal, precision: 14, scale: 2
    add_check_constraint :staff_members, "monthly_salary IS NULL OR monthly_salary >= 0", name: "staff_salary_nonnegative"
    create_table :payroll_configurations, id: :uuid do |t|
      t.references :property, type: :uuid, null: false, foreign_key: true, index: { unique: true }
      %i[expense payable deductions advances].each do |kind|
        t.references "#{kind}_account", type: :uuid, null: false, foreign_key: { to_table: :accounts }
      end
      t.timestamps
    end
    create_table :payroll_entries, id: :uuid do |t|
      t.references :property, type: :uuid, null: false, foreign_key: true
      t.references :staff_member, type: :uuid, null: false, foreign_key: true
      t.date :period, null: false
      t.string :employee_name, null: false
      t.string :department, null: false
      %i[base_salary earnings deductions advance_amount net_pay].each { |field| t.decimal field, precision: 14, scale: 2, null: false, default: 0 }
      t.string :status, null: false, default: "DRAFT"
      t.text :notes
      t.references :approval_journal, type: :uuid, foreign_key: { to_table: :journal_entries }, index: { unique: true }
      t.references :payment_journal, type: :uuid, foreign_key: { to_table: :journal_entries }, index: { unique: true }
      t.date :paid_on
      t.string :payment_method
      t.string :payment_reference
      t.timestamps
    end
    add_index :payroll_entries, [:staff_member_id, :period], unique: true
    add_check_constraint :payroll_entries, "base_salary >= 0 AND earnings >= 0 AND deductions >= 0 AND advance_amount >= 0 AND net_pay >= 0 AND net_pay = base_salary + earnings - deductions - advance_amount", name: "payroll_valid_amounts"
    add_check_constraint :payroll_entries, "status IN ('DRAFT', 'APPROVED', 'PAID')", name: "payroll_valid_status"
    create_table :payroll_advances, id: :uuid do |t|
      t.references :payroll_entry, type: :uuid, null: false, foreign_key: true
      t.references :journal_entry, type: :uuid, null: false, foreign_key: true, index: { unique: true }
      t.decimal :amount, precision: 14, scale: 2, null: false
      t.date :paid_on, null: false
      t.string :payment_method, null: false
      t.string :payment_reference
      t.string :request_key, null: false
      t.timestamps
    end
    add_index :payroll_advances, [:payroll_entry_id, :request_key], unique: true
    add_check_constraint :payroll_advances, "amount > 0", name: "payroll_advance_positive"
  end
end
