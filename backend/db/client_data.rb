# Client-supplied sheets in ../pics, transcribed on 2026-09-29.
# Run with: bin/rails runner db/client_data.rb
# Idempotent: historical reservations and folios are never deleted or repriced.
property = Property.find_by!(code: "HNE-BTW")

room_types = [
  ["DORM-NAC-5", "Dormitory Room", 4_000, 5, false],
  ["STD-NAC-2", "Standard Room Non AC Twin", 1_800, 2, false],
  ["STD-NAC-3", "Standard Room Non AC Triple", 2_000, 3, false],
  ["STD-AC-2", "Standard Room AC Twin", 2_500, 2, true],
  ["STD-AC-3", "Standard Room AC Triple", 3_000, 3, true],
  ["DLX-AC-1", "Deluxe Room AC Single", 3_500, 1, true],
  ["DLX-AC-2", "Deluxe Room AC Twin", 3_500, 2, true],
  ["DLX-AC-3", "Deluxe Room AC Triple", nil, 3, true],
  ["SUITE-AC-1", "Suite Room", 5_000, 1, true],
  ["FAMILY-AC-2", "Family Suite Apartment", 15_000, 2, true]
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
  property.company.tax_configurations.where(code: "SERVICE_CHARGE").update_all(active: false)
  vat = property.company.tax_configurations.find_or_initialize_by(code: "VAT", effective_from: Date.new(2020, 1, 1))
  vat.update!(name: "Value Added Tax", rate: 13, calculation_order: 2, inclusive: false, applies_to_rooms: true, active: true)
  ["Ground Floor", "1st Floor", "2nd Floor", "3rd Floor", "4th Floor"].each_with_index do |name, index|
    floor = property.floors.find_or_initialize_by(number: index + 1)
    floor.update!(name:, active: true)
  end

  types_by_code = {}
  room_types.each do |code, name, price, beds, ac|
    type = property.room_types.find_or_initialize_by(code:)
    type.update!(
      name:, slug: name.parameterize, base_price: price || 0,
      description: price ? "Client tariff: NPR #{price} per room per night, exclusive of 13% VAT." : "Tariff pending: the supplied sheet does not price a three-bed Deluxe AC room.",
      bed_category: "Not specified", bed_count: beds,
      max_adults: beds, max_children: 0, max_occupancy: beds,
      amenities: ac ? ["Air conditioning"] : [],
      active: price.present?, setup_managed: true
    )
    types_by_code[code] = type
    next unless price

    plan = property.rate_plans.find_or_initialize_by(code: "EP-#{code}")
    plan.update!(room_type: type, name: "Room only - #{name}", price_modifier: 0, active: true)
  end

  supplied_numbers = room_rows.values.flatten
  room_rows.each do |code, numbers|
    numbers.each do |number|
      room = property.rooms.find_or_initialize_by(room_number: number)
      room.assign_attributes(room_type: types_by_code.fetch(code), floor: number[0].to_i, setup_managed: true, active: code != "DLX-AC-3")
      room.status = "VACANT_CLEAN" if room.new_record?
      room.save!
    end
  end

  # Preserve all previously entered rooms and reservation references, but remove
  # rooms absent from the client sheet from saleable inventory.
  property.rooms.setup_managed.where.not(room_number: supplied_numbers).update_all(active: false, setup_managed: false)
  property.room_types.setup_managed.where.not(code: types_by_code.keys).update_all(active: false, setup_managed: false)

  [
    ["BREAKFAST", "Breakfast", 350, "PER_GUEST_PER_NIGHT"],
    ["AIRPORT_TRANSFER", "Airport Pick Up", 2_000, "PER_BOOKING"]
  ].each do |code, name, price, unit|
    service = property.service_offerings.find_or_initialize_by(code:)
    service.update!(name:, unit_price: price, pricing_unit: unit, taxable: true, active: true)
  end
  property.service_offerings.where(code: "SPA").update_all(active: false)

  home_page = property.company.cms_pages.find_by(property:, slug: "home")
  home_hero = home_page&.cms_sections&.find_by(section_key: "hero")
  if home_hero&.body_text&.include?("43 rooms")
    home_hero.update!(body_text: home_hero.body_text.sub("43 rooms", "45 listed rooms across 5 levels"))
  end
end

puts "Imported 45 client rooms (44 bookable pending room 509 tariff), 10 categories, 5 floors and 2 extras."
