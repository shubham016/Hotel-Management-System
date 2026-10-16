class AddSupplyWorkflows < ActiveRecord::Migration[8.1]
  def change
    add_column :stock_balances, :inventory_value, :decimal, precision: 14, scale: 2, default: 0, null: false
    add_column :purchase_orders, :lock_version, :integer, default: 0, null: false
    add_column :purchase_orders, :creation_key, :string
    add_column :purchase_orders, :creation_digest, :string
    add_column :purchase_orders, :approved_at, :datetime
    add_column :purchase_orders, :cancelled_at, :datetime
    add_column :purchase_orders, :cancellation_reason, :text
    add_column :purchase_order_items, :received_quantity, :decimal, precision: 14, scale: 2, default: 0, null: false
    add_index :purchase_orders, %i[property_id creation_key], unique: true
    reversible do |dir|
      dir.up do
        execute "UPDATE stock_balances SET inventory_value = ROUND(stock_balances.quantity_on_hand * inventory_items.standard_cost, 2) FROM inventory_items WHERE inventory_items.id = stock_balances.inventory_item_id"
      end
    end
    create_table :purchase_receipts, id: :uuid do |t|
      t.references :purchase_order, type: :uuid, null: false, foreign_key: true
      t.references :store, type: :uuid, null: false, foreign_key: true
      t.references :user, type: :uuid, null: false, foreign_key: true
      t.string :receipt_number, :delivery_reference, :idempotency_key, :request_digest, null: false
      t.date :business_date, null: false
      t.text :notes
      t.timestamps
    end
    add_index :purchase_receipts, %i[purchase_order_id idempotency_key], unique: true, name: "purchase_receipt_retry_key"
    add_index :purchase_receipts, %i[purchase_order_id delivery_reference], unique: true, name: "purchase_delivery_reference"
    add_index :purchase_receipts, :receipt_number, unique: true
    create_table :stock_movements, id: :uuid do |t|
      t.references :property, :inventory_item, :user, type: :uuid, null: false, foreign_key: true
      t.references :source_store, type: :uuid, foreign_key: { to_table: :stores }
      t.references :destination_store, type: :uuid, foreign_key: { to_table: :stores }
      t.references :purchase_receipt, :purchase_order_item, type: :uuid, foreign_key: true
      t.string :kind, :document_number, :idempotency_key, :request_digest, null: false
      t.decimal :quantity, precision: 14, scale: 2, null: false
      t.decimal :unit_cost, precision: 16, scale: 4, null: false
      t.decimal :total_cost, precision: 14, scale: 2, null: false
      t.string :department
      t.text :notes
      t.date :business_date, null: false
      t.timestamps
    end
    add_index :stock_movements, %i[property_id idempotency_key], unique: true
    add_index :stock_movements, :document_number, unique: true
    add_check_constraint :stock_movements, "quantity > 0 AND unit_cost >= 0 AND total_cost >= 0", name: "valid_stock_movement_amounts"
    add_check_constraint :purchase_order_items, "received_quantity >= 0", name: "valid_received_quantity"
  end
end
