require "test_helper"

class ReservationsTest < ActionDispatch::IntegrationTest
  setup do
    @company = Company.create!(name: "Test Hotel Group", slug: "reservation-test-group")
    @property = @company.properties.create!(name: "Test Hotel", code: "TEST-PROPERTY")
    @room_type = @property.room_types.create!(
      name: "Deluxe Room",
      code: "DLX-01",
      slug: "deluxe-room",
      base_price: 4_000,
      max_adults: 2,
      max_children: 1,
      max_occupancy: 3,
      setup_managed: true
    )
    @first_room = @property.rooms.create!(room_type: @room_type, room_number: "101", setup_managed: true)
    @second_room = @property.rooms.create!(room_type: @room_type, room_number: "102", setup_managed: true)
    @property.rate_plans.create!(room_type: @room_type, name: "Room Only", code: "EP-DLX", price_modifier: 0)
    @role = @company.roles.create!(name: "SUPER_ADMIN", system: true)
    @user = @company.users.create!(
      role: @role,
      email: "frontdesk@example.com",
      password: "Strong-Test-Password-2026!",
      password_confirmation: "Strong-Test-Password-2026!",
      first_name: "Front",
      last_name: "Desk"
    )
    UserProperty.create!(user: @user, property: @property)
    @company.tax_configurations.create!(
      code: "SERVICE_CHARGE",
      name: "Service Charge",
      rate: 10,
      effective_from: Date.new(2020, 1, 1),
      calculation_order: 1
    )
    @company.tax_configurations.create!(
      code: "VAT",
      name: "VAT",
      rate: 13,
      effective_from: Date.new(2020, 1, 1),
      calculation_order: 2
    )
    @property.service_offerings.create!(
      code: "BREAKFAST",
      name: "Breakfast",
      unit_price: 1_000,
      pricing_unit: "PER_GUEST_PER_NIGHT"
    )
    @check_in = Date.current + 5.days
    @check_out = @check_in + 2.days
  end

  test "reservation uses server pricing and creates an atomic folio" do
    assert_difference [ "Reservation.count", "ReservationRoom.count", "Folio.count", "AuditLog.count" ], 1 do
      post "/api/v1/reservations", params: valid_payload.merge(grandTotal: 1), as: :json
    end

    assert_response :created
    body = response.parsed_body
    assert body["success"]
    assert_equal 14_916.0, body.dig("data", "grandTotal")
    assert_equal "PENDING", body.dig("data", "paymentStatus")
    assert_match(/^RES-TEST-PROPERTY-\d{4}-\d{6}$/, body.dig("data", "confirmationNumber"))
    assert_equal body.dig("data", "grandTotal"), Reservation.last.grand_total.to_f
    assert_equal Reservation.last.grand_total, Folio.last.balance_due
  end

  test "overlapping reservation cannot exceed sellable inventory" do
    post "/api/v1/reservations", params: valid_payload.merge(roomsCount: 2), as: :json
    assert_response :created

    post "/api/v1/reservations", params: valid_payload.merge(phone: "+977-9800000002"), as: :json
    assert_response :conflict
    assert_equal "ROOM_UNAVAILABLE", response.parsed_body["code"]
  end

  test "website and front desk share exact-room inventory until checkout" do
    post "/api/v1/reservations", params: valid_payload.merge(
      roomId: @second_room.id,
      phone: "+977-9800000003"
    ), as: :json

    assert_response :created
    body = response.parsed_body
    reservation = Reservation.find(body.dig("data", "id"))
    assert_equal "DIRECT_WEB", reservation.source
    assert_equal @second_room.id, reservation.reservation_rooms.first.room_id
    assert_equal @second_room.room_number, body.dig("data", "roomNumber")
    assert_equal "RESERVED", @second_room.reload.status

    post "/api/v1/reservations", params: valid_payload.merge(
      roomId: @second_room.id,
      phone: "+977-9800000004",
      source: "WALK_IN"
    ), as: :json

    assert_response :conflict
    assert_equal "ROOM_UNAVAILABLE", response.parsed_body["code"]

    post "/api/v1/folio", params: {
      operation: "SETTLE_AND_CHECKOUT",
      folioId: reservation.folio.id,
      settlementMethod: "CASH"
    }, headers: auth_headers(auth_token), as: :json
    assert_response :success, response.body
    assert_equal "CHECKED_OUT", reservation.reload.status

    post "/api/v1/reservations", params: valid_payload.merge(
      roomId: @second_room.id,
      phone: "+977-9800000005",
      source: "WALK_IN"
    ), as: :json
    assert_response :created
    assert_equal "WALK_IN", Reservation.find(response.parsed_body.dig("data", "id")).source
  end

  test "public availability returns exact rooms and removes a reserved room" do
    get "/api/v1/availability?propertyCode=#{@property.code}&checkInDate=#{@check_in.iso8601}&checkOutDate=#{@check_out.iso8601}&adultsCount=2&childrenCount=0"

    assert_response :success, response.body
    assert_equal [ @first_room.id, @second_room.id ], response.parsed_body.dig("data", 0, "rooms").pluck("id")

    post "/api/v1/reservations", params: valid_payload.merge(roomId: @first_room.id), as: :json
    assert_response :created

    get "/api/v1/availability?propertyCode=#{@property.code}&checkInDate=#{@check_in.iso8601}&checkOutDate=#{@check_out.iso8601}&adultsCount=2&childrenCount=0"

    assert_response :success
    assert_equal [ @second_room.id ], response.parsed_body.dig("data", 0, "rooms").pluck("id")
  end

  test "protected reservation lifecycle supports modify assign checkin extend transfer and cancel" do
    token = auth_token

    post "/api/v1/reservations", params: valid_payload.merge(phone: "+977-9800000011"), as: :json
    assert_response :created
    reservation = Reservation.find(response.parsed_body.dig("data", "id"))

    patch "/api/v1/reservations/#{reservation.id}",
      params: { checkOutDate: (@check_out + 1.day).iso8601, adultsCount: 1 },
      headers: auth_headers(token),
      as: :json
    assert_response :success
    assert_equal @check_out + 1.day, reservation.reload.check_out_date

    patch "/api/v1/reservations/#{reservation.id}/assign-room",
      params: { roomId: @second_room.id },
      headers: auth_headers(token),
      as: :json
    assert_response :success
    assert_equal "RESERVED", @second_room.reload.status

    patch "/api/v1/reservations/#{reservation.id}/check-in",
      params: { roomId: @second_room.id },
      headers: auth_headers(token),
      as: :json
    assert_response :success
    assert_equal "CHECKED_IN", reservation.reload.status
    assert_equal "OCCUPIED", @second_room.reload.status

    patch "/api/v1/reservations/#{reservation.id}/extend-stay",
      params: { checkOutDate: (@check_out + 2.days).iso8601 },
      headers: auth_headers(token),
      as: :json
    assert_response :success
    assert_equal @check_out + 2.days, reservation.reload.check_out_date

    clean_room = @property.rooms.create!(room_type: @room_type, room_number: "103")
    patch "/api/v1/reservations/#{reservation.id}/transfer-room",
      params: { roomId: clean_room.id },
      headers: auth_headers(token),
      as: :json
    assert_response :success
    assert_equal "VACANT_DIRTY", @second_room.reload.status
    assert_equal "OCCUPIED", clean_room.reload.status

    post "/api/v1/reservations", params: valid_payload.merge(
      phone: "+977-9800000012",
      checkInDate: (@check_out + 10.days).iso8601,
      checkOutDate: (@check_out + 12.days).iso8601
    ), as: :json
    assert_response :created
    cancellable = Reservation.find(response.parsed_body.dig("data", "id"))

    patch "/api/v1/reservations/#{cancellable.id}/cancel",
      params: { reason: "Guest requested cancellation" },
      headers: auth_headers(token),
      as: :json
    assert_response :success
    assert_equal "CANCELLED", cancellable.reload.status
    assert_equal "VOID", cancellable.folio.reload.status
  end

  test "role without permission cannot access protected reservation list" do
    limited_role = @company.roles.create!(name: "NO_RESERVATIONS", permissions: {})
    user = @company.users.create!(
      role: limited_role,
      email: "limited@example.com",
      password: "Strong-Test-Password-2026!",
      password_confirmation: "Strong-Test-Password-2026!",
      first_name: "Limited",
      last_name: "User"
    )
    UserProperty.create!(user:, property: @property)

    token = Authentication::Token.encode(user)

    get "/api/v1/reservations?propertyCode=#{@property.code}",
      headers: auth_headers(token),
      as: :json

    assert_response :forbidden
    assert_equal "FORBIDDEN", response.parsed_body["code"]
  end

  private

  def auth_token
    post "/api/v1/auth/login", params: {
      email: @user.email,
      password: "Strong-Test-Password-2026!"
    }, as: :json
    response.parsed_body.dig("data", "token")
  end

  def auth_headers(token)
    {
      "Authorization" => "Bearer #{token}",
      "X-Property-Code" => @property.code
    }
  end

  def valid_payload
    {
      propertyCode: @property.code,
      checkInDate: @check_in.iso8601,
      checkOutDate: @check_out.iso8601,
      roomTypeCode: @room_type.code,
      roomsCount: 1,
      adultsCount: 2,
      childrenCount: 0,
      firstName: "Aarav",
      lastName: "Pradhan",
      email: "aarav@example.com",
      phone: "+977-9800000001",
      addOns: { BREAKFAST: true },
      source: "DIRECT_WEB"
    }
  end
end
