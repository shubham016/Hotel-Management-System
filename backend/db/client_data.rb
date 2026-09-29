# Client-supplied sheets in ../pics, transcribed on 2026-09-29.
# Run with: bin/rails runner db/client_data.rb
# Idempotent: historical reservations and folios are never deleted or repriced.
property = Property.find_by!(code: "HNE-BTW")
first_import = !property.room_types.exists?(code: "DORM-NAC-5")

staff_rows = [
  ["Keshav Bhattarai", "All Round"], ["Devi Thapa", "Front Desk"],
  ["Madhab Pant", "Restaurant"], ["Himal Thapa", "Restaurant"],
  ["Samrat Thapa", "Housekeeping"], ["Sarita Thapa", "Housekeeping"],
  ["Bhaktisara Magar", "Housekeeping"], ["Kumar Bache Magar", "Kitchen Cook"],
  ["Prem Bache Magar", "Kitchen Helper"], ["Nisha Darlami", "Cleaning"],
  ["Baje", "Cleaning"], ["Punam Magar", "Dishwasher"]
]

laundry_rows = [
  ["T-Shirt", 100], ["Vest", 100], ["Pants", 100], ["Shirt", 100],
  ["Jacket", 500], ["Coat", 500], ["Kurtha Set", 250],
  ["Sari Set", 500], ["Socks", 50]
]

room_types = [
  # code, name, room-only price, beds, AC, max adults, max children, max guests
  ["DORM-NAC-5", "Dormitory Room", 4_000, 5, false, 5, 0, 5],
  ["STD-NAC-2", "Standard Room Non AC Twin", 1_800, 2, false, 2, 1, 2],
  ["STD-NAC-3", "Standard Room Non AC Triple", 2_000, 3, false, 3, 2, 3],
  ["STD-AC-2", "Standard Room AC Twin", 2_500, 2, true, 2, 1, 2],
  ["STD-AC-3", "Standard Room AC Triple", 3_000, 3, true, 3, 2, 3],
  ["DLX-AC-1", "Deluxe Room AC Single", 3_500, 1, true, 1, 0, 1],
  ["DLX-AC-2", "Deluxe Room AC Twin", 3_500, 2, true, 2, 1, 2],
  ["DLX-AC-3", "Deluxe Room AC Triple", 4_000, 3, true, 3, 2, 3],
  ["SUITE-AC-1", "Suite Room", 5_000, 1, true, 2, 1, 2],
  ["FAMILY-AC-2", "Family Suite Apartment", 15_000, 2, true, 2, 2, 4]
]

room_rows = {
  "DORM-NAC-5" => %w[105],
  "STD-NAC-2" => %w[106 107],
  "STD-NAC-3" => %w[108],
  "STD-AC-2" => %w[203 207 209 210 303 304 306 307 308 309 310],
  "STD-AC-3" => %w[204 205 206 208],
  "DLX-AC-1" => %w[305 402 406 407 408 410 502 506 507 508 510],
  "DLX-AC-2" => %w[302 403 404 405 409 503 504 505],
  "DLX-AC-3" => %w[509],
  "SUITE-AC-1" => %w[202 301 311 501 511],
  "FAMILY-AC-2" => %w[401]
}

raise "Expected 45 unique client rooms" unless room_rows.values.flatten.uniq.size == 45

