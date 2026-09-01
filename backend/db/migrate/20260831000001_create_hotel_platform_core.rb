class CreateHotelPlatformCore < ActiveRecord::Migration[8.1]
  def change
    enable_extension "pgcrypto"

    create_table :companies, id: :uuid do |t|
      t.string :name, null: false
      t.string :slug, null: false
      t.string :currency_code, null: false, default: "NPR"
      t.string :timezone, null: false, default: "Asia/Kathmandu"
      t.boolean :active, null: false, default: true
      t.timestamps
    end
    add_index :companies, :slug, unique: true

    create_table :properties, id: :uuid do |t|
      t.references :company, null: false, foreign_key: true, type: :uuid
      t.string :name, null: false
      t.string :code, null: false
      t.string :address
      t.string :city
      t.string :country, null: false, default: "Nepal"
      t.string :phone
      t.string :email
      t.string :check_in_time, null: false, default: "14:00"
      t.string :check_out_time, null: false, default: "12:00"
      t.boolean :active, null: false, default: true
      t.timestamps
    end
    add_index :properties, %i[company_id code], unique: true
    add_index :properties, :code, unique: true

    create_table :roles, id: :uuid do |t|
      t.references :company, null: false, foreign_key: true, type: :uuid
      t.string :name, null: false
      t.jsonb :permissions, null: false, default: {}
      t.boolean :system, null: false, default: false
      t.timestamps
    end
    add_index :roles, %i[company_id name], unique: true

    create_table :users, id: :uuid do |t|
      t.references :company, null: false, foreign_key: true, type: :uuid
      t.references :role, null: false, foreign_key: true, type: :uuid
      t.string :email, null: false
      t.string :password_digest, null: false
      t.string :first_name, null: false
      t.string :last_name, null: false
      t.boolean :active, null: false, default: true
      t.datetime :last_login_at
      t.timestamps
    end
    add_index :users, "lower(email)", unique: true, name: "index_users_on_lower_email"

    create_table :user_properties, id: :uuid do |t|
      t.references :user, null: false, foreign_key: true, type: :uuid
      t.references :property, null: false, foreign_key: true, type: :uuid
      t.timestamps
    end
    add_index :user_properties, %i[user_id property_id], unique: true

    create_table :tax_configurations, id: :uuid do |t|
      t.references :company, null: false, foreign_key: true, type: :uuid
      t.string :code, null: false
      t.string :name, null: false
      t.decimal :rate, precision: 7, scale: 4, null: false
      t.boolean :inclusive, null: false, default: false
      t.boolean :applies_to_rooms, null: false, default: true
      t.integer :calculation_order, null: false, default: 1
      t.date :effective_from, null: false
      t.date :effective_until
      t.boolean :active, null: false, default: true
      t.timestamps
    end
    add_index :tax_configurations, %i[company_id code effective_from], unique: true, name: "index_tax_configurations_on_scope"

    create_table :room_types, id: :uuid do |t|
      t.references :property, null: false, foreign_key: true, type: :uuid
      t.string :name, null: false
      t.string :code, null: false
      t.string :slug, null: false
      t.text :description
      t.decimal :base_price, precision: 12, scale: 2, null: false
      t.integer :max_adults, null: false, default: 2
      t.integer :max_children, null: false, default: 1
      t.integer :max_occupancy, null: false, default: 3
      t.jsonb :amenities, null: false, default: []
      t.boolean :active, null: false, default: true
      t.timestamps
    end
    add_index :room_types, %i[property_id code], unique: true
    add_index :room_types, %i[property_id slug], unique: true

    create_table :rooms, id: :uuid do |t|
      t.references :property, null: false, foreign_key: true, type: :uuid
      t.references :room_type, null: false, foreign_key: true, type: :uuid
      t.string :room_number, null: false
      t.integer :floor, null: false, default: 1
      t.string :status, null: false, default: "VACANT_CLEAN"
      t.boolean :active, null: false, default: true
      t.boolean :smoking, null: false, default: false
      t.boolean :accessible, null: false, default: false
      t.timestamps
    end
    add_index :rooms, %i[property_id room_number], unique: true
    add_index :rooms, %i[property_id status]

    create_table :rate_plans, id: :uuid do |t|
      t.references :property, null: false, foreign_key: true, type: :uuid
      t.references :room_type, null: false, foreign_key: true, type: :uuid
      t.string :name, null: false
      t.string :code, null: false
      t.decimal :price_modifier, precision: 12, scale: 2, null: false, default: 0
      t.text :cancellation_policy
      t.boolean :active, null: false, default: true
      t.timestamps
    end
    add_index :rate_plans, %i[property_id code], unique: true

    create_table :service_offerings, id: :uuid do |t|
      t.references :property, null: false, foreign_key: true, type: :uuid
      t.string :code, null: false
      t.string :name, null: false
      t.decimal :unit_price, precision: 12, scale: 2, null: false
      t.string :pricing_unit, null: false, default: "PER_BOOKING"
      t.boolean :taxable, null: false, default: true
      t.boolean :active, null: false, default: true
      t.timestamps
    end
    add_index :service_offerings, %i[property_id code], unique: true

    create_table :guests, id: :uuid do |t|
      t.references :company, null: false, foreign_key: true, type: :uuid
      t.string :first_name, null: false
      t.string :last_name, null: false
      t.string :email
      t.string :phone, null: false
      t.string :normalized_phone, null: false
      t.string :id_type
      t.string :id_number
      t.string :country, null: false, default: "Nepal"
      t.text :preferences
      t.integer :stay_count, null: false, default: 0
      t.decimal :lifetime_spend, precision: 14, scale: 2, null: false, default: 0
      t.boolean :blacklisted, null: false, default: false
      t.timestamps
    end
    add_index :guests, %i[company_id normalized_phone]
    add_index :guests, %i[company_id email]

    create_table :reservations, id: :uuid do |t|
      t.references :property, null: false, foreign_key: true, type: :uuid
      t.references :guest, null: false, foreign_key: true, type: :uuid
      t.references :rate_plan, foreign_key: true, type: :uuid
      t.string :confirmation_number, null: false
      t.string :source, null: false, default: "DIRECT_WEB"
      t.string :status, null: false, default: "CONFIRMED"
      t.date :check_in_date, null: false
      t.date :check_out_date, null: false
      t.integer :adults_count, null: false, default: 1
      t.integer :children_count, null: false, default: 0
      t.text :special_requests
      t.decimal :room_total, precision: 14, scale: 2, null: false
      t.decimal :service_total, precision: 14, scale: 2, null: false, default: 0
      t.decimal :tax_total, precision: 14, scale: 2, null: false, default: 0
      t.decimal :grand_total, precision: 14, scale: 2, null: false
      t.decimal :advance_paid, precision: 14, scale: 2, null: false, default: 0
      t.integer :lock_version, null: false, default: 0
      t.timestamps
    end
    add_index :reservations, :confirmation_number, unique: true
    add_index :reservations, %i[property_id check_in_date check_out_date], name: "index_reservations_on_property_and_stay"
    add_check_constraint :reservations, "check_out_date > check_in_date", name: "reservations_valid_stay"
    add_check_constraint :reservations, "grand_total >= 0 AND advance_paid >= 0", name: "reservations_non_negative_money"

    create_table :reservation_rooms, id: :uuid do |t|
      t.references :reservation, null: false, foreign_key: true, type: :uuid
      t.references :room_type, null: false, foreign_key: true, type: :uuid
      t.references :room, foreign_key: true, type: :uuid
      t.decimal :nightly_rate, precision: 12, scale: 2, null: false
      t.integer :nights, null: false
      t.timestamps
    end
    add_index :reservation_rooms, %i[room_id reservation_id], unique: true, where: "room_id IS NOT NULL"

    create_table :folios, id: :uuid do |t|
      t.references :property, null: false, foreign_key: true, type: :uuid
      t.references :reservation, null: false, foreign_key: true, type: :uuid
      t.references :guest, null: false, foreign_key: true, type: :uuid
      t.string :folio_number, null: false
      t.string :status, null: false, default: "OPEN"
      t.decimal :sub_total, precision: 14, scale: 2, null: false, default: 0
      t.decimal :service_charge, precision: 14, scale: 2, null: false, default: 0
      t.decimal :tax_amount, precision: 14, scale: 2, null: false, default: 0
      t.decimal :grand_total, precision: 14, scale: 2, null: false, default: 0
      t.decimal :total_paid, precision: 14, scale: 2, null: false, default: 0
      t.decimal :balance_due, precision: 14, scale: 2, null: false, default: 0
      t.timestamps
    end
    add_index :folios, :folio_number, unique: true
    add_index :folios, :reservation_id, unique: true, name: "index_folios_unique_reservation"

    create_table :folio_items, id: :uuid do |t|
      t.references :folio, null: false, foreign_key: true, type: :uuid
      t.string :source_module, null: false
      t.string :source_reference
      t.string :description, null: false
      t.decimal :quantity, precision: 10, scale: 2, null: false, default: 1
      t.decimal :unit_price, precision: 12, scale: 2, null: false
      t.decimal :sub_total, precision: 14, scale: 2, null: false
      t.decimal :tax_amount, precision: 14, scale: 2, null: false, default: 0
      t.decimal :total_amount, precision: 14, scale: 2, null: false
      t.jsonb :calculation_snapshot, null: false, default: {}
      t.boolean :voided, null: false, default: false
      t.timestamps
    end

    create_table :document_sequences, id: :uuid do |t|
      t.references :company, null: false, foreign_key: true, type: :uuid
      t.references :property, foreign_key: true, type: :uuid
      t.string :document_type, null: false
      t.integer :year, null: false
      t.integer :current_value, null: false, default: 0
      t.timestamps
    end
    add_index :document_sequences, %i[company_id property_id document_type year], unique: true, name: "index_document_sequences_on_scope"

    create_table :audit_logs, id: :uuid do |t|
      t.references :company, null: false, foreign_key: true, type: :uuid
      t.references :property, foreign_key: true, type: :uuid
      t.references :user, foreign_key: true, type: :uuid
      t.string :module_name, null: false
      t.string :action, null: false
      t.string :entity_type, null: false
      t.uuid :entity_id, null: false
      t.jsonb :old_values
      t.jsonb :new_values
      t.string :request_id
      t.string :ip_address
      t.timestamps
    end
    add_index :audit_logs, %i[company_id created_at]
    add_index :audit_logs, %i[entity_type entity_id]
  end
end
