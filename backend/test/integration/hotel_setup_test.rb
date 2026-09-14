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
  end

  test "setup snapshot returns all master data in one request" do
    @property.floors.create!(number: 1, name: "First Floor")
    room_type = @property.room_types.create!(
      name: "Twin Room",
      code: "TWIN",
      slug: "twin-room",
      base_price: 3_500,
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
    assert_equal "101", response.parsed_body.dig("data", "rooms", 0, "roomNumber")
  end

  test "room category update returns the value persisted in the database" do
    room_type = @property.room_types.create!(
      name: "Deluxe Room",
      code: "DLX",
      slug: "deluxe-room",
      base_price: 4_200,
      bed_count: 1,
      max_adults: 2,
      max_children: 1,
      max_occupancy: 3,
      setup_managed: true
    )

    patch "/api/v1/room_types/#{room_type.id}", params: {
      room_type: { bed_count: 3 }
    }, headers: @headers, as: :json

    assert_response :success
    assert_equal 3, response.parsed_body.dig("data", "bed_count")
    assert_equal 3, room_type.reload.bed_count
  end
end
