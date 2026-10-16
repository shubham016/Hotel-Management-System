class AddBanquetFinancialWorkflow < ActiveRecord::Migration[8.1]
  def change
    add_column :banquet_bookings, :lock_version, :integer, default: 0, null: false
    add_column :banquet_bookings, :creation_key, :string
    add_column :banquet_bookings, :creation_digest, :string
    add_column :banquet_bookings, :legacy_advance, :decimal, precision: 14, scale: 2, default: 0, null: false
    add_column :banquet_bookings, :tax_amount, :decimal, precision: 14, scale: 2, default: 0, null: false
    add_column :banquet_bookings, :hall_net, :decimal, precision: 14, scale: 2, default: 0, null: false
    add_column :banquet_bookings, :catering_net, :decimal, precision: 14, scale: 2, default: 0, null: false
    add_column :banquet_bookings, :tax_snapshot, :jsonb, default: {}, null: false
    add_column :banquet_bookings, :cancellation_fee, :decimal, precision: 14, scale: 2, default: 0, null: false
    add_column :banquet_bookings, :cancelled_at, :datetime
    add_column :banquet_bookings, :completed_at, :datetime
    add_column :banquet_bookings, :cancellation_reason, :text
    add_index :banquet_bookings, %i[property_id creation_key], unique: true
    reversible do |dir|
      dir.up { execute "UPDATE banquet_bookings SET legacy_advance = advance_paid, hall_net = hall_charge, catering_net = catering_charge" }
    end
    create_table :banquet_transactions, id: :uuid do |t|
      t.references :banquet_booking, type: :uuid, null: false, foreign_key: true
      t.references :journal_entry, type: :uuid, foreign_key: true, index: { unique: true }
      t.references :account, type: :uuid, foreign_key: true
      t.references :user, type: :uuid, null: false, foreign_key: true
      t.string :kind, :idempotency_key, :request_digest, :document_number, null: false
      t.decimal :amount, precision: 14, scale: 2, null: false
      t.string :payment_method, :transaction_reference
      t.text :reason
      t.date :business_date, null: false
      t.timestamps
    end
    add_index :banquet_transactions, %i[banquet_booking_id idempotency_key], unique: true, name: "banquet_transaction_retry_key"
    add_index :banquet_transactions, :document_number, unique: true
    add_check_constraint :banquet_transactions, "amount >= 0", name: "banquet_nonnegative_transaction"
    add_check_constraint :banquet_bookings, "advance_paid >= 0 AND legacy_advance >= 0 AND cancellation_fee >= 0 AND tax_amount >= 0", name: "banquet_nonnegative_balances"
  end
end
