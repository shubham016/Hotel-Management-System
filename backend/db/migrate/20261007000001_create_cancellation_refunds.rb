class CreateCancellationRefunds < ActiveRecord::Migration[8.0]
  def change
    create_table :cancellation_refunds, id: :uuid do |t|
      t.references :folio, type: :uuid, null: false, foreign_key: true, index: { unique: true }
      t.decimal :paid_amount, precision: 14, scale: 2, null: false
      t.decimal :deduction_amount, precision: 14, scale: 2, null: false
      t.decimal :refund_amount, precision: 14, scale: 2, null: false
      t.string :status, null: false, default: "PENDING"
      t.string :payment_method
      t.string :transaction_reference
      t.datetime :paid_at
      t.timestamps
    end
    add_check_constraint :cancellation_refunds, "paid_amount > 0 AND deduction_amount >= 0 AND refund_amount >= 0 AND paid_amount = deduction_amount + refund_amount", name: "cancellation_refund_amounts"
    add_check_constraint :cancellation_refunds, "status IN ('PENDING', 'PAID')", name: "cancellation_refund_status"
  end
end