ActiveRecord::Base.transaction do
  property.update!(laundry_collection_instructions: "Leave bagged laundry on the table and display the Collect my laundry card by 11 a.m.") if property.laundry_collection_instructions.blank?
  property.update!(laundry_return_instructions: "Clean laundry is returned by noon the next day.") if property.laundry_return_instructions.blank?
  property.company.tax_configurations.where(code: "SERVICE_CHARGE").update_all(active: false) if first_import
  vat = property.company.tax_configurations.find_or_initialize_by(code: "VAT", effective_from: Date.new(2020, 1, 1))
  vat.update!(name: "Value Added Tax", rate: 13, calculation_order: 2, inclusive: false, applies_to_rooms: true, active: true) if vat.new_record?
  ["Ground Floor", "1st Floor", "2nd Floor", "3rd Floor", "4th Floor"].each_with_index do |name, index|
    floor = property.floors.find_or_initialize_by(number: index + 1)
    floor.update!(name:, active: true) if floor.new_record?
  end

  types_by_code = {}
  room_types.each do |code, name, price, beds, ac, adults, children, guests|
    type = property.room_types.find_or_initialize_by(code:)
    type.update!(
      name:, slug: name.parameterize, base_price: price || 0,
      description: price ? "Client tariff: NPR #{price} per room per night, exclusive of 13% VAT." : "Tariff pending: the supplied sheet does not price a three-bed Deluxe AC room.",
      bed_category: "Not specified", bed_count: beds,
      max_adults: adults, max_children: children, max_occupancy: guests,
      amenities: ac ? ["Air conditioning"] : [],
      active: price.present?, setup_managed: true
    ) if type.new_record?
    if code == "DLX-AC-3" && type.base_price.zero? && !type.active?
      type.update!(base_price: 4_000, active: true, description: "Client tariff: NPR 4000 per room per night, exclusive of 13% VAT.")
    end
    types_by_code[code] = type
    next unless price

    plan = property.rate_plans.find_or_initialize_by(code: "EP-#{code}")
    plan.update!(room_type: type, name: "Room only - #{name}", price_modifier: 0, active: true) if plan.new_record?
  end

  supplied_numbers = room_rows.values.flatten
  room_rows.each do |code, numbers|
    numbers.each do |number|
      room = property.rooms.find_or_initialize_by(room_number: number)
      if room.new_record?
        room.assign_attributes(room_type: types_by_code.fetch(code), floor: number[0].to_i, setup_managed: true, active: true, status: "VACANT_CLEAN")
        room.save!
      elsif number == "509" && !room.active? && room.room_type_id == types_by_code.fetch(code).id
        room.update!(active: true)
      end
    end
  end

  # Preserve all previously entered rooms and reservation references, but remove
  # rooms absent from the client sheet from saleable inventory.
  if first_import
    property.rooms.setup_managed.where.not(room_number: supplied_numbers).update_all(active: false, setup_managed: false)
    property.room_types.setup_managed.where.not(code: types_by_code.keys).update_all(active: false, setup_managed: false)
  end

  [
    ["BREAKFAST", "Breakfast", 350, "PER_GUEST_PER_NIGHT"],
    ["AIRPORT_TRANSFER", "Airport Pick Up", 2_000, "PER_BOOKING"]
  ].each do |code, name, price, unit|
    service = property.service_offerings.find_or_initialize_by(code:)
    service.update!(name:, unit_price: price, pricing_unit: unit, taxable: true, active: true) if service.new_record?
  end
  property.service_offerings.where(code: "SPA").update_all(active: false) if first_import

  staff_rows.each_with_index do |(name, department), index|
    member = property.staff_members.find_or_initialize_by(source_key: "CLIENT-STAFF-#{index + 1}")
    member.update!(name:, department:, position: index + 1) if member.new_record?
  end

  laundry_rows.each_with_index do |(name, price), index|
    item = property.laundry_items.find_or_initialize_by(source_key: "CLIENT-LAUNDRY-#{index + 1}")
    item.update!(name:, price:, position: index + 1) if item.new_record?
    item.update!(name: "Socks") if index == 8 && item.name == "Shocks"
  end

  home_page = property.company.cms_pages.find_by(property:, slug: "home")
  home_hero = home_page&.cms_sections&.find_by(section_key: "hero")
  if first_import && home_hero&.body_text&.include?("43 rooms")
    home_hero.update!(body_text: home_hero.body_text.sub("43 rooms", "45 listed rooms across 5 levels"))
  end
end

puts "Imported client defaults for 45 rooms, 10 categories, 5 floors, 2 extras, 12 staff, and 9 laundry items; existing edits preserved."
