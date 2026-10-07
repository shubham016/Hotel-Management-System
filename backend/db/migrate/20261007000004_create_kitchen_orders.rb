class CreateKitchenOrders < ActiveRecord::Migration[8.0]
  def change
    create_table :kitchen_orders, id: :uuid do |t|
      t.references :property, type: :uuid, null: false, foreign_key: true
      t.references :restaurant_table, type: :uuid, null: false, foreign_key: true
      t.references :user, type: :uuid, null: false, foreign_key: true
      t.string :ticket_number, null: false
      t.string :idempotency_key, null: false
      t.string :status, null: false, default: "PLACED"
      t.jsonb :items, null: false, default: []
      t.text :notes
      t.datetime :ready_at
      t.datetime :served_at
      t.datetime :settled_at
      t.timestamps
    end
    add_index :kitchen_orders, [:property_id, :idempotency_key], unique: true
    add_index :kitchen_orders, [:property_id, :ticket_number], unique: true
    add_index :kitchen_orders, [:property_id, :status]
  end
end
