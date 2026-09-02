require "test_helper"

class DashboardTest < ActionDispatch::IntegrationTest
  setup do
    @company = Company.create!(name: "Test Hotel Group", slug: "dashboard-test-group")
    @property = @company.properties.create!(name: "Test Hotel", code: "TEST-DASH")
    @role = @company.roles.create!(name: "SUPER_ADMIN", system: true)
    @user = @company.users.create!(
      role: @role,
      email: "gm@example.com",
      password: "Strong-Test-Password-2026!",
      password_confirmation: "Strong-Test-Password-2026!",
      first_name: "General",
      last_name: "Manager"
    )
    UserProperty.create!(user: @user, property: @property)

    @room_type = @property.room_types.create!(name: "Standard", code: "STD-01", slug: "standard", base_price: 2_000, max_adults: 2, max_children: 1, max_occupancy: 3)
    @property.rooms.create!(room_type: @room_type, room_number: "101", status: "OCCUPIED")
    @property.rooms.create!(room_type: @room_type, room_number: "102", status: "VACANT_CLEAN")
    @property.rooms.create!(room_type: @room_type, room_number: "103", status: "VACANT_DIRTY")

    post "/api/v1/auth/login", params: { email: @user.email, password: "Strong-Test-Password-2026!" }, as: :json
    @token = response.parsed_body.dig("data", "token")
  end

  test "returns occupancy and housekeeping counts computed from real room records" do
    get "/api/v1/dashboard", headers: { "Authorization" => "Bearer #{@token}", "X-Property-Code" => @property.code }, as: :json

    assert_response :success
    body = response.parsed_body
    assert body["success"]
    assert_equal 3, body.dig("occupancy", "totalRooms")
    assert_equal 1, body.dig("occupancy", "occupiedRooms")
    assert_in_delta 33.3, body.dig("occupancy", "occupancyPct"), 0.1
    assert_equal 1, body.dig("housekeeping", "clean")
    assert_equal 1, body.dig("housekeeping", "dirty")
    assert_equal 0, body.dig("revenue", "today", "total")
    assert_equal 7, body.dig("trends", "arrivals").length
    assert_equal 7, body.dig("trends", "revenue").length
    assert_equal 0, body.dig("pos", "ordersToday")
  end
end
