class AddPaymentIdempotencyKey < ActiveRecord::Migration[8.0]
  def change
    add_column :payments, :idempotency_key, :string
    add_index :payments, :idempotency_key, unique: true, where: "idempotency_key IS NOT NULL"
    add_column :payment_requests, :public_checkout, :boolean, null: false, default: false
  end
end
