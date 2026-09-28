class CreatePaymentRequests < ActiveRecord::Migration[8.0]
  def change
    create_table :payment_requests, id: :uuid do |t|
      t.references :folio, null: false, type: :uuid, foreign_key: true
      t.string :public_token, null: false
      t.string :kind, null: false
      t.string :status, null: false, default: "PENDING"
      t.decimal :amount, precision: 14, scale: 2, null: false
      t.string :gateway
      t.string :gateway_reference
      t.string :gateway_transaction_id
      t.string :gateway_url
      t.references :payment, type: :uuid, foreign_key: true
      t.datetime :expires_at, null: false
      t.timestamps
    end

    add_index :payment_requests, :public_token, unique: true
    add_index :payment_requests, [ :gateway, :gateway_reference ], unique: true, where: "gateway_reference IS NOT NULL"
    add_index :payment_requests, [ :gateway, :gateway_transaction_id ], unique: true, where: "gateway_transaction_id IS NOT NULL"
    add_check_constraint :payment_requests, "amount > 0", name: "payment_requests_positive_amount"
  end
end
