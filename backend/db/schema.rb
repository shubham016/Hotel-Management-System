# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_10_14_000001) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"
  enable_extension "pgcrypto"

  create_table "accounts", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "account_code", null: false
    t.boolean "active", default: true, null: false
    t.string "category", null: false
    t.uuid "company_id", null: false
    t.datetime "created_at", null: false
    t.text "description"
    t.string "name", null: false
    t.datetime "updated_at", null: false
    t.index ["company_id", "account_code"], name: "index_accounts_on_company_id_and_account_code", unique: true
    t.index ["company_id"], name: "index_accounts_on_company_id"
  end

  create_table "active_storage_attachments", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "blob_id", null: false
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.uuid "record_id", null: false
    t.string "record_type", null: false
    t.index ["record_type", "record_id", "name", "blob_id"], name: "index_active_storage_attachments_uniqueness", unique: true
  end

  create_table "active_storage_blobs", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.bigint "byte_size", null: false
    t.string "checksum"
    t.string "content_type"
    t.datetime "created_at", null: false
    t.string "filename", null: false
    t.string "key", null: false
    t.text "metadata"
    t.string "service_name", null: false
    t.index ["key"], name: "index_active_storage_blobs_on_key", unique: true
  end

  create_table "active_storage_variant_records", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "blob_id", null: false
    t.string "variation_digest", null: false
    t.index ["blob_id", "variation_digest"], name: "index_active_storage_variant_records_uniqueness", unique: true
  end

  create_table "api_sessions", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "expires_at", null: false
    t.string "ip_address"
    t.datetime "last_used_at"
    t.string "refresh_token_digest", null: false
    t.datetime "revoked_at"
    t.datetime "updated_at", null: false
    t.string "user_agent"
    t.uuid "user_id", null: false
    t.index ["expires_at"], name: "index_api_sessions_on_expires_at"
    t.index ["refresh_token_digest"], name: "index_api_sessions_on_refresh_token_digest", unique: true
    t.index ["user_id", "revoked_at"], name: "index_api_sessions_on_user_id_and_revoked_at"
    t.index ["user_id"], name: "index_api_sessions_on_user_id"
  end

  create_table "audit_logs", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "action", null: false
    t.uuid "company_id", null: false
    t.datetime "created_at", null: false
    t.uuid "entity_id", null: false
    t.string "entity_type", null: false
    t.string "ip_address"
    t.string "module_name", null: false
    t.jsonb "new_values"
    t.jsonb "old_values"
    t.uuid "property_id"
    t.string "request_id"
    t.datetime "updated_at", null: false
    t.uuid "user_id"
    t.index ["company_id", "created_at"], name: "index_audit_logs_on_company_id_and_created_at"
    t.index ["company_id"], name: "index_audit_logs_on_company_id"
    t.index ["entity_type", "entity_id"], name: "index_audit_logs_on_entity_type_and_entity_id"
    t.index ["property_id"], name: "index_audit_logs_on_property_id"
    t.index ["user_id"], name: "index_audit_logs_on_user_id"
  end

  create_table "banquet_bookings", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.decimal "advance_paid", precision: 14, scale: 2, default: "0.0", null: false
    t.uuid "banquet_hall_id", null: false
    t.string "booking_ref", null: false
    t.decimal "catering_charge", precision: 14, scale: 2, default: "0.0", null: false
    t.datetime "created_at", null: false
    t.datetime "end_date_time", null: false
    t.string "event_name", null: false
    t.string "event_type", default: "CONFERENCE", null: false
    t.decimal "grand_total", precision: 14, scale: 2, default: "0.0", null: false
    t.uuid "guest_id", null: false
    t.decimal "hall_charge", precision: 14, scale: 2, default: "0.0", null: false
    t.string "hall_layout"
    t.string "nepali_date"
    t.text "notes"
    t.integer "pax_count", default: 1, null: false
    t.uuid "property_id", null: false
    t.datetime "start_date_time", null: false
    t.string "status", default: "CONFIRMED", null: false
    t.datetime "updated_at", null: false
    t.index ["banquet_hall_id"], name: "index_banquet_bookings_on_banquet_hall_id"
    t.index ["booking_ref"], name: "index_banquet_bookings_on_booking_ref", unique: true
    t.index ["guest_id"], name: "index_banquet_bookings_on_guest_id"
    t.index ["property_id"], name: "index_banquet_bookings_on_property_id"
  end

  create_table "banquet_halls", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.decimal "base_rent", precision: 14, scale: 2, default: "0.0", null: false
    t.string "code", null: false
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.uuid "property_id", null: false
    t.integer "theater_capacity", default: 100, null: false
    t.datetime "updated_at", null: false
    t.index ["property_id", "code"], name: "index_banquet_halls_on_property_id_and_code", unique: true
    t.index ["property_id"], name: "index_banquet_halls_on_property_id"
  end

  create_table "cancellation_refunds", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.decimal "deduction_amount", precision: 14, scale: 2, null: false
    t.uuid "folio_id", null: false
    t.decimal "paid_amount", precision: 14, scale: 2, null: false
    t.datetime "paid_at"
    t.string "payment_method"
    t.decimal "refund_amount", precision: 14, scale: 2, null: false
    t.string "status", default: "PENDING", null: false
    t.string "transaction_reference"
    t.datetime "updated_at", null: false
    t.index ["folio_id"], name: "index_cancellation_refunds_on_folio_id", unique: true
    t.check_constraint "paid_amount > 0::numeric AND deduction_amount >= 0::numeric AND refund_amount >= 0::numeric AND paid_amount = (deduction_amount + refund_amount)", name: "cancellation_refund_amounts"
    t.check_constraint "status::text = ANY (ARRAY['PENDING'::character varying, 'PAID'::character varying]::text[])", name: "cancellation_refund_status"
  end

  create_table "cms_media_assets", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "alt_text", null: false
    t.string "category", default: "GENERAL", null: false
    t.uuid "company_id", null: false
    t.datetime "created_at", null: false
    t.uuid "property_id", null: false
    t.string "title", null: false
    t.datetime "updated_at", null: false
    t.index ["company_id"], name: "index_cms_media_assets_on_company_id"
    t.index ["property_id", "category"], name: "index_cms_media_assets_on_property_id_and_category"
    t.index ["property_id"], name: "index_cms_media_assets_on_property_id"
  end

  create_table "cms_offers", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.string "banner_url"
    t.string "category", default: "GENERAL", null: false
    t.string "code", null: false
    t.datetime "created_at", null: false
    t.text "description"
    t.decimal "discount_pct", precision: 7, scale: 2, default: "0.0", null: false
    t.decimal "price_starting_at", precision: 14, scale: 2, default: "0.0", null: false
    t.uuid "property_id", null: false
    t.string "title", null: false
    t.datetime "updated_at", null: false
    t.date "valid_from", null: false
    t.date "valid_until", null: false
    t.index ["property_id", "code"], name: "index_cms_offers_on_property_id_and_code", unique: true
    t.index ["property_id"], name: "index_cms_offers_on_property_id"
  end

  create_table "cms_pages", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "company_id", null: false
    t.datetime "created_at", null: false
    t.text "meta_description"
    t.string "meta_title"
    t.string "og_image_url"
    t.uuid "property_id"
    t.boolean "published", default: true, null: false
    t.string "slug", null: false
    t.string "title", null: false
    t.datetime "updated_at", null: false
    t.index ["company_id", "slug"], name: "index_cms_pages_on_company_id_and_slug", unique: true
    t.index ["company_id"], name: "index_cms_pages_on_company_id"
    t.index ["property_id"], name: "index_cms_pages_on_property_id"
  end

  create_table "cms_sections", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.text "body_text"
    t.uuid "cms_page_id", null: false
    t.datetime "created_at", null: false
    t.boolean "enabled", default: true, null: false
    t.string "heading"
    t.string "image_url"
    t.string "section_key", null: false
    t.integer "sort_order", default: 0, null: false
    t.string "subheading"
    t.datetime "updated_at", null: false
    t.index ["cms_page_id", "section_key"], name: "index_cms_sections_on_cms_page_id_and_section_key", unique: true
    t.index ["cms_page_id"], name: "index_cms_sections_on_cms_page_id"
  end

  create_table "cms_testimonials", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.text "avatar"
    t.text "comment", null: false
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.string "origin"
    t.uuid "property_id", null: false
    t.integer "rating", default: 5, null: false
    t.integer "sort_order", default: 0, null: false
    t.datetime "updated_at", null: false
    t.index ["property_id"], name: "index_cms_testimonials_on_property_id"
    t.check_constraint "rating >= 1 AND rating <= 5", name: "cms_testimonials_valid_rating"
    t.check_constraint "sort_order >= 0", name: "cms_testimonials_valid_order"
  end

  create_table "companies", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.datetime "created_at", null: false
    t.string "currency_code", default: "NPR", null: false
    t.string "name", null: false
    t.string "slug", null: false
    t.string "timezone", default: "Asia/Kathmandu", null: false
    t.datetime "updated_at", null: false
    t.index ["slug"], name: "index_companies_on_slug", unique: true
  end

  create_table "contact_inquiries", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "email"
    t.text "message"
    t.string "name", null: false
    t.string "phone"
    t.uuid "property_id", null: false
    t.string "status", default: "NEW", null: false
    t.string "subject"
    t.datetime "updated_at", null: false
    t.index ["property_id"], name: "index_contact_inquiries_on_property_id"
  end

  create_table "document_sequences", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "company_id", null: false
    t.datetime "created_at", null: false
    t.integer "current_value", default: 0, null: false
    t.string "document_type", null: false
    t.uuid "property_id"
    t.datetime "updated_at", null: false
    t.integer "year", null: false
    t.index ["company_id", "property_id", "document_type", "year"], name: "index_document_sequences_on_scope", unique: true
    t.index ["company_id"], name: "index_document_sequences_on_company_id"
    t.index ["property_id"], name: "index_document_sequences_on_property_id"
  end

  create_table "floors", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.integer "number", null: false
    t.uuid "property_id", null: false
    t.datetime "updated_at", null: false
    t.index ["property_id", "number"], name: "index_floors_on_property_id_and_number", unique: true
    t.index ["property_id"], name: "index_floors_on_property_id"
  end

  create_table "folio_items", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.jsonb "calculation_snapshot", default: {}, null: false
    t.datetime "created_at", null: false
    t.string "description", null: false
    t.uuid "folio_id", null: false
    t.decimal "quantity", precision: 10, scale: 2, default: "1.0", null: false
    t.string "source_module", null: false
    t.string "source_reference"
    t.decimal "sub_total", precision: 14, scale: 2, null: false
    t.decimal "tax_amount", precision: 14, scale: 2, default: "0.0", null: false
    t.decimal "total_amount", precision: 14, scale: 2, null: false
    t.decimal "unit_price", precision: 12, scale: 2, null: false
    t.datetime "updated_at", null: false
    t.boolean "voided", default: false, null: false
    t.index ["folio_id", "source_reference"], name: "index_folio_items_on_folio_id_and_idempotency_key", unique: true, where: "(((source_module)::text = 'RESTAURANT'::text) AND (source_reference IS NOT NULL))"
    t.index ["folio_id"], name: "index_folio_items_on_folio_id"
  end

  create_table "folios", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.decimal "balance_due", precision: 14, scale: 2, default: "0.0", null: false
    t.datetime "closed_at"
    t.datetime "created_at", null: false
    t.string "folio_number", null: false
    t.decimal "grand_total", precision: 14, scale: 2, default: "0.0", null: false
    t.uuid "guest_id", null: false
    t.uuid "property_id", null: false
    t.uuid "reservation_id", null: false
    t.decimal "service_charge", precision: 14, scale: 2, default: "0.0", null: false
    t.string "status", default: "OPEN", null: false
    t.decimal "sub_total", precision: 14, scale: 2, default: "0.0", null: false
    t.decimal "tax_amount", precision: 14, scale: 2, default: "0.0", null: false
    t.decimal "total_paid", precision: 14, scale: 2, default: "0.0", null: false
    t.datetime "updated_at", null: false
    t.index ["folio_number"], name: "index_folios_on_folio_number", unique: true
    t.index ["guest_id"], name: "index_folios_on_guest_id"
    t.index ["property_id"], name: "index_folios_on_property_id"
    t.index ["reservation_id"], name: "index_folios_on_reservation_id"
    t.index ["reservation_id"], name: "index_folios_unique_reservation", unique: true
  end

  create_table "guests", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.boolean "blacklisted", default: false, null: false
    t.string "city"
    t.uuid "company_id", null: false
    t.string "country", default: "Nepal", null: false
    t.datetime "created_at", null: false
    t.string "email"
    t.string "first_name", null: false
    t.string "id_number"
    t.string "id_type"
    t.string "last_name", null: false
    t.decimal "lifetime_spend", precision: 14, scale: 2, default: "0.0", null: false
    t.string "normalized_phone", null: false
    t.text "notes"
    t.string "phone", null: false
    t.text "preferences"
    t.integer "stay_count", default: 0, null: false
    t.datetime "updated_at", null: false
    t.string "vip_level", default: "REGULAR", null: false
    t.index ["company_id", "email"], name: "index_guests_on_company_id_and_email"
    t.index ["company_id", "normalized_phone"], name: "index_guests_on_company_id_and_normalized_phone"
    t.index ["company_id"], name: "index_guests_on_company_id"
  end

  create_table "housekeeping_tasks", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "assigned_to"
    t.datetime "completed_at"
    t.datetime "created_at", null: false
    t.uuid "room_id", null: false
    t.string "status", default: "PENDING", null: false
    t.string "task_type", default: "CLEANING", null: false
    t.datetime "updated_at", null: false
    t.index ["room_id"], name: "index_housekeeping_tasks_on_room_id"
  end

  create_table "inventory_items", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "category", default: "GENERAL", null: false
    t.uuid "company_id", null: false
    t.datetime "created_at", null: false
    t.string "item_code", null: false
    t.decimal "min_reorder_level", precision: 14, scale: 2, default: "0.0", null: false
    t.string "name", null: false
    t.decimal "standard_cost", precision: 14, scale: 2, default: "0.0", null: false
    t.string "unit_of_measure", default: "pcs", null: false
    t.datetime "updated_at", null: false
    t.index ["company_id", "item_code"], name: "index_inventory_items_on_company_id_and_item_code", unique: true
    t.index ["company_id"], name: "index_inventory_items_on_company_id"
  end

  create_table "journal_entries", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "company_id", null: false
    t.datetime "created_at", null: false
    t.text "narration"
    t.string "nepali_date"
    t.date "posting_date", null: false
    t.string "source_module"
    t.string "source_reference"
    t.string "status", default: "POSTED", null: false
    t.decimal "total_credit", precision: 14, scale: 2, default: "0.0", null: false
    t.decimal "total_debit", precision: 14, scale: 2, default: "0.0", null: false
    t.datetime "updated_at", null: false
    t.string "voucher_number", null: false
    t.string "voucher_type", default: "JOURNAL", null: false
    t.index ["company_id", "source_reference"], name: "index_journal_entries_on_company_id_and_idempotency_key", unique: true, where: "(source_reference IS NOT NULL)"
    t.index ["company_id"], name: "index_journal_entries_on_company_id"
    t.index ["voucher_number"], name: "index_journal_entries_on_voucher_number", unique: true
  end

  create_table "journal_lines", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "account_id", null: false
    t.datetime "created_at", null: false
    t.decimal "credit", precision: 14, scale: 2, default: "0.0", null: false
    t.decimal "debit", precision: 14, scale: 2, default: "0.0", null: false
    t.uuid "journal_entry_id", null: false
    t.text "memo"
    t.datetime "updated_at", null: false
    t.index ["account_id"], name: "index_journal_lines_on_account_id"
    t.index ["journal_entry_id"], name: "index_journal_lines_on_journal_entry_id"
  end

  create_table "kitchen_orders", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "idempotency_key", null: false
    t.jsonb "items", default: [], null: false
    t.text "notes"
    t.uuid "property_id", null: false
    t.datetime "ready_at"
    t.uuid "restaurant_table_id", null: false
    t.datetime "served_at"
    t.datetime "settled_at"
    t.string "status", default: "PLACED", null: false
    t.string "ticket_number", null: false
    t.datetime "updated_at", null: false
    t.uuid "user_id", null: false
    t.index ["property_id", "idempotency_key"], name: "index_kitchen_orders_on_property_id_and_idempotency_key", unique: true
    t.index ["property_id", "status"], name: "index_kitchen_orders_on_property_id_and_status"
    t.index ["property_id", "ticket_number"], name: "index_kitchen_orders_on_property_id_and_ticket_number", unique: true
    t.index ["property_id"], name: "index_kitchen_orders_on_property_id"
    t.index ["restaurant_table_id"], name: "index_kitchen_orders_on_restaurant_table_id"
    t.index ["user_id"], name: "index_kitchen_orders_on_user_id"
  end

  create_table "laundry_items", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.integer "position", default: 0, null: false
    t.decimal "price", precision: 12, scale: 2, null: false
    t.uuid "property_id", null: false
    t.string "source_key"
    t.datetime "updated_at", null: false
    t.index ["property_id", "source_key"], name: "index_laundry_items_on_property_id_and_source_key", unique: true
    t.index ["property_id"], name: "index_laundry_items_on_property_id"
  end

  create_table "menu_items", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.string "category", null: false
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.decimal "price", precision: 12, scale: 2, null: false
    t.uuid "restaurant_id", null: false
    t.datetime "updated_at", null: false
    t.index ["restaurant_id", "name"], name: "index_menu_items_on_restaurant_id_and_name", unique: true
    t.index ["restaurant_id"], name: "index_menu_items_on_restaurant_id"
  end

  create_table "notifications", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "action_url"
    t.string "channel", default: "IN_APP", null: false
    t.datetime "created_at", null: false
    t.text "message", null: false
    t.datetime "read_at"
    t.string "title", null: false
    t.datetime "updated_at", null: false
    t.uuid "user_id", null: false
    t.index ["user_id"], name: "index_notifications_on_user_id"
  end

  create_table "password_reset_tokens", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "expires_at", null: false
    t.string "request_ip"
    t.string "token_digest", null: false
    t.datetime "updated_at", null: false
    t.datetime "used_at"
    t.uuid "user_id", null: false
    t.index ["expires_at"], name: "index_password_reset_tokens_on_expires_at"
    t.index ["token_digest"], name: "index_password_reset_tokens_on_token_digest", unique: true
    t.index ["user_id", "used_at"], name: "index_password_reset_tokens_on_user_id_and_used_at"
    t.index ["user_id"], name: "index_password_reset_tokens_on_user_id"
  end

  create_table "payment_requests", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.decimal "amount", precision: 14, scale: 2, null: false
    t.datetime "created_at", null: false
    t.datetime "expires_at", null: false
    t.uuid "folio_id", null: false
    t.string "gateway"
    t.string "gateway_reference"
    t.string "gateway_transaction_id"
    t.string "gateway_url"
    t.string "kind", null: false
    t.uuid "payment_id"
    t.boolean "public_checkout", default: false, null: false
    t.string "public_token", null: false
    t.string "status", default: "PENDING", null: false
    t.datetime "updated_at", null: false
    t.index ["folio_id"], name: "index_payment_requests_on_folio_id"
    t.index ["gateway", "gateway_reference"], name: "index_payment_requests_on_gateway_and_gateway_reference", unique: true, where: "(gateway_reference IS NOT NULL)"
    t.index ["gateway", "gateway_transaction_id"], name: "index_payment_requests_on_gateway_and_gateway_transaction_id", unique: true, where: "(gateway_transaction_id IS NOT NULL)"
    t.index ["payment_id"], name: "index_payment_requests_on_payment_id"
    t.index ["public_token"], name: "index_payment_requests_on_public_token", unique: true
    t.check_constraint "amount > 0::numeric", name: "payment_requests_positive_amount"
  end

  create_table "payments", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.decimal "amount", precision: 14, scale: 2, null: false
    t.datetime "created_at", null: false
    t.uuid "folio_id", null: false
    t.string "idempotency_key"
    t.text "notes"
    t.datetime "paid_at", null: false
    t.string "payment_method", null: false
    t.string "receipt_number", null: false
    t.string "transaction_reference"
    t.datetime "updated_at", null: false
    t.index ["folio_id"], name: "index_payments_on_folio_id"
    t.index ["idempotency_key"], name: "index_payments_on_idempotency_key", unique: true, where: "(idempotency_key IS NOT NULL)"
    t.index ["receipt_number"], name: "index_payments_on_receipt_number", unique: true
    t.check_constraint "amount > 0::numeric", name: "payments_positive_amount"
  end

  create_table "payroll_advances", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.decimal "amount", precision: 14, scale: 2, null: false
    t.datetime "created_at", null: false
    t.uuid "journal_entry_id", null: false
    t.date "paid_on", null: false
    t.string "payment_method", null: false
    t.string "payment_reference"
    t.uuid "payroll_entry_id", null: false
    t.string "request_key", null: false
    t.datetime "updated_at", null: false
    t.index ["journal_entry_id"], name: "index_payroll_advances_on_journal_entry_id", unique: true
    t.index ["payroll_entry_id", "request_key"], name: "index_payroll_advances_on_payroll_entry_id_and_request_key", unique: true
    t.index ["payroll_entry_id"], name: "index_payroll_advances_on_payroll_entry_id"
    t.check_constraint "amount > 0::numeric", name: "payroll_advance_positive"
  end

  create_table "payroll_configurations", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "advances_account_id", null: false
    t.datetime "created_at", null: false
    t.uuid "deductions_account_id", null: false
    t.uuid "expense_account_id", null: false
    t.uuid "payable_account_id", null: false
    t.uuid "property_id", null: false
    t.uuid "tds_account_id"
    t.datetime "updated_at", null: false
    t.index ["advances_account_id"], name: "index_payroll_configurations_on_advances_account_id"
    t.index ["deductions_account_id"], name: "index_payroll_configurations_on_deductions_account_id"
    t.index ["expense_account_id"], name: "index_payroll_configurations_on_expense_account_id"
    t.index ["payable_account_id"], name: "index_payroll_configurations_on_payable_account_id"
    t.index ["property_id"], name: "index_payroll_configurations_on_property_id", unique: true
    t.index ["tds_account_id"], name: "index_payroll_configurations_on_tds_account_id"
  end

  create_table "payroll_entries", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.decimal "advance_amount", precision: 14, scale: 2, default: "0.0", null: false
    t.uuid "approval_journal_id"
    t.datetime "archived_at"
    t.decimal "base_salary", precision: 14, scale: 2, default: "0.0", null: false
    t.datetime "created_at", null: false
    t.decimal "deductions", precision: 14, scale: 2, default: "0.0", null: false
    t.string "department", null: false
    t.decimal "earnings", precision: 14, scale: 2, default: "0.0", null: false
    t.string "employee_name", null: false
    t.decimal "monthly_allowance", precision: 14, scale: 2, default: "0.0", null: false
    t.decimal "net_pay", precision: 14, scale: 2, default: "0.0", null: false
    t.text "notes"
    t.date "paid_on"
    t.uuid "payment_journal_id"
    t.string "payment_method"
    t.string "payment_reference"
    t.date "period", null: false
    t.string "period_calendar", default: "AD", null: false
    t.uuid "property_id", null: false
    t.uuid "staff_member_id", null: false
    t.string "status", default: "DRAFT", null: false
    t.decimal "tds_amount", precision: 14, scale: 2, default: "0.0", null: false
    t.decimal "tds_rate", precision: 5, scale: 2
    t.text "tds_reason"
    t.datetime "updated_at", null: false
    t.index ["approval_journal_id"], name: "index_payroll_entries_on_approval_journal_id", unique: true
    t.index ["payment_journal_id"], name: "index_payroll_entries_on_payment_journal_id", unique: true
    t.index ["property_id"], name: "index_payroll_entries_on_property_id"
    t.index ["staff_member_id", "period_calendar", "period"], name: "index_payroll_employee_calendar_period", unique: true
    t.index ["staff_member_id"], name: "index_payroll_entries_on_staff_member_id"
    t.check_constraint "archived_at IS NULL OR status::text = 'PAID'::text", name: "payroll_archive_paid_only"
    t.check_constraint "base_salary >= 0::numeric AND monthly_allowance >= 0::numeric AND earnings >= 0::numeric AND deductions >= 0::numeric AND advance_amount >= 0::numeric AND tds_amount >= 0::numeric AND net_pay >= 0::numeric AND net_pay = (base_salary + monthly_allowance + earnings - deductions - advance_amount - tds_amount)", name: "payroll_valid_amounts"
    t.check_constraint "period_calendar::text = ANY (ARRAY['AD'::character varying, 'BS'::character varying]::text[])", name: "payroll_calendar_valid"
    t.check_constraint "status::text = ANY (ARRAY['DRAFT'::character varying, 'APPROVED'::character varying, 'PAID'::character varying]::text[])", name: "payroll_valid_status"
    t.check_constraint "tds_amount =\nCASE\n    WHEN tds_rate IS NULL THEN 0::numeric\n    ELSE round((base_salary + monthly_allowance + earnings) * tds_rate / 100::numeric, 2)\nEND", name: "payroll_tds_amount_valid"
    t.check_constraint "tds_rate IS NULL OR tds_rate >= 0::numeric AND tds_rate <= 100::numeric", name: "payroll_tds_rate_valid"
  end

  create_table "properties", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.string "address"
    t.string "check_in_time", default: "14:00", null: false
    t.string "check_out_time", default: "12:00", null: false
    t.string "city"
    t.string "code", null: false
    t.uuid "company_id", null: false
    t.string "country", default: "Nepal", null: false
    t.datetime "created_at", null: false
    t.string "email"
    t.text "laundry_collection_instructions"
    t.text "laundry_return_instructions"
    t.string "name", null: false
    t.string "phone"
    t.datetime "updated_at", null: false
    t.index ["code"], name: "index_properties_on_code", unique: true
    t.index ["company_id", "code"], name: "index_properties_on_company_id_and_code", unique: true
    t.index ["company_id"], name: "index_properties_on_company_id"
  end

  create_table "purchase_order_items", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "description", null: false
    t.uuid "inventory_item_id"
    t.decimal "line_total", precision: 14, scale: 2, default: "0.0", null: false
    t.uuid "purchase_order_id", null: false
    t.decimal "quantity", precision: 14, scale: 2, default: "1.0", null: false
    t.decimal "unit_price", precision: 14, scale: 2, default: "0.0", null: false
    t.datetime "updated_at", null: false
    t.index ["inventory_item_id"], name: "index_purchase_order_items_on_inventory_item_id"
    t.index ["purchase_order_id"], name: "index_purchase_order_items_on_purchase_order_id"
  end

  create_table "purchase_orders", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "company_id", null: false
    t.datetime "created_at", null: false
    t.decimal "grand_total", precision: 14, scale: 2, default: "0.0", null: false
    t.text "notes"
    t.date "order_date", null: false
    t.string "po_number", null: false
    t.uuid "property_id", null: false
    t.string "status", default: "SUBMITTED", null: false
    t.decimal "sub_total", precision: 14, scale: 2, default: "0.0", null: false
    t.uuid "supplier_id"
    t.datetime "updated_at", null: false
    t.index ["company_id"], name: "index_purchase_orders_on_company_id"
    t.index ["po_number"], name: "index_purchase_orders_on_po_number", unique: true
    t.index ["property_id"], name: "index_purchase_orders_on_property_id"
    t.index ["supplier_id"], name: "index_purchase_orders_on_supplier_id"
  end

  create_table "rate_plans", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.text "cancellation_policy"
    t.string "code", null: false
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.decimal "price_modifier", precision: 12, scale: 2, default: "0.0", null: false
    t.uuid "property_id", null: false
    t.uuid "room_type_id", null: false
    t.datetime "updated_at", null: false
    t.index ["property_id", "code"], name: "index_rate_plans_on_property_id_and_code", unique: true
    t.index ["property_id"], name: "index_rate_plans_on_property_id"
    t.index ["room_type_id"], name: "index_rate_plans_on_room_type_id"
  end

  create_table "reservation_rooms", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.decimal "nightly_rate", precision: 12, scale: 2, null: false
    t.integer "nights", null: false
    t.uuid "reservation_id", null: false
    t.uuid "room_id"
    t.uuid "room_type_id", null: false
    t.datetime "updated_at", null: false
    t.index ["reservation_id"], name: "index_reservation_rooms_on_reservation_id"
    t.index ["room_id", "reservation_id"], name: "index_reservation_rooms_on_room_id_and_reservation_id", unique: true, where: "(room_id IS NOT NULL)"
    t.index ["room_id"], name: "index_reservation_rooms_on_room_id"
    t.index ["room_type_id"], name: "index_reservation_rooms_on_room_type_id"
  end

  create_table "reservations", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.integer "adults_count", default: 1, null: false
    t.decimal "advance_paid", precision: 14, scale: 2, default: "0.0", null: false
    t.date "check_in_date", null: false
    t.date "check_out_date", null: false
    t.datetime "checked_in_at"
    t.datetime "checked_out_at"
    t.integer "children_count", default: 0, null: false
    t.string "confirmation_number", null: false
    t.datetime "created_at", null: false
    t.decimal "grand_total", precision: 14, scale: 2, null: false
    t.uuid "guest_id", null: false
    t.integer "lock_version", default: 0, null: false
    t.uuid "property_id", null: false
    t.uuid "rate_plan_id"
    t.decimal "room_total", precision: 14, scale: 2, null: false
    t.decimal "service_total", precision: 14, scale: 2, default: "0.0", null: false
    t.string "source", default: "ONLINE", null: false
    t.text "special_requests"
    t.string "status", default: "CONFIRMED", null: false
    t.decimal "tax_total", precision: 14, scale: 2, default: "0.0", null: false
    t.datetime "updated_at", null: false
    t.index ["confirmation_number"], name: "index_reservations_on_confirmation_number", unique: true
    t.index ["guest_id"], name: "index_reservations_on_guest_id"
    t.index ["property_id", "check_in_date", "check_out_date"], name: "index_reservations_on_property_and_stay"
    t.index ["property_id"], name: "index_reservations_on_property_id"
    t.index ["rate_plan_id"], name: "index_reservations_on_rate_plan_id"
    t.check_constraint "check_out_date > check_in_date", name: "reservations_valid_stay"
    t.check_constraint "grand_total >= 0::numeric AND advance_paid >= 0::numeric", name: "reservations_non_negative_money"
  end

  create_table "restaurant_tables", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.integer "capacity", default: 4, null: false
    t.datetime "created_at", null: false
    t.uuid "restaurant_id", null: false
    t.string "status", default: "AVAILABLE", null: false
    t.string "table_number", null: false
    t.datetime "updated_at", null: false
    t.index ["restaurant_id", "table_number"], name: "index_restaurant_tables_on_restaurant_id_and_table_number", unique: true
    t.index ["restaurant_id"], name: "index_restaurant_tables_on_restaurant_id"
  end

  create_table "restaurants", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.string "outlet_code", null: false
    t.uuid "property_id", null: false
    t.datetime "updated_at", null: false
    t.index ["property_id", "outlet_code"], name: "index_restaurants_on_property_id_and_outlet_code", unique: true
    t.index ["property_id"], name: "index_restaurants_on_property_id"
  end

  create_table "roles", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "company_id", null: false
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.jsonb "permissions", default: {}, null: false
    t.boolean "system", default: false, null: false
    t.datetime "updated_at", null: false
    t.index ["company_id", "name"], name: "index_roles_on_company_id_and_name", unique: true
    t.index ["company_id"], name: "index_roles_on_company_id"
  end

  create_table "room_types", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.jsonb "amenities", default: [], null: false
    t.decimal "base_price", precision: 12, scale: 2, null: false
    t.string "bed_category", default: "Not specified", null: false
    t.integer "bed_count", default: 1, null: false
    t.string "code", null: false
    t.datetime "created_at", null: false
    t.text "description"
    t.text "image_url"
    t.integer "max_adults", default: 2, null: false
    t.integer "max_children", default: 1, null: false
    t.integer "max_occupancy", default: 3, null: false
    t.string "name", null: false
    t.uuid "property_id", null: false
    t.boolean "setup_managed", default: false, null: false
    t.string "slug", null: false
    t.datetime "updated_at", null: false
    t.index ["property_id", "code"], name: "index_room_types_on_property_id_and_code", unique: true
    t.index ["property_id", "setup_managed"], name: "index_room_types_on_property_id_and_setup_managed"
    t.index ["property_id", "slug"], name: "index_room_types_on_property_id_and_slug", unique: true
    t.index ["property_id"], name: "index_room_types_on_property_id"
    t.check_constraint "bed_count > 0", name: "room_types_positive_bed_count"
  end

  create_table "rooms", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.boolean "accessible", default: false, null: false
    t.boolean "active", default: true, null: false
    t.string "bed_category"
    t.integer "bed_count"
    t.integer "bed_length_inches"
    t.integer "bed_width_inches"
    t.datetime "created_at", null: false
    t.integer "floor", default: 1, null: false
    t.text "maintenance_notes"
    t.uuid "property_id", null: false
    t.string "room_number", null: false
    t.uuid "room_type_id", null: false
    t.boolean "setup_managed", default: false, null: false
    t.boolean "smoking", default: false, null: false
    t.string "status", default: "VACANT_CLEAN", null: false
    t.datetime "updated_at", null: false
    t.index ["property_id", "room_number"], name: "index_rooms_on_property_id_and_room_number", unique: true
    t.index ["property_id", "setup_managed"], name: "index_rooms_on_property_id_and_setup_managed"
    t.index ["property_id", "status"], name: "index_rooms_on_property_id_and_status"
    t.index ["property_id"], name: "index_rooms_on_property_id"
    t.index ["room_type_id"], name: "index_rooms_on_room_type_id"
    t.check_constraint "bed_category IS NULL AND bed_count IS NULL AND bed_length_inches IS NULL AND bed_width_inches IS NULL OR bed_category IS NOT NULL AND length(TRIM(BOTH FROM bed_category)) > 0 AND bed_count IS NOT NULL AND bed_count > 0 AND bed_length_inches IS NOT NULL AND bed_length_inches > 0 AND bed_width_inches IS NOT NULL AND bed_width_inches > 0", name: "rooms_complete_bed_details"
  end

  create_table "service_offerings", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.string "code", null: false
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.string "pricing_unit", default: "PER_BOOKING", null: false
    t.uuid "property_id", null: false
    t.boolean "taxable", default: true, null: false
    t.decimal "unit_price", precision: 12, scale: 2, null: false
    t.datetime "updated_at", null: false
    t.index ["property_id", "code"], name: "index_service_offerings_on_property_id_and_code", unique: true
    t.index ["property_id"], name: "index_service_offerings_on_property_id"
  end

  create_table "staff_members", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.datetime "created_at", null: false
    t.string "department", null: false
    t.decimal "monthly_salary", precision: 14, scale: 2
    t.string "name", null: false
    t.integer "position", default: 0, null: false
    t.uuid "property_id", null: false
    t.string "source_key"
    t.datetime "updated_at", null: false
    t.index ["property_id", "source_key"], name: "index_staff_members_on_property_id_and_source_key", unique: true
    t.index ["property_id"], name: "index_staff_members_on_property_id"
    t.check_constraint "monthly_salary IS NULL OR monthly_salary >= 0::numeric", name: "staff_salary_nonnegative"
  end

  create_table "stock_balances", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.uuid "inventory_item_id", null: false
    t.decimal "quantity_on_hand", precision: 14, scale: 2, default: "0.0", null: false
    t.uuid "store_id", null: false
    t.datetime "updated_at", null: false
    t.index ["inventory_item_id", "store_id"], name: "index_stock_balances_on_inventory_item_id_and_store_id", unique: true
    t.index ["inventory_item_id"], name: "index_stock_balances_on_inventory_item_id"
    t.index ["store_id"], name: "index_stock_balances_on_store_id"
  end

  create_table "stores", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "code", null: false
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.uuid "property_id", null: false
    t.datetime "updated_at", null: false
    t.index ["property_id", "code"], name: "index_stores_on_property_id_and_code", unique: true
    t.index ["property_id"], name: "index_stores_on_property_id"
  end

  create_table "suppliers", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "address"
    t.uuid "company_id", null: false
    t.datetime "created_at", null: false
    t.string "email"
    t.string "name", null: false
    t.string "phone"
    t.datetime "updated_at", null: false
    t.index ["company_id"], name: "index_suppliers_on_company_id"
  end

  create_table "tax_configurations", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.boolean "applies_to_rooms", default: true, null: false
    t.integer "calculation_order", default: 1, null: false
    t.string "code", null: false
    t.uuid "company_id", null: false
    t.datetime "created_at", null: false
    t.date "effective_from", null: false
    t.date "effective_until"
    t.boolean "inclusive", default: false, null: false
    t.string "name", null: false
    t.decimal "rate", precision: 7, scale: 4, null: false
    t.datetime "updated_at", null: false
    t.index ["company_id", "code", "effective_from"], name: "index_tax_configurations_on_scope", unique: true
    t.index ["company_id"], name: "index_tax_configurations_on_company_id"
  end

  create_table "user_properties", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.uuid "property_id", null: false
    t.datetime "updated_at", null: false
    t.uuid "user_id", null: false
    t.index ["property_id"], name: "index_user_properties_on_property_id"
    t.index ["user_id", "property_id"], name: "index_user_properties_on_user_id_and_property_id", unique: true
    t.index ["user_id"], name: "index_user_properties_on_user_id"
  end

  create_table "users", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.uuid "company_id", null: false
    t.datetime "created_at", null: false
    t.string "email", null: false
    t.string "first_name", null: false
    t.datetime "last_login_at"
    t.string "last_name", null: false
    t.string "password_digest", null: false
    t.string "password_reset_email_status"
    t.datetime "password_reset_requested_at"
    t.uuid "role_id", null: false
    t.uuid "staff_member_id"
    t.datetime "updated_at", null: false
    t.index "lower((email)::text)", name: "index_users_on_lower_email", unique: true
    t.index ["company_id"], name: "index_users_on_company_id"
    t.index ["role_id"], name: "index_users_on_role_id"
    t.index ["staff_member_id"], name: "index_users_on_staff_member_id", unique: true
  end

  add_foreign_key "accounts", "companies"
  add_foreign_key "active_storage_attachments", "active_storage_blobs", column: "blob_id"
  add_foreign_key "active_storage_variant_records", "active_storage_blobs", column: "blob_id"
  add_foreign_key "api_sessions", "users"
  add_foreign_key "audit_logs", "companies"
  add_foreign_key "audit_logs", "properties"
  add_foreign_key "audit_logs", "users"
  add_foreign_key "banquet_bookings", "banquet_halls"
  add_foreign_key "banquet_bookings", "guests"
  add_foreign_key "banquet_bookings", "properties"
  add_foreign_key "banquet_halls", "properties"
  add_foreign_key "cancellation_refunds", "folios"
  add_foreign_key "cms_media_assets", "companies"
  add_foreign_key "cms_media_assets", "properties"
  add_foreign_key "cms_offers", "properties"
  add_foreign_key "cms_pages", "companies"
  add_foreign_key "cms_pages", "properties"
  add_foreign_key "cms_sections", "cms_pages"
  add_foreign_key "cms_testimonials", "properties"
  add_foreign_key "contact_inquiries", "properties"
  add_foreign_key "document_sequences", "companies"
  add_foreign_key "document_sequences", "properties"
  add_foreign_key "floors", "properties"
  add_foreign_key "folio_items", "folios"
  add_foreign_key "folios", "guests"
  add_foreign_key "folios", "properties"
  add_foreign_key "folios", "reservations"
  add_foreign_key "guests", "companies"
  add_foreign_key "housekeeping_tasks", "rooms"
  add_foreign_key "inventory_items", "companies"
  add_foreign_key "journal_entries", "companies"
  add_foreign_key "journal_lines", "accounts"
  add_foreign_key "journal_lines", "journal_entries"
  add_foreign_key "kitchen_orders", "properties"
  add_foreign_key "kitchen_orders", "restaurant_tables"
  add_foreign_key "kitchen_orders", "users"
  add_foreign_key "laundry_items", "properties"
  add_foreign_key "menu_items", "restaurants"
  add_foreign_key "notifications", "users"
  add_foreign_key "password_reset_tokens", "users"
  add_foreign_key "payment_requests", "folios"
  add_foreign_key "payment_requests", "payments"
  add_foreign_key "payments", "folios"
  add_foreign_key "payroll_advances", "journal_entries"
  add_foreign_key "payroll_advances", "payroll_entries"
  add_foreign_key "payroll_configurations", "accounts", column: "advances_account_id"
  add_foreign_key "payroll_configurations", "accounts", column: "deductions_account_id"
  add_foreign_key "payroll_configurations", "accounts", column: "expense_account_id"
  add_foreign_key "payroll_configurations", "accounts", column: "payable_account_id"
  add_foreign_key "payroll_configurations", "accounts", column: "tds_account_id"
  add_foreign_key "payroll_configurations", "properties"
  add_foreign_key "payroll_entries", "journal_entries", column: "approval_journal_id"
  add_foreign_key "payroll_entries", "journal_entries", column: "payment_journal_id"
  add_foreign_key "payroll_entries", "properties"
  add_foreign_key "payroll_entries", "staff_members"
  add_foreign_key "properties", "companies"
  add_foreign_key "purchase_order_items", "inventory_items"
  add_foreign_key "purchase_order_items", "purchase_orders"
  add_foreign_key "purchase_orders", "companies"
  add_foreign_key "purchase_orders", "properties"
  add_foreign_key "purchase_orders", "suppliers"
  add_foreign_key "rate_plans", "properties"
  add_foreign_key "rate_plans", "room_types"
  add_foreign_key "reservation_rooms", "reservations"
  add_foreign_key "reservation_rooms", "room_types"
  add_foreign_key "reservation_rooms", "rooms"
  add_foreign_key "reservations", "guests"
  add_foreign_key "reservations", "properties"
  add_foreign_key "reservations", "rate_plans"
  add_foreign_key "restaurant_tables", "restaurants"
  add_foreign_key "restaurants", "properties"
  add_foreign_key "roles", "companies"
  add_foreign_key "room_types", "properties"
  add_foreign_key "rooms", "properties"
  add_foreign_key "rooms", "room_types"
  add_foreign_key "service_offerings", "properties"
  add_foreign_key "staff_members", "properties"
  add_foreign_key "stock_balances", "inventory_items"
  add_foreign_key "stock_balances", "stores"
  add_foreign_key "stores", "properties"
  add_foreign_key "suppliers", "companies"
  add_foreign_key "tax_configurations", "companies"
  add_foreign_key "user_properties", "properties"
  add_foreign_key "user_properties", "users"
  add_foreign_key "users", "companies"
  add_foreign_key "users", "roles"
  add_foreign_key "users", "staff_members"
end
