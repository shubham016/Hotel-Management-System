class AddBusinessDayClosing < ActiveRecord::Migration[8.1]
  def change
    add_column :properties, :business_date, :date
    add_column :payments, :business_date, :date
    add_column :cancellation_refunds, :business_date, :date
    add_reference :journal_entries, :property, type: :uuid, foreign_key: true
    add_column :journal_entries, :payment_method, :string
    add_index :payments, :business_date
    create_table :cashier_closings, id: :uuid do |t|
      t.references :property, null: false, type: :uuid, foreign_key: true
      t.references :closed_by, null: false, type: :uuid, foreign_key: { to_table: :users }
      t.date :business_date, null: false
      t.string :status, null: false, default: "CLOSED"
      t.decimal :opening_cash, :expected_cash, :counted_cash, :variance, precision: 14, scale: 2, null: false
      t.text :notes
      t.jsonb :snapshot, null: false, default: {}
      t.datetime :reopened_at
      t.text :reopen_reason
      t.timestamps
    end
    add_index :cashier_closings, %i[property_id business_date], unique: true, where: "status = 'CLOSED'", name: "one_closed_cashier_per_property_day"
    create_table :business_day_closings, id: :uuid do |t|
      t.references :property, null: false, type: :uuid, foreign_key: true
      t.references :closed_by, null: false, type: :uuid, foreign_key: { to_table: :users }
      t.references :cashier_closing, null: false, type: :uuid, foreign_key: true
      t.date :business_date, :next_business_date, null: false
      t.jsonb :snapshot, null: false, default: {}
      t.timestamps
    end
    add_index :business_day_closings, %i[property_id business_date], unique: true
  end
end
