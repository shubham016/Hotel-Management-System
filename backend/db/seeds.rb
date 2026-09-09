company = Company.find_or_initialize_by(slug: "hotel-new-era")
company.update!(name: "Hotel New Era Pvt. Ltd.", currency_code: "NPR", timezone: "Asia/Kathmandu", active: true)

property = company.properties.find_or_initialize_by(code: "HNE-BTW")
property.update!(
  name: "Hotel New Era - Butwal",
  address: "Kalikapath, New Buspark, Butwal-8",
  city: "Butwal",
  country: "Nepal",
  phone: "+977-71-000000",
  email: "info@hotelnewera.com",
  check_in_time: "14:00",
  check_out_time: "12:00",
  active: true
)

# SUPER_ADMIN retains the historical "view every module" permissions hash and is reserved
# for the future cross-tenant Super Admin portal (Phase 7). No user is assigned this role
# today — it bypasses authorize! by name (base_controller.rb) so its permissions hash is
# never actually exercised, and must not be used as a template for a real scoped role.
super_admin_role = company.roles.find_or_initialize_by(name: "SUPER_ADMIN")
super_admin_role.update!(
  system: true,
  permissions: {
    "ROOMS" => %w[view create update delete],
    "RESERVATIONS" => %w[view create update cancel],
    "USERS" => %w[view create update delete],
    "ACCOUNTING" => %w[view create approve post export],
    "PMS_ROOMS" => %w[view update],
    "FRONT_DESK" => %w[view checkin checkout],
    "GUEST_FOLIO" => %w[view update payment],
    "CMS" => %w[view create update delete],
    "CRM" => %w[view create update],
    "HOUSEKEEPING" => %w[view update],
    "INVENTORY" => %w[view update],
    "POS" => %w[view create],
    "PROCUREMENT" => %w[view create],
    "BANQUET" => %w[view create],
    "GENERAL_LEDGER" => %w[view create post]
  }
)

# OWNER is the real, permission-checked property-owner role (does not bypass authorize!).
# Module/action pairs below were derived by auditing every controller's inferred
# authorization module (backend/app/controllers/api/v1/base_controller.rb#inferred_authorization_module,
# which is the last segment of controller_path, e.g. Api::V1::Crm::GuestsController -> "GUESTS")
# and every explicit `self.authorization_module_name` override, plus every custom route action
# name (e.g. reservations#check_in requires BOTH "RESERVATIONS" and "PMS_FRONTDESK" checks).
# Docs: docs/plans/IMPLEMENTATION_PLAN_v3.0_OWNER_PORTAL.md, docs/CONVERSATION.md 2026-09-02.
owner_role = company.roles.find_or_initialize_by(name: "OWNER")
owner_role.update!(
  system: true,
  permissions: {
    "CHART_OF_ACCOUNTS" => %w[read create],
    "JOURNALS" => %w[read create],
    "REPORTS" => %w[read],
    "AUDIT_LOGS" => %w[read],
    "BOOKINGS" => %w[read create],
    "PAGES" => %w[read create],
    "OFFERS" => %w[read create delete],
    "GUESTS" => %w[read create],
    "CONTACT_INQUIRIES" => %w[create],
    "DASHBOARD" => %w[read],
    "NOTIFICATIONS" => %w[read update],
    "PROPERTIES" => %w[read],
    "ROOM_TYPES" => %w[read],
    "ROOMS" => %w[read update],
    "AVAILABILITY" => %w[read],
    "TASKS" => %w[read create],
    "SESSIONS" => %w[read],
    "ITEMS" => %w[read create],
    "RESERVATIONS" => %w[read update cancel assign_room check_in extend_stay transfer_room],
    "PMS_FRONTDESK" => %w[read create check_in extend_stay transfer_room],
    "FOLIOS" => %w[create],
    "CHECKOUT" => %w[create],
    "NIGHT_AUDIT" => %w[read create],
    "TABLES" => %w[read],
    "MENU_ITEMS" => %w[read],
    "BILLING" => %w[create],
    "ORDERS" => %w[read create]
  }
)

admin_password = ENV["SEED_ADMIN_PASSWORD"].presence
if admin_password.blank?
  raise "SEED_ADMIN_PASSWORD is required in production" if Rails.env.production?

  admin_password = "ChangeMe-Admin-2026!"
end

