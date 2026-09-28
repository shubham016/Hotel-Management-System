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

    @room_type = @property.room_types.create!(name: "Standard", code: "STD-01", slug: "standard", base_price: 2_000, max_adults: 2, max_children: 1, max_occupancy: 3, setup_managed: true)
    @occupied_room = @property.rooms.create!(room_type: @room_type, room_number: "101", status: "OCCUPIED", setup_managed: true)
    @property.rooms.create!(room_type: @room_type, room_number: "102", status: "VACANT_CLEAN", setup_managed: true)
    @property.rooms.create!(room_type: @room_type, room_number: "103", status: "VACANT_DIRTY", setup_managed: true)
    @property.rooms.create!(room_type: @room_type, room_number: "LEGACY-999", status: "OCCUPIED", setup_managed: false)

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

    get "/api/v1/pms/rooms", headers: { "Authorization" => "Bearer #{@token}", "X-Property-Code" => @property.code }, as: :json
    assert_response :success
    room_payload = response.parsed_body
    assert_equal body.dig("occupancy", "totalRooms"), room_payload.dig("summary", "totalRooms")
    assert_equal body.dig("occupancy", "occupiedRooms"), room_payload.dig("summary", "occupied")
    assert_equal body["rooms"].map { |room| [ room["id"], room["status"] ] }.sort,
      room_payload["data"].map { |room| [ room["id"], room["status"] ] }.sort
    assert_not room_payload["data"].any? { |room| room["roomNumber"] == "LEGACY-999" }
  end

  test "live guest counters reflect booking, check-in, and checkout statuses" do
    today = Date.current
    arriving = create_reservation(status: "CONFIRMED", check_in_date: today, check_out_date: today + 1.day, adults_count: 1)
    staying = create_reservation(status: "CHECKED_IN", check_in_date: today, check_out_date: today + 1.day, adults_count: 2, children_count: 1)
    departing = create_reservation(status: "CHECKED_IN", check_in_date: today - 1.day, check_out_date: today, adults_count: 1)

    get "/api/v1/dashboard", headers: auth_headers, as: :json

    assert_response :success
    assert_equal 2, response.parsed_body.dig("guests", "todayArrivals")
    assert_equal 1, response.parsed_body.dig("guests", "todayDepartures")
    assert_equal 4, response.parsed_body.dig("guests", "inHouseGuests")
    assert_equal 0, response.parsed_body.dig("guests", "overdueArrivals")
    assert_equal 0, response.parsed_body.dig("guests", "overdueDepartures")
    assert_equal 1, response.parsed_body.dig("occupancy", "occupiedRooms")

    departing.update!(status: "CHECKED_OUT", checked_out_at: Time.current)
    @occupied_room.update!(status: "VACANT_DIRTY")

    get "/api/v1/dashboard", headers: auth_headers, as: :json

    assert_response :success
    assert_equal 2, response.parsed_body.dig("guests", "todayArrivals")
    assert_equal 1, response.parsed_body.dig("guests", "todayDepartures")
    assert_equal 3, response.parsed_body.dig("guests", "inHouseGuests")
    assert_equal 0, response.parsed_body.dig("occupancy", "occupiedRooms")

    assert arriving.persisted?
    assert staying.persisted?
  end

  test "dashboard exposes overdue arrivals and departures separately from today's schedule" do
    today = Date.current
    create_reservation(status: "INQUIRY", check_in_date: today - 2.days, check_out_date: today - 1.day, adults_count: 1)
    create_reservation(status: "CHECKED_IN", check_in_date: today - 3.days, check_out_date: today - 1.day, adults_count: 1)

    get "/api/v1/dashboard", headers: auth_headers, as: :json

    assert_response :success
    assert_equal 0, response.parsed_body.dig("guests", "todayArrivals")
    assert_equal 0, response.parsed_body.dig("guests", "todayDepartures")
    assert_equal 1, response.parsed_body.dig("guests", "overdueArrivals")
    assert_equal 1, response.parsed_body.dig("guests", "overdueDepartures")
  end

  private

  def auth_headers
    { "Authorization" => "Bearer #{@token}", "X-Property-Code" => @property.code }
  end

  def create_reservation(status:, check_in_date:, check_out_date:, adults_count:, children_count: 0)
    guest = @company.guests.create!(
      first_name: "Dashboard",
      last_name: SecureRandom.hex(4),
      phone: "980000#{rand(1_000..9_999)}"
    )
    @property.reservations.create!(
      guest:,
      confirmation_number: "DASH-#{SecureRandom.hex(6)}",
      source: "ONLINE",
      status:,
      check_in_date:,
      check_out_date:,
      adults_count:,
      children_count:,
      room_total: 0,
      grand_total: 0
    )
  end
end
