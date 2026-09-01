class ExpandRailsBackendModules < ActiveRecord::Migration[8.1]
  def change
    add_column :guests, :city, :string
    add_column :guests, :vip_level, :string, null: false, default: "REGULAR"
    add_column :guests, :notes, :text
    add_column :rooms, :maintenance_notes, :text
    add_column :reservations, :checked_in_at, :datetime
    add_column :reservations, :checked_out_at, :datetime
    add_column :folios, :closed_at, :datetime

    create_table :payments, id: :uuid do |t|
      t.references :folio, null: false, foreign_key: true, type: :uuid
      t.string :receipt_number, null: false
      t.string :payment_method, null: false
      t.decimal :amount, precision: 14, scale: 2, null: false
      t.string :transaction_reference
      t.text :notes
      t.datetime :paid_at, null: false
      t.timestamps
    end
    add_index :payments, :receipt_number, unique: true
    add_check_constraint :payments, "amount > 0", name: "payments_positive_amount"

    create_table :cms_pages, id: :uuid do |t|
      t.references :company, null: false, foreign_key: true, type: :uuid
      t.references :property, foreign_key: true, type: :uuid
      t.string :slug, null: false
      t.string :title, null: false
      t.string :meta_title
      t.text :meta_description
      t.string :og_image_url
      t.boolean :published, null: false, default: true
      t.timestamps
    end
    add_index :cms_pages, %i[company_id slug], unique: true

    create_table :cms_sections, id: :uuid do |t|
      t.references :cms_page, null: false, foreign_key: true, type: :uuid
      t.string :section_key, null: false
      t.string :heading
      t.string :subheading
      t.text :body_text
      t.string :image_url
      t.integer :sort_order, null: false, default: 0
      t.boolean :enabled, null: false, default: true
      t.timestamps
    end
    add_index :cms_sections, %i[cms_page_id section_key], unique: true

    create_table :cms_offers, id: :uuid do |t|
      t.references :property, null: false, foreign_key: true, type: :uuid
      t.string :title, null: false
      t.string :code, null: false
      t.decimal :discount_pct, precision: 7, scale: 2, null: false, default: 0
      t.date :valid_from, null: false
      t.date :valid_until, null: false
      t.text :description
      t.string :banner_url
      t.decimal :price_starting_at, precision: 14, scale: 2, null: false, default: 0
      t.string :category, null: false, default: "GENERAL"
      t.boolean :active, null: false, default: true
      t.timestamps
    end
    add_index :cms_offers, %i[property_id code], unique: true

    create_table :contact_inquiries, id: :uuid do |t|
      t.references :property, null: false, foreign_key: true, type: :uuid
      t.string :name, null: false
      t.string :email
      t.string :phone
      t.string :subject
      t.text :message
      t.string :status, null: false, default: "NEW"
      t.timestamps
    end

    create_table :notifications, id: :uuid do |t|
      t.references :user, null: false, foreign_key: true, type: :uuid
      t.string :title, null: false
      t.text :message, null: false
      t.string :channel, null: false, default: "IN_APP"
      t.string :action_url
      t.datetime :read_at
      t.timestamps
    end

    create_table :restaurants, id: :uuid do |t|
      t.references :property, null: false, foreign_key: true, type: :uuid
      t.string :name, null: false
      t.string :outlet_code, null: false
      t.boolean :active, null: false, default: true
      t.timestamps
    end
    add_index :restaurants, %i[property_id outlet_code], unique: true

    create_table :restaurant_tables, id: :uuid do |t|
      t.references :restaurant, null: false, foreign_key: true, type: :uuid
      t.string :table_number, null: false
      t.integer :capacity, null: false, default: 4
      t.string :status, null: false, default: "AVAILABLE"
      t.timestamps
    end
    add_index :restaurant_tables, %i[restaurant_id table_number], unique: true

    create_table :housekeeping_tasks, id: :uuid do |t|
      t.references :room, null: false, foreign_key: true, type: :uuid
      t.string :task_type, null: false, default: "CLEANING"
      t.string :status, null: false, default: "PENDING"
      t.string :assigned_to
      t.datetime :completed_at
      t.timestamps
    end

    create_table :stores, id: :uuid do |t|
      t.references :property, null: false, foreign_key: true, type: :uuid
      t.string :name, null: false
      t.string :code, null: false
      t.timestamps
    end
    add_index :stores, %i[property_id code], unique: true

    create_table :inventory_items, id: :uuid do |t|
      t.references :company, null: false, foreign_key: true, type: :uuid
      t.string :item_code, null: false
      t.string :name, null: false
      t.string :category, null: false, default: "GENERAL"
      t.string :unit_of_measure, null: false, default: "pcs"
      t.decimal :standard_cost, precision: 14, scale: 2, null: false, default: 0
      t.decimal :min_reorder_level, precision: 14, scale: 2, null: false, default: 0
      t.timestamps
    end
    add_index :inventory_items, %i[company_id item_code], unique: true

    create_table :stock_balances, id: :uuid do |t|
      t.references :inventory_item, null: false, foreign_key: true, type: :uuid
      t.references :store, null: false, foreign_key: true, type: :uuid
      t.decimal :quantity_on_hand, precision: 14, scale: 2, null: false, default: 0
      t.timestamps
    end
    add_index :stock_balances, %i[inventory_item_id store_id], unique: true

    create_table :suppliers, id: :uuid do |t|
      t.references :company, null: false, foreign_key: true, type: :uuid
      t.string :name, null: false
      t.string :phone
      t.string :email
      t.string :address
      t.timestamps
    end

    create_table :purchase_orders, id: :uuid do |t|
      t.references :company, null: false, foreign_key: true, type: :uuid
      t.references :property, null: false, foreign_key: true, type: :uuid
      t.references :supplier, foreign_key: true, type: :uuid
      t.string :po_number, null: false
      t.date :order_date, null: false
      t.decimal :sub_total, precision: 14, scale: 2, null: false, default: 0
      t.decimal :grand_total, precision: 14, scale: 2, null: false, default: 0
      t.string :status, null: false, default: "SUBMITTED"
      t.text :notes
      t.timestamps
    end
    add_index :purchase_orders, :po_number, unique: true

    create_table :purchase_order_items, id: :uuid do |t|
      t.references :purchase_order, null: false, foreign_key: true, type: :uuid
      t.references :inventory_item, foreign_key: true, type: :uuid
      t.string :description, null: false
      t.decimal :quantity, precision: 14, scale: 2, null: false, default: 1
      t.decimal :unit_price, precision: 14, scale: 2, null: false, default: 0
      t.decimal :line_total, precision: 14, scale: 2, null: false, default: 0
      t.timestamps
    end

    create_table :banquet_halls, id: :uuid do |t|
      t.references :property, null: false, foreign_key: true, type: :uuid
      t.string :name, null: false
      t.string :code, null: false
      t.integer :theater_capacity, null: false, default: 100
      t.decimal :base_rent, precision: 14, scale: 2, null: false, default: 0
      t.boolean :active, null: false, default: true
      t.timestamps
    end
    add_index :banquet_halls, %i[property_id code], unique: true

    create_table :banquet_bookings, id: :uuid do |t|
      t.references :property, null: false, foreign_key: true, type: :uuid
      t.references :banquet_hall, null: false, foreign_key: true, type: :uuid
      t.references :guest, null: false, foreign_key: true, type: :uuid
      t.string :booking_ref, null: false
      t.string :event_name, null: false
      t.string :event_type, null: false, default: "CONFERENCE"
      t.datetime :start_date_time, null: false
      t.datetime :end_date_time, null: false
      t.string :nepali_date
      t.integer :pax_count, null: false, default: 1
      t.string :hall_layout
      t.decimal :hall_charge, precision: 14, scale: 2, null: false, default: 0
      t.decimal :catering_charge, precision: 14, scale: 2, null: false, default: 0
      t.decimal :grand_total, precision: 14, scale: 2, null: false, default: 0
      t.decimal :advance_paid, precision: 14, scale: 2, null: false, default: 0
      t.text :notes
      t.string :status, null: false, default: "CONFIRMED"
      t.timestamps
    end
    add_index :banquet_bookings, :booking_ref, unique: true

    create_table :accounts, id: :uuid do |t|
      t.references :company, null: false, foreign_key: true, type: :uuid
      t.string :account_code, null: false
      t.string :name, null: false
      t.string :category, null: false
      t.text :description
      t.boolean :active, null: false, default: true
      t.timestamps
    end
    add_index :accounts, %i[company_id account_code], unique: true

    create_table :journal_entries, id: :uuid do |t|
      t.references :company, null: false, foreign_key: true, type: :uuid
      t.string :voucher_number, null: false
      t.string :voucher_type, null: false, default: "JOURNAL"
      t.date :posting_date, null: false
      t.string :nepali_date
      t.text :narration
      t.decimal :total_debit, precision: 14, scale: 2, null: false, default: 0
      t.decimal :total_credit, precision: 14, scale: 2, null: false, default: 0
      t.string :status, null: false, default: "POSTED"
      t.string :source_module
      t.string :source_reference
      t.timestamps
    end
    add_index :journal_entries, :voucher_number, unique: true

    create_table :journal_lines, id: :uuid do |t|
      t.references :journal_entry, null: false, foreign_key: true, type: :uuid
      t.references :account, null: false, foreign_key: true, type: :uuid
      t.text :memo
      t.decimal :debit, precision: 14, scale: 2, null: false, default: 0
      t.decimal :credit, precision: 14, scale: 2, null: false, default: 0
      t.timestamps
    end
  end
end