admin = company.users.find_or_initialize_by(email: "admin@hotelnewera.com")
admin.assign_attributes(
  role: owner_role,
  first_name: "System",
  last_name: "Administrator",
  password: admin_password,
  password_confirmation: admin_password,
  active: true
)
admin.save!
UserProperty.find_or_create_by!(user: admin, property:)

[
  { code: "SERVICE_CHARGE", name: "Hotel Service Charge", rate: 10, calculation_order: 1 },
  { code: "VAT", name: "Value Added Tax", rate: 13, calculation_order: 2 }
].each do |attributes|
  tax = company.tax_configurations.find_or_initialize_by(code: attributes[:code], effective_from: Date.new(2020, 1, 1))
  tax.update!(attributes.merge(inclusive: false, applies_to_rooms: true, active: true))
end

room_type_definitions = [
  { code: "LUX-01", slug: "luxury-room", name: "Luxury Room", base_price: 5_500, count: 8, max_adults: 2, max_children: 1 },
  { code: "DLX-01", slug: "deluxe-room", name: "Deluxe Room", base_price: 4_200, count: 12, max_adults: 2, max_children: 1 },
  { code: "FAM-01", slug: "family-room", name: "Family Room", base_price: 6_500, count: 6, max_adults: 4, max_children: 2 },
  { code: "HNY-01", slug: "honeymoon-room", name: "Honeymoon Room", base_price: 7_000, count: 3, max_adults: 2, max_children: 0 },
  { code: "STD-AC", slug: "standard-ac-room", name: "Standard AC Room", base_price: 3_200, count: 8, max_adults: 2, max_children: 1 },
  { code: "STD-01", slug: "standard-room", name: "Standard Room", base_price: 2_200, count: 6, max_adults: 2, max_children: 1 }
]

room_numbers = [
  *(101..109),
  *(201..209),
  *(301..309),
  *(400..407),
  *(501..508)
]
demo_room_statuses = {
  "101" => "OCCUPIED",
  "102" => "VACANT_DIRTY",
  "103" => "OCCUPIED",
  "104" => "OUT_OF_ORDER",
  "105" => "OCCUPIED",
  "106" => "OUT_OF_ORDER",
  "201" => "OCCUPIED",
  "202" => "INSPECTION_REQUIRED",
  "203" => "OUT_OF_ORDER",
  "204" => "VACANT_DIRTY",
  "205" => "OUT_OF_ORDER",
  "301" => "INSPECTION_REQUIRED",
  "302" => "OUT_OF_ORDER",
  "303" => "INSPECTION_REQUIRED",
  "400" => "VACANT_DIRTY",
  "401" => "OCCUPIED",
  "402" => "VACANT_DIRTY",
  "403" => "VACANT_CLEAN",
  "501" => "OCCUPIED",
  "502" => "VACANT_DIRTY",
  "503" => "INSPECTION_REQUIRED",
  "504" => "OUT_OF_ORDER"
}
room_type_definitions.each do |definition|
  room_type = property.room_types.find_or_initialize_by(code: definition[:code])
  room_type.update!(
    name: definition[:name],
    slug: definition[:slug],
    description: "#{definition[:name]} at Hotel New Era",
    base_price: definition[:base_price],
    max_adults: definition[:max_adults],
    max_children: definition[:max_children],
    max_occupancy: definition[:max_adults] + definition[:max_children],
    amenities: %w[WiFi AttachedBathroom Housekeeping],
    active: true
  )

  rate_plan = property.rate_plans.find_or_initialize_by(code: "EP-#{definition[:code]}")
  rate_plan.update!(
    room_type:,
    name: "European Plan - #{definition[:name]}",
    price_modifier: 0,
    cancellation_policy: "Cancellation terms are confirmed with the booking quotation.",
    active: true
  )

  definition[:count].times do
    number = room_numbers.shift.to_s
    room = property.rooms.find_or_initialize_by(room_number: number)
    room.update!(room_type:, floor: number.first.to_i, status: demo_room_statuses.fetch(number, "VACANT_CLEAN"), active: true)
  end
end

[
  { code: "BREAKFAST", name: "Breakfast", unit_price: 1_200, pricing_unit: "PER_GUEST_PER_NIGHT" },
  { code: "AIRPORT_TRANSFER", name: "Airport Transfer", unit_price: 2_500, pricing_unit: "PER_BOOKING" },
  { code: "SPA", name: "Wellness Experience", unit_price: 4_000, pricing_unit: "PER_BOOKING" }
].each do |attributes|
  offering = property.service_offerings.find_or_initialize_by(code: attributes[:code])
  offering.update!(attributes.merge(taxable: true, active: true))
