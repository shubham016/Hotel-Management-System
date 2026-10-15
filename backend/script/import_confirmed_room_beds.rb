require "json"

source = JSON.parse(File.read(Rails.root.join("config/confirmed_room_beds.json")))
property = Property.find_by!(code: source.fetch("property_code"), active: true)
fields = %w[bed_category bed_count bed_length_inches bed_width_inches]
rows = source.fetch("rooms")
raise "Unexpected confirmed inventory" unless rows.size == 45 && rows.sum { |row| row.fetch("bed_count") } == 82 && rows.map { |row| row.fetch("room_number") }.uniq.size == 45

property.with_lock do
  rooms = property.rooms.setup_managed.active.where(room_number: rows.map { |row| row.fetch("room_number") }).lock.index_by(&:room_number)
  raise "Some confirmed rooms are missing or inactive" unless rooms.size == rows.size
  before = rooms.values.to_h { |room| [room.id, room.attributes] }
  types_before = property.room_types.map(&:attributes)
  plans_before = property.rate_plans.map(&:attributes)
  reservations_before = ReservationRoom.where(room_id: rooms.values.map(&:id)).map(&:attributes)
  rows.each do |row|
    room = rooms.fetch(row.fetch("room_number"))
    room.assign_attributes(row.slice(*fields))
    raise "Invalid details for room #{room.room_number}: #{room.errors.full_messages.join(', ')}" unless room.valid?
  end
  if ARGV.include?("--apply")
    backup = Rails.root.join("tmp/room_beds_before_#{Time.current.strftime('%Y%m%d_%H%M%S')}.json")
    File.write(backup, JSON.pretty_generate(before))
    rooms.values.each do |room|
      next unless room.changed?
      old_values = before.fetch(room.id).slice(*fields)
      room.save!
      AuditLog.create!(company: property.company, property: property, module_name: "ROOM_SETUP", action: "UPDATE_BEDS", entity_type: "Room", entity_id: room.id,
        old_values: old_values, new_values: room.attributes.slice(*fields).merge("sources" => source.fetch("sources")))
    end
    rooms.values.each do |room|
      room.reload
      raise "Other room settings changed" unless room.attributes.except(*fields, "updated_at") == before.fetch(room.id).except(*fields, "updated_at")
    end
    raise "Room categories or rates changed" unless property.room_types.map(&:attributes) == types_before && property.rate_plans.map(&:attributes) == plans_before
    raise "Reservation associations changed" unless ReservationRoom.where(room_id: rooms.values.map(&:id)).map(&:attributes) == reservations_before
    raise "Bed details did not persist" unless rows.all? { |row| rooms.fetch(row.fetch("room_number")).attributes.slice(*fields) == row.slice(*fields) }
    puts "Updated and verified 45 rooms / 82 beds. Room categories, prices, capacities, statuses and reservations preserved."
  else
    puts "Validated 45 rooms / 82 beds. Run with --apply to save."
  end
end
