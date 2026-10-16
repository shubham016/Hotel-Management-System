class AddSupplierBilling < ActiveRecord::Migration[8.1]
  def change
    add_column :properties, :supply_opening_review_required, :boolean, default: false, null: false
    reversible do |dir|
      dir.up { execute "UPDATE properties SET supply_opening_review_required = TRUE WHERE id IN (SELECT stores.property_id FROM stock_balances JOIN stores ON stores.id = stock_balances.store_id WHERE stock_balances.quantity_on_hand <> 0 OR stock_balances.inventory_value <> 0)" }
    end
    create_table :supply_postings, id: :uuid do |t|
      t.references :property, :user, type: :uuid, null: false, foreign_key: true
      t.references :purchase_receipt, :stock_movement, :journal_entry, type: :uuid, foreign_key: true, index: { unique: true }
      t.string :kind, :idempotency_key, :request_digest, null: false
      t.text :reason
      t.jsonb :snapshot, default: {}, null: false
      t.timestamps
    end
    add_index :supply_postings, %i[property_id idempotency_key], unique: true
    create_table :supplier_invoices, id: :uuid do |t|
      t.references :company, :property, :supplier, :purchase_order, :user, type: :uuid, null: false, foreign_key: true
      t.references :journal_entry, :reversal_journal, type: :uuid, foreign_key: { to_table: :journal_entries }
      t.string :document_number, :invoice_reference, :creation_key, :creation_digest, null: false
      t.string :status, null: false, default: "DRAFT"
      t.date :invoice_date, :due_date, null: false
      t.decimal :sub_total, :tax_amount, :grand_total, :declared_total, :total_paid, precision: 14, scale: 2, default: 0, null: false
      t.decimal :tax_rate, precision: 7, scale: 4, default: 0, null: false
      t.integer :lock_version, default: 0, null: false
      t.text :notes, :void_reason
      t.datetime :posted_at, :voided_at
      t.timestamps
    end
    add_index :supplier_invoices, :document_number, unique: true
    add_index :supplier_invoices, %i[property_id creation_key], unique: true
    add_index :supplier_invoices, %i[company_id supplier_id invoice_reference], unique: true, where: "status <> 'VOID'", name: "supplier_invoice_number_once"
    create_table :supplier_invoice_lines, id: :uuid do |t|
      t.references :supplier_invoice, :stock_movement, type: :uuid, null: false, foreign_key: true
      t.decimal :quantity, :unit_price, :line_total, :received_cost, precision: 14, scale: 2, null: false, default: 0
      t.timestamps
    end
    add_index :supplier_invoice_lines, %i[supplier_invoice_id stock_movement_id], unique: true, name: "one_receipt_line_per_bill"
    create_table :supplier_payments, id: :uuid do |t|
      t.references :supplier_invoice, :property, :account, :user, :journal_entry, type: :uuid, null: false, foreign_key: true
      t.string :document_number, :payment_method, :idempotency_key, :request_digest, null: false
      t.string :transaction_reference
      t.decimal :amount, precision: 14, scale: 2, null: false
      t.date :business_date, null: false
      t.timestamps
    end
    add_index :supplier_payments, :document_number, unique: true
    add_index :supplier_payments, %i[property_id idempotency_key], unique: true
    add_index :supplier_payments, %i[property_id transaction_reference], unique: true, where: "payment_method = 'BANK_TRANSFER'", name: "supplier_transfer_once"
    add_check_constraint :supplier_invoices, "grand_total >= 0 AND total_paid >= 0 AND total_paid <= grand_total AND tax_amount >= 0", name: "valid_supplier_invoice_balances"
    add_check_constraint :supplier_payments, "amount > 0", name: "positive_supplier_payment"
    add_check_constraint :supplier_invoice_lines, "quantity > 0 AND unit_price >= 0 AND line_total >= 0 AND received_cost >= 0", name: "valid_supplier_invoice_line"
  end
end