end

[ "Cash / Bank", "Accounts Receivable", "VAT Payable", "Service Charge Payable", "Owner Equity", "Room Revenue", "F&B Revenue", "Banquet Revenue", "Cost of Sales", "Operating Expense" ].each_with_index do |name, index|
  codes = %w[1001 1100 2100 2101 3000 4001 4002 4004 5001 6001]
  categories = %w[ASSET ASSET LIABILITY LIABILITY EQUITY REVENUE REVENUE REVENUE COST_OF_SALES EXPENSE]
  account = company.accounts.find_or_initialize_by(account_code: codes[index])
  account.update!(name:, category: categories[index], active: true)
end

main_store = property.stores.find_or_initialize_by(code: "MAIN")
main_store.update!(name: "Main Central Store")

[
  { item_code: "HK-LINEN", name: "Room Linen Set", category: "HOUSEKEEPING", unit_of_measure: "set", standard_cost: 1_200, min_reorder_level: 20, quantity: 60 },
  { item_code: "FB-RICE", name: "Jeera Masino Rice", category: "FOOD", unit_of_measure: "kg", standard_cost: 140, min_reorder_level: 50, quantity: 180 },
  { item_code: "FB-TEA", name: "Nepali Tea", category: "BEVERAGE", unit_of_measure: "kg", standard_cost: 850, min_reorder_level: 10, quantity: 25 }
].each do |attributes|
  quantity = attributes.delete(:quantity)
  item = company.inventory_items.find_or_initialize_by(item_code: attributes[:item_code])
  item.update!(attributes)
  balance = item.stock_balances.find_or_initialize_by(store: main_store)
  balance.update!(quantity_on_hand: quantity)
end

[
  { name: "Butwal Fresh Suppliers", phone: "+977-9800001000" },
  { name: "Lumbini Hospitality Traders", phone: "+977-9800002000" }
].each do |attributes|
  supplier = company.suppliers.find_or_initialize_by(name: attributes[:name])
  supplier.update!(attributes)
end

dhiki = property.restaurants.find_or_initialize_by(outlet_code: "DHIKI-REST")
dhiki.update!(name: "Dhiki Restaurant & Bhojangriha", active: true)
terrace = property.restaurants.find_or_initialize_by(outlet_code: "TERRACE-BAR")
terrace.update!(name: "New Era Terrace Lounge & Bar", active: true)
[ dhiki, terrace ].each do |restaurant|
  (1..8).each do |number|
    table = restaurant.restaurant_tables.find_or_initialize_by(table_number: number.to_s.rjust(2, "0"))
    table.update!(capacity: number <= 2 ? 2 : 4, status: "AVAILABLE")
  end

  [
    { name: "Royal Thakali Mutton Khana Set", category: "Nepali", price: 950 },
    { name: "Bhojangriha Charcoal Sekuwa", category: "Nepali", price: 750 },
    { name: "Palpali Chukauni & Batuk", category: "Nepali", price: 450 },
    { name: "Claypot Tandoori Chicken (Half)", category: "Tandoor", price: 850 },
    { name: "New Era Sizzler (Chicken / Paneer)", category: "Continental", price: 950 },
    { name: "Woodfired Truffle Mushroom Pizza", category: "Continental", price: 850 },
    { name: "Lumbini Sunset Signature Cocktail", category: "Bar", price: 750 },
    { name: "Everest Craft Beer (Bottle)", category: "Bar", price: 550 },
    { name: "Single-Estate Palpa Coffee / Espresso", category: "Cafe", price: 250 }
  ].each do |attributes|
    menu_item = restaurant.menu_items.find_or_initialize_by(name: attributes[:name])
    menu_item.update!(category: attributes[:category], price: attributes[:price], active: true)
  end
end

[
  { code: "NILKANTHA-01", name: "Nilkantha Grand Ballroom", theater_capacity: 300, base_rent: 35_000 },
  { code: "TULKI-01", name: "Tulki Devi Conference Hall", theater_capacity: 120, base_rent: 18_000 },
  { code: "DEVAKALA-01", name: "Devakala Executive Suite", theater_capacity: 60, base_rent: 12_000 }
].each do |attributes|
  hall = property.banquet_halls.find_or_initialize_by(code: attributes[:code])
  hall.update!(attributes.merge(active: true))
end

puts "Seeded #{company.name}, #{property.rooms.count} rooms, and admin@hotelnewera.com"
