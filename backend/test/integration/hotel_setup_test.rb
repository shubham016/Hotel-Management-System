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

  test "room category create returns the value persisted in the database" do
    post "/api/v1/room_types", params: {
      room_type: {
        name: "Twin Room",
        code: "TWIN",
        base_price: 3_500,
        bed_category: "Twin",
        bed_count: 2,
        max_adults: 2,
        max_children: 0,
        amenities: ["WiFi"],
        active: true
      }
    }, headers: @headers, as: :json

    assert_response :created
    room_type = RoomType.find(response.parsed_body.dig("data", "id"))
    assert_equal 2, response.parsed_body.dig("data", "bed_count")
    assert_equal 2, room_type.bed_count
    assert_equal "Twin", room_type.bed_category
  end

  test "setup snapshot returns all master data in one request" do
    @property.floors.create!(number: 1, name: "First Floor")
    room_type = @property.room_types.create!(
      name: "Twin Room",
      code: "TWIN",
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
end
