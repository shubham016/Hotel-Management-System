require "test_helper"

class HotelSetupTest < ActionDispatch::IntegrationTest
  setup do
    company = Company.create!(name: "Hotel Setup Test Group", slug: "hotel-setup-test-group")
    @property = company.properties.create!(name: "Hotel Setup Test", code: "SETUP-TEST")
    role = company.roles.create!(name: "SUPER_ADMIN", system: true)
    user = company.users.create!(
      role:,
      email: "setup-owner@example.com",
      password: "Strong-Test-Password-2026!",
      password_confirmation: "Strong-Test-Password-2026!",
      first_name: "Setup",
      last_name: "Owner"
    )
    UserProperty.create!(user:, property: @property)
    post "/api/v1/auth/login", params: { email: user.email, password: "Strong-Test-Password-2026!" }, as: :json
    @headers = {
      "Authorization" => "Bearer #{response.parsed_body.dig('data', 'token')}",
      "X-Property-Code" => @property.code
    }
  end

  test "physical room beds persist and appear in setup catalog and availability without changing category rates" do
    room_type = @property.room_types.create!(name: "Bed Detail Suite", code: "BED-SUITE", slug: "bed-detail-suite", base_price: 5000, bed_category: "Not specified", bed_count: 3, setup_managed: true)
    payload = { room_number: "208", floor: 2, room_type_id: room_type.id, bed_category: "Small double", bed_count: 2, bed_length_inches: 72, bed_width_inches: 48 }
    post "/api/v1/rooms", params: { room: payload }, headers: @headers, as: :json
    assert_response :created
    room = Room.find(response.parsed_body.dig("data", "id"))
    assert_equal "2 Small double beds (6 \u00d7 4 ft)", response.parsed_body.dig("data", "bedLabel")
    assert_equal 2, room.reload.bed_count
    assert_equal 48, room.bed_width_inches
    assert_equal 3, room_type.reload.bed_count
    assert_equal 5000, room_type.base_price
    get "/api/v1/hotel_setup", headers: @headers
    assert_response :success
    assert_equal room.bed_label, response.parsed_body.dig("data", "rooms").first["bedLabel"]
    assert_equal "2", response.parsed_body.dig("data", "roomTypes").first["bed_count_label"]
    get "/api/v1/room_catalog", params: { propertyCode: @property.code }
    assert_response :success
    assert_equal room.bed_label, response.parsed_body["data"].first["bed_label"]
    get "/api/v1/availability", params: { propertyCode: @property.code, checkInDate: "2030-01-01", checkOutDate: "2030-01-02" }
    assert_response :success
    option = response.parsed_body["data"].find { |item| item.dig("roomType", "id") == room_type.id }
    assert_equal room.bed_label, option["rooms"].first["bedLabel"]
    assert_equal room.bed_label, option["roomType"]["bed_label"]
    assert_no_difference "AuditLog.count" do
      patch "/api/v1/rooms/#{room.id}", params: { room: { bed_count: 0 } }, headers: @headers, as: :json
    end
    assert_response :unprocessable_content
    assert_equal 2, room.reload.bed_count
    other = @property.company.properties.create!(name: "Other bed property", code: "OTHER-BED")
    foreign_type = other.room_types.create!(name: "Foreign", code: "FOREIGN", slug: "foreign", base_price: 1)
    foreign = other.rooms.create!(room_type: foreign_type, room_number: "208", floor: 2, setup_managed: true)
    patch "/api/v1/rooms/#{foreign.id}", params: { room: { bed_count: 2 } }, headers: @headers, as: :json
    assert_response :not_found
    assert_nil foreign.reload.bed_count
    patch "/api/v1/rooms/#{room.id}", params: { room: { bed_category: nil, bed_count: nil, bed_length_inches: nil, bed_width_inches: nil } }, headers: @headers, as: :json
    assert_response :success
    assert_equal "3 beds", response.parsed_body.dig("data", "bedLabel")
  end

  test "room category create returns the value persisted in the database" do
    post "/api/v1/room_types", params: {
      room_type: {
        name: "Twin Room",
        code: "TWIN",
        image_url: "https://example.com/twin-room.jpg",
        base_price: 3_500,
        bed_category: "Twin",
        bed_count: 2,
        max_adults: 2,
        max_children: 0,
        amenities: [ "WiFi" ],
        active: true
      }
    }, headers: @headers, as: :json

    assert_response :created
    room_type = RoomType.find(response.parsed_body.dig("data", "id"))
    assert_equal 2, response.parsed_body.dig("data", "bed_count")
    assert_equal 2, room_type.bed_count
    assert_equal "Twin", room_type.bed_category
    assert_equal "https://example.com/twin-room.jpg", room_type.image_url
    assert_equal room_type.image_url, response.parsed_body.dig("data", "image_url")
  end

  test "public room category catalog returns active setup values without authentication" do
    active = @property.room_types.create!(
      name: "Dynamic Family Room",
      code: "FAMILY",
      slug: "dynamic-family-room",
      description: "A description entered in Hotel Setup",
      image_url: "https://example.com/family-room.jpg",
      base_price: 6_250,
      bed_category: "Queen",
      bed_count: 2,
      max_adults: 3,
      max_children: 2,
      max_occupancy: 5,
      amenities: [ "WiFi", "Balcony" ],
      setup_managed: true,
      active: true
    )
    @property.room_types.create!(
      name: "Hidden Room",
      code: "HIDDEN",
      slug: "hidden-room",
      base_price: 1_000,
      bed_category: "Single",
      setup_managed: true,
      active: false
    )

    get "/api/v1/room_catalog?propertyCode=#{@property.code}"

    assert_response :success
    assert_equal [ active.id ], response.parsed_body["data"].pluck("id")
    category = response.parsed_body["data"].first
    assert_equal "A description entered in Hotel Setup", category["description"]
    assert_equal active.image_url, category["image_url"]
    assert_equal 6_250.0, category["base_price"].to_f
    assert_equal "Queen", category["bed_category"]
    assert_equal 2, category["bed_count"]
    assert_equal 3, category["max_adults"]
    assert_equal 2, category["max_children"]
    assert_equal 5, category["max_occupancy"]
    assert_equal [ "WiFi", "Balcony" ], category["amenities"]
  end

  test "setup snapshot returns all master data in one request" do
    @property.floors.create!(number: 1, name: "First Floor")
    room_type = @property.room_types.create!(
      name: "Twin Room",
      code: "TWIN",
      image_url: "https://example.com/twin-room.jpg",
      slug: "twin-room",
      base_price: 3_500,
      bed_category: "Twin",
      bed_count: 2,
      max_adults: 2,
      max_children: 0,
      max_occupancy: 2,
      setup_managed: true
    )
    @property.rooms.create!(room_type:, room_number: "101", floor: 1, setup_managed: true)

    get "/api/v1/hotel_setup", headers: @headers, as: :json

    assert_response :success
    assert_equal 1, response.parsed_body.dig("data", "floors").length
    assert_equal 2, response.parsed_body.dig("data", "roomTypes", 0, "bed_count")
    assert_equal "Twin", response.parsed_body.dig("data", "roomTypes", 0, "bed_category")
    assert_equal room_type.image_url, response.parsed_body.dig("data", "roomTypes", 0, "image_url")
    assert_equal "101", response.parsed_body.dig("data", "rooms", 0, "roomNumber")
  end

  test "room category update returns the value persisted in the database" do
    room_type = @property.room_types.create!(
      name: "Deluxe Room",
      code: "DLX",
      slug: "deluxe-room",
      base_price: 4_200,
      bed_category: "King",
      bed_count: 1,
      max_adults: 2,
      max_children: 1,
      max_occupancy: 3,
      setup_managed: true
    )

    patch "/api/v1/room_types/#{room_type.id}", params: {
      room_type: { bed_category: "Triple", bed_count: 3 }
    }, headers: @headers, as: :json

    assert_response :success
    assert_equal 3, response.parsed_body.dig("data", "bed_count")
    assert_equal 3, room_type.reload.bed_count
    assert_equal "Triple", room_type.bed_category
  end

  test "room category capacity uses zero for a blank adult or child value" do
    post "/api/v1/room_types", params: {
      room_type: {
        name: "Adults Only Room",
        code: "ADULTS-ONLY",
        base_price: 3_000,
        bed_category: "Double",
        bed_count: 1,
        max_adults: 2,
        max_children: "",
        amenities: [],
        active: true
      }
    }, headers: @headers, as: :json

    assert_response :created
    room_type = RoomType.find(response.parsed_body.dig("data", "id"))
    assert_equal 2, response.parsed_body.dig("data", "max_occupancy")
    assert_equal 2, room_type.max_occupancy
    assert_equal 0, room_type.max_children

    patch "/api/v1/room_types/#{room_type.id}", params: {
      room_type: { max_adults: "", max_children: 3 }
    }, headers: @headers, as: :json

    assert_response :success
    assert_equal 3, response.parsed_body.dig("data", "max_occupancy")
    assert_equal 3, room_type.reload.max_occupancy
    assert_equal 0, room_type.max_adults
  end

  test "all rooms on a floor can be updated together from persisted values" do
    original_type = @property.room_types.create!(name: "Standard", code: "STD", slug: "standard", base_price: 2_000, bed_category: "Double", setup_managed: true)
    new_type = @property.room_types.create!(name: "Deluxe", code: "DLX", slug: "deluxe", base_price: 3_000, bed_category: "King", setup_managed: true)
    rooms = %w[101 102].map { |number| @property.rooms.create!(room_type: original_type, room_number: number, floor: 1, setup_managed: true) }

    patch "/api/v1/rooms/floor/1", params: {
      rooms: { floor: 2, room_type_id: new_type.id, status: "VACANT_DIRTY", smoking: true }
    }, headers: @headers, as: :json

    assert_response :success
    assert_equal 2, response.parsed_body["data"].length
    rooms.each do |room|
      room.reload
      assert_equal 2, room.floor
      assert_equal new_type.id, room.room_type_id
      assert_equal "VACANT_DIRTY", room.status
      assert room.smoking
    end
    assert_equal rooms.map(&:id).sort, response.parsed_body["data"].pluck("id").sort
  end

  test "staff laundry and extras edits persist and feed the client reference" do
    post "/api/v1/staff_members", params: { staff_member: { name: "Devi Thapa", department: "Front Desk", position: 1 } }, headers: @headers, as: :json
    assert_response :created
    staff_id = response.parsed_body.dig("data", "id")
    patch "/api/v1/staff_members/#{staff_id}", params: { staff_member: { department: "Reception" } }, headers: @headers, as: :json
    assert_response :success
    assert_equal "Reception", StaffMember.find(staff_id).department

    post "/api/v1/laundry_items", params: { laundry_item: { name: "T-Shirt", price: 100, position: 1 } }, headers: @headers, as: :json
    assert_response :created
    laundry_id = response.parsed_body.dig("data", "id")
    patch "/api/v1/laundry_items/#{laundry_id}", params: { laundry_item: { price: 125 } }, headers: @headers, as: :json
    assert_response :success
    assert_equal 125, LaundryItem.find(laundry_id).price

    post "/api/v1/service_offerings", params: { service_offering: { code: "BREAKFAST", name: "Breakfast", unit_price: 350, pricing_unit: "PER_GUEST_PER_NIGHT", taxable: true } }, headers: @headers, as: :json
    assert_response :created
    extra_id = response.parsed_body.dig("data", "id")
    patch "/api/v1/service_offerings/#{extra_id}", params: { service_offering: { unit_price: 375 } }, headers: @headers, as: :json
    assert_response :success
    assert_equal 375, ServiceOffering.find(extra_id).unit_price

    get "/api/v1/client_reference", headers: @headers, as: :json
    assert_response :success
    assert_equal "Reception", response.parsed_body.dig("data", "staff", 0, "department")
    assert_equal 125.0, response.parsed_body.dig("data", "laundry", 0, "price").to_f
    assert_equal 375.0, response.parsed_body.dig("data", "extras", 0, "unit_price").to_f

    delete "/api/v1/laundry_items/#{laundry_id}", headers: @headers, as: :json
    assert_response :success
    assert_not LaundryItem.find(laundry_id).active?
  end

  test "property and tax settings save to the database" do
    get "/api/v1/hotel_settings", headers: @headers, as: :json
    assert_response :success
    assert_equal "Hotel Setup Test", response.parsed_body.dig("data", "property", "name")

    patch "/api/v1/hotel_settings", params: {
      property: { name: "Updated Hotel", check_out_time: "11:00", laundry_return_instructions: "Return by 10 a.m." },
      vat: { rate: 10, active: false, inclusive: false },
      service_charge: { rate: 10, active: true }
    }, headers: @headers, as: :json

    assert_response :success
    assert_equal "Updated Hotel", @property.reload.name
    assert_equal "11:00", @property.check_out_time
    assert_equal "Return by 10 a.m.", @property.laundry_return_instructions
    assert_equal 13, @property.company.tax_configurations.find_by!(code: "VAT").rate
    assert_nil @property.company.tax_configurations.find_by(code: "SERVICE_CHARGE")
  end

  test "client import preserves later staff laundry extra room and tax edits" do
    property = @property.company.properties.create!(name: "Client Import Test", code: "HNE-BTW")
    load Rails.root.join("db/client_data.rb")

    staff = property.staff_members.find_by!(source_key: "CLIENT-STAFF-1")
    laundry = property.laundry_items.find_by!(source_key: "CLIENT-LAUNDRY-1")
    breakfast = property.service_offerings.find_by!(code: "BREAKFAST")
    room_type = property.room_types.find_by!(code: "DLX-AC-3")
    vat = property.company.tax_configurations.find_by!(code: "VAT")
    staff.update!(name: "Edited Staff")
    laundry.update!(price: 175)
    breakfast.update!(unit_price: 425)
    room_type.update!(base_price: 4_500)
    vat.update!(rate: 12)

    load Rails.root.join("db/client_data.rb")

    assert_equal "Edited Staff", staff.reload.name
    assert_equal 175, laundry.reload.price
    assert_equal 425, breakfast.reload.unit_price
    assert_equal 4_500, room_type.reload.base_price
    assert_equal 12, vat.reload.rate
    assert_equal 12, property.staff_members.count
    assert_equal 9, property.laundry_items.count
  end
end
