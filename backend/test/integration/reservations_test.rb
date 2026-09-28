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
    @property.service_offerings.create!(
      code: "SPA",
      name: "Himalayan Herbal Aroma Therapy (60 Min)",
      unit_price: 4_000,
      pricing_unit: "PER_GUEST"
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

  test "website booking alerts property front desk in notification bell" do
    staff_role = @company.roles.create!(name: "FRONT_DESK_STAFF", permissions: { "RESERVATIONS" => %w[read] })
    staff = @company.users.create!(
      role: staff_role, email: "desk-staff@example.com", first_name: "Desk", last_name: "Staff",
      password: "Strong-Test-Password-2026!", password_confirmation: "Strong-Test-Password-2026!"
    )
    UserProperty.create!(user: staff, property: @property)
    other_property = @company.properties.create!(name: "Other Hotel", code: "OTHER-PROPERTY")
    other_staff = @company.users.create!(
      role: staff_role, email: "other-desk@example.com", first_name: "Other", last_name: "Desk",
      password: "Strong-Test-Password-2026!", password_confirmation: "Strong-Test-Password-2026!"
    )
    UserProperty.create!(user: other_staff, property: other_property)

    assert_difference "Notification.count", 2 do
      post "/api/v1/reservations", params: valid_payload, as: :json
    end
    assert_response :created
    reservation = Reservation.find(response.parsed_body.dig("data", "id"))
    assert_equal 1, @user.notifications.count
    assert_equal 1, staff.notifications.count
    assert_equal 0, other_staff.notifications.count
    assert_includes staff.notifications.first.message, reservation.confirmation_number
    assert_equal "/admin/pms/reservations?reservation=#{reservation.id}", staff.notifications.first.action_url

    post "/api/v1/auth/login", params: { email: staff.email, password: "Strong-Test-Password-2026!" }, as: :json
    staff_token = response.parsed_body.dig("data", "token")
    get "/api/v1/notifications", headers: auth_headers(staff_token), as: :json
    assert_response :success
    assert_equal 1, response.parsed_body["unreadCount"]
    assert_equal "New online booking", response.parsed_body.dig("notifications", 0, "title")

    assert_difference "staff.notifications.count", 1 do
      post "/api/v1/reservations", params: valid_payload.merge(phone: "+977-9800000002"), headers: auth_headers(auth_token), as: :json
    end
    assert_response :created
    assert_equal 2, staff.notifications.count
  end

  test "front desk folio actions persist charges payments checkout and a balanced journal" do
    token = auth_token
    post "/api/v1/reservations", params: valid_payload.merge(roomId: @first_room.id, source: "WALK_IN"), headers: auth_headers(token), as: :json
    assert_response :created
    reservation = Reservation.find(response.parsed_body.dig("data", "id"))
    reservation.update!(status: "CHECKED_IN", check_in_date: Date.current, check_out_date: Date.current + 2.days, checked_in_at: Time.current)
    @first_room.update!(status: "OCCUPIED")
    folio = reservation.folio

    get "/api/v1/frontdesk", headers: auth_headers(token), as: :json
    assert_response :success
    serialized = response.parsed_body["folios"].find { |entry| entry["folioNumber"] == folio.folio_number }
    assert_equal reservation.id, serialized["reservationId"]

    original_sub_total = folio.sub_total
    original_service_charge = folio.service_charge
    original_vat = folio.tax_amount
    assert_difference [ "FolioItem.count", "AuditLog.count" ], 1 do
      post "/api/v1/folio", params: {
        operation: "ADD_CHARGE", folioId: folio.id, description: "Dinner", amount: 1_000, sourceModule: "RESTAURANT"
      }, headers: auth_headers(token), as: :json
    end
    assert_response :success
    folio.reload
    assert_equal original_sub_total + 1_000, folio.sub_total
    assert_equal original_service_charge + 100, folio.service_charge
    assert_equal original_vat + 143, folio.tax_amount

    assert_difference [ "Payment.count", "AuditLog.count" ], 1 do
      post "/api/v1/folio", params: {
        operation: "RECORD_PAYMENT", folioId: folio.id, amount: 500, paymentMethod: "CARD", notes: "Card terminal approval 123"
      }, headers: auth_headers(token), as: :json
    end
    assert_response :success
    assert_equal "CARD", folio.payments.order(:created_at).last.payment_method
    assert_equal 500, folio.reload.total_paid

    assert_no_difference "Payment.count" do
      post "/api/v1/folio", params: {
        operation: "RECORD_PAYMENT", folioId: folio.id, amount: folio.balance_due + 1, paymentMethod: "CASH"
      }, headers: auth_headers(token), as: :json
    end
    assert_response :unprocessable_content
    assert_equal "PAYMENT_EXCEEDS_BALANCE", response.parsed_body["code"]

    assert_difference [ "Payment.count", "JournalEntry.count", "AuditLog.count" ], 1 do
      post "/api/v1/folio", params: {
        operation: "SETTLE_AND_CHECKOUT", folioId: folio.id, settlementMethod: "CASH"
      }, headers: auth_headers(token), as: :json
    end
    assert_response :success
    voucher = JournalEntry.find_by!(source_module: "PMS_CHECKOUT", source_reference: "PMS_CHECKOUT:#{folio.id}")
    assert_equal voucher.voucher_number, response.parsed_body.dig("data", "journalVoucher")
    assert_equal voucher.total_debit, voucher.total_credit
    assert_equal voucher.total_debit, voucher.journal_lines.sum(:debit)
    assert_equal voucher.total_credit, voucher.journal_lines.sum(:credit)
    assert_equal "CLOSED", folio.reload.status
    assert_equal "CHECKED_OUT", reservation.reload.status
    assert_equal "VACANT_DIRTY", @first_room.reload.status
    assert_equal folio.grand_total, folio.total_paid

    assert_no_difference [ "FolioItem.count", "Payment.count", "JournalEntry.count" ] do
      post "/api/v1/folio", params: {
        operation: "ADD_CHARGE", folioId: folio.id, description: "Late charge", amount: 100, sourceModule: "OTHER"
      }, headers: auth_headers(token), as: :json
    end
    assert_response :conflict

    assert_no_difference [ "Reservation.count", "Folio.count", "Payment.count", "JournalEntry.count", "JournalLine.count" ] do
      delete "/api/v1/reservations/#{reservation.id}", headers: auth_headers(token), as: :json
    end
    assert_response :success
    assert_equal "ARCHIVED", reservation.reload.status
    assert_equal "CLOSED", folio.reload.status
    assert_equal voucher.id, JournalEntry.find_by!(source_reference: "PMS_CHECKOUT:#{folio.id}").id
  end

  test "verified advance payment updates folio and reservation once" do
    token = auth_token
    post "/api/v1/reservations", params: valid_payload.merge(roomId: @first_room.id), headers: auth_headers(token), as: :json
    assert_response :created
    reservation = Reservation.find(response.parsed_body.dig("data", "id"))
    folio = reservation.folio

    with_gateway_method(:available, { ESEWA: true, KHALTI: false }) do
      post "/api/v1/payment_requests", params: { folioId: folio.id, kind: "ADVANCE", amount: 1_000 }, headers: auth_headers(token), as: :json
    end
    assert_response :created
    payment_request = PaymentRequest.find_by!(public_token: response.parsed_body.dig("data", "token"))
    assert_equal 1_000, payment_request.amount
    assert_equal 1_000, response.parsed_body.dig("data", "amount")
    assert_equal "SANDBOX", response.parsed_body.dig("data", "gatewayModes", "ESEWA")

    get "/api/v1/payment_requests/#{payment_request.public_token}", as: :json
    assert_response :success
    assert_equal folio.folio_number, response.parsed_body.dig("data", "folioNumber")

    with_gateway_method(:start, { reference: payment_request.id, url: "https://example.test/checkout", fields: {} }) do
      post "/api/v1/payment_requests/#{payment_request.public_token}/start", params: { gateway: "ESEWA" }, as: :json
    end
    assert_response :success
    assert_equal "INITIATED", payment_request.reload.status

    with_gateway_method(:verify, { complete: false, failed: false, transaction_id: nil }) do
      post "/api/v1/payment_requests/#{payment_request.public_token}/verify", as: :json
    end
    assert_response :success
    assert_equal "INITIATED", payment_request.reload.status
    assert_equal 0, reservation.reload.advance_paid

    assert_difference [ "Payment.count", "AuditLog.count" ], 1 do
      with_gateway_method(:verify, { complete: true, failed: false, transaction_id: "gateway-test-1" }) do
        post "/api/v1/payment_requests/#{payment_request.public_token}/verify", as: :json
      end
    end
    assert_response :success
    assert_equal "COMPLETED", response.parsed_body.dig("data", "status")
    assert_equal 1_000, reservation.reload.advance_paid
    assert_equal 1_000, folio.reload.total_paid
    assert_equal folio.grand_total - 1_000, folio.balance_due
    assert_equal "ESEWA", payment_request.reload.payment.payment_method

    assert_no_difference "Payment.count" do
      post "/api/v1/payment_requests/#{payment_request.public_token}/verify", as: :json
    end
    assert_response :success
    assert_equal 1_000, reservation.reload.advance_paid
  end

  test "checkout QR uses the persisted balance and manual gateway labels are rejected" do
    token = auth_token
    post "/api/v1/reservations", params: valid_payload.merge(roomId: @first_room.id), headers: auth_headers(token), as: :json
    assert_response :created
    reservation = Reservation.find(response.parsed_body.dig("data", "id"))
    reservation.update!(status: "CHECKED_IN", check_in_date: Date.current, check_out_date: Date.current + 2.days, checked_in_at: Time.current)
    @first_room.update!(status: "OCCUPIED")
    folio = reservation.folio

    with_gateway_method(:available, { ESEWA: true, KHALTI: false }) do
      post "/api/v1/payment_requests", params: { folioId: folio.id, kind: "CHECKOUT", amount: 1 }, headers: auth_headers(token), as: :json
    end
    assert_response :created
    assert_equal folio.balance_due.to_f, response.parsed_body.dig("data", "amount")
    assert_equal folio.balance_due, PaymentRequest.last.amount

    assert_no_difference "Payment.count" do
      post "/api/v1/folio", params: { operation: "RECORD_PAYMENT", folioId: folio.id, amount: 100, paymentMethod: "KHALTI" }, headers: auth_headers(token), as: :json
    end
    assert_response :unprocessable_content
    assert_equal "GATEWAY_VERIFICATION_REQUIRED", response.parsed_body["code"]

    payment_request = PaymentRequest.last
    post "/api/v1/folio", params: { operation: "SETTLE_AND_CHECKOUT", folioId: folio.id, settlementMethod: "CASH" }, headers: auth_headers(token), as: :json
    assert_response :success
    post "/api/v1/payment_requests/#{payment_request.public_token}/start", params: { gateway: "ESEWA" }, as: :json
    assert_response :conflict
    assert_equal "PAYMENT_NOT_ALLOWED", response.parsed_body["code"]
  end

  test "esewa verification rejects a completed response with the wrong amount or reference" do
    previous_code = ENV["ESEWA_PRODUCT_CODE"]
    ENV["ESEWA_PRODUCT_CODE"] = "EPAYTEST"
    payment_request = PaymentRequest.new(amount: 1_000, gateway_reference: "expected-reference")

    with_gateway_method(:get_json, { "status" => "COMPLETE", "total_amount" => "1.00", "ref_id" => "TX-1", "pid" => "expected-reference", "scd" => "EPAYTEST" }) do
      assert_not Payments::Gateway.verify_esewa(payment_request)[:complete]
    end
    with_gateway_method(:get_json, { "status" => "COMPLETE", "total_amount" => "1000.00", "ref_id" => "TX-1", "pid" => "another-reference", "scd" => "EPAYTEST" }) do
      assert_not Payments::Gateway.verify_esewa(payment_request)[:complete]
    end
  ensure
    previous_code ? ENV["ESEWA_PRODUCT_CODE"] = previous_code : ENV.delete("ESEWA_PRODUCT_CODE")
  end

  test "overlapping reservation cannot exceed sellable inventory" do
    post "/api/v1/reservations", params: valid_payload.merge(roomsCount: 2), as: :json
    assert_response :created

    post "/api/v1/reservations", params: valid_payload.merge(phone: "+977-9800000002"), as: :json
    assert_response :conflict
    assert_equal "ROOM_UNAVAILABLE", response.parsed_body["code"]
  end

  test "website and front desk share exact-room inventory through scheduled checkout" do
    post "/api/v1/reservations", params: valid_payload.merge(
      roomId: @second_room.id,
      phone: "+977-9800000003"
    ), as: :json

    assert_response :created
    body = response.parsed_body
    reservation = Reservation.find(body.dig("data", "id"))
    assert_equal "ONLINE", reservation.source
    assert_equal @second_room.id, reservation.reservation_rooms.first.room_id
    assert_equal @second_room.room_number, body.dig("data", "roomNumber")
    assert_equal "RESERVED", @second_room.reload.status

    post "/api/v1/reservations", params: valid_payload.merge(
      roomId: @second_room.id,
      phone: "+977-9800000004",
      source: "WALK_IN"
    ), headers: auth_headers(auth_token), as: :json

    assert_response :conflict
    assert_equal "ROOM_UNAVAILABLE", response.parsed_body["code"]

    reservation.update!(status: "CHECKED_IN", checked_in_at: Time.current)
    @second_room.update!(status: "OCCUPIED")

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
    ), headers: auth_headers(auth_token), as: :json

    assert_response :conflict
    assert_equal "ROOM_UNAVAILABLE", response.parsed_body["code"]

    post "/api/v1/reservations", params: valid_payload.merge(
      roomId: @second_room.id,
      phone: "+977-9800000005",
      source: "WALK_IN",
      checkInDate: @check_out.iso8601,
      checkOutDate: (@check_out + 1.day).iso8601
    ), headers: auth_headers(auth_token), as: :json

    assert_response :created
    assert_equal "WALK_IN", Reservation.find(response.parsed_body.dig("data", "id")).source
  end

  test "modifying dates rejects a conflict on the already assigned room" do
    post "/api/v1/reservations", params: valid_payload.merge(
      roomId: @first_room.id,
      phone: "+977-9800000021"
    ), as: :json
    assert_response :created
    reservation = Reservation.find(response.parsed_body.dig("data", "id"))

    reservation.update!(status: "CONFIRMED")

    post "/api/v1/reservations", params: valid_payload.merge(
      roomId: @first_room.id,
      phone: "+977-9800000022",
      checkInDate: @check_out.iso8601,
      checkOutDate: (@check_out + 1.day).iso8601
    ), as: :json
    assert_response :created

    patch "/api/v1/reservations/#{reservation.id}",
      params: { checkOutDate: (@check_out + 1.day).iso8601 },
      headers: auth_headers(auth_token),
      as: :json

    assert_response :conflict
    assert_equal "ROOM_UNAVAILABLE", response.parsed_body["code"]
    assert_equal @check_out, reservation.reload.check_out_date
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

  test "public availability quote includes requested add-ons and matches reservation pricing" do
    get "/api/v1/availability?propertyCode=#{@property.code}&checkInDate=#{@check_in.iso8601}&checkOutDate=#{@check_out.iso8601}&adultsCount=2&childrenCount=0&addOnCodes=BREAKFAST"

    assert_response :success, response.body
    quote = response.parsed_body.dig("data", 0, "quote")
    assert_equal 4_000.0, quote["addOnTotal"]
    assert_equal 12_000.0, quote["subTotal"]
    assert_equal 1_200.0, quote["serviceCharge"]
    assert_equal 1_716.0, quote["vatAmount"]
    assert_equal 14_916.0, quote["grandTotal"]
  end

  test "per guest add-ons include adults and children" do
    get "/api/v1/availability?propertyCode=#{@property.code}&checkInDate=#{@check_in.iso8601}&checkOutDate=#{@check_out.iso8601}&adultsCount=2&childrenCount=1&addOnCodes=BREAKFAST"

    assert_response :success, response.body
    quote = response.parsed_body.dig("data", 0, "quote")
    assert_equal 6_000.0, quote["addOnTotal"]

    post "/api/v1/reservations", params: valid_payload.merge(
      childrenCount: 1,
      phone: "+977-9800000031"
    ), as: :json

    assert_response :created
    assert_equal 6_000.0, Reservation.find(response.parsed_body.dig("data", "id")).service_total.to_f
  end

  test "per person spa pricing and public add-on catalog are dynamic" do
    get "/api/v1/add_on_catalog?propertyCode=#{@property.code}"

    assert_response :success
    spa = response.parsed_body["data"].find { |offering| offering["code"] == "SPA" }
    assert_equal "Himalayan Herbal Aroma Therapy (60 Min)", spa["name"]
    assert_equal "PER_GUEST", spa["pricingUnit"]
    assert_equal 4_000.0, spa["unitPrice"]

    get "/api/v1/availability?propertyCode=#{@property.code}&checkInDate=#{@check_in.iso8601}&checkOutDate=#{@check_out.iso8601}&adultsCount=2&childrenCount=1&addOnCodes=SPA"

    assert_response :success, response.body
    assert_equal 12_000.0, response.parsed_body.dig("data", 0, "quote", "addOnTotal")

    post "/api/v1/reservations", params: valid_payload.merge(
      addOns: { SPA: true },
      childrenCount: 1,
      phone: "+977-9800000032"
    ), as: :json

    assert_response :created
    assert_equal 12_000.0, Reservation.find(response.parsed_body.dig("data", "id")).service_total.to_f
  end

  test "public booking cannot impersonate a staff walk-in source" do
    post "/api/v1/reservations", params: valid_payload.merge(source: "WALK_IN"), as: :json

    assert_response :created
    assert_equal "ONLINE", Reservation.find(response.parsed_body.dig("data", "id")).source
  end

  test "front desk create permission can submit an authenticated walk-in booking" do
    role = @company.roles.create!(name: "BOOKING_AGENT", permissions: { "PMS_FRONTDESK" => %w[create] })
    user = @company.users.create!(
      role:,
      email: "booking-agent@example.com",
      password: "Strong-Test-Password-2026!",
      password_confirmation: "Strong-Test-Password-2026!",
      first_name: "Booking",
      last_name: "Agent"
    )
    UserProperty.create!(user:, property: @property)

    token = Authentication::Token.encode(user)
    post "/api/v1/reservations", params: valid_payload.merge(
      phone: "+977-9800000033",
      source: "WALK_IN"
    ), headers: auth_headers(token), as: :json

    assert_response :created
    assert_equal "WALK_IN", Reservation.find(response.parsed_body.dig("data", "id")).source
  end

  test "authenticated user without booking permission cannot create a reservation" do
    role = @company.roles.create!(name: "READ_ONLY_BOOKINGS", permissions: { "RESERVATIONS" => %w[read] })
    user = @company.users.create!(
      role:,
      email: "read-only-bookings@example.com",
      password: "Strong-Test-Password-2026!",
      password_confirmation: "Strong-Test-Password-2026!",
      first_name: "Read",
      last_name: "Only"
    )
    UserProperty.create!(user:, property: @property)

    token = Authentication::Token.encode(user)
    post "/api/v1/reservations", params: valid_payload.merge(phone: "+977-9800000034"), headers: auth_headers(token), as: :json

    assert_response :forbidden
    assert_equal "FORBIDDEN", response.parsed_body["code"]
  end

  test "reservation rejects invalid guest and add-on data" do
    post "/api/v1/reservations", params: valid_payload.merge(email: "not-an-email"), as: :json
    assert_response :unprocessable_content

    post "/api/v1/reservations", params: valid_payload.merge(phone: "123"), as: :json
    assert_response :unprocessable_content

    post "/api/v1/reservations", params: valid_payload.merge(addOns: { UNKNOWN_SERVICE: true }), as: :json
    assert_response :unprocessable_content
    assert_equal "INVALID_ADD_ON", response.parsed_body["code"]
  end

  test "protected reservation lifecycle supports modify assign checkin extend transfer and cancel" do
    token = auth_token

    post "/api/v1/reservations", params: valid_payload.merge(phone: "+977-9800000011"), as: :json
    assert_response :created
    reservation = Reservation.find(response.parsed_body.dig("data", "id"))

    reservation.update!(status: "CONFIRMED")

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

    # A guest may be checked in only on their scheduled arrival date.
    reservation.update!(check_in_date: Date.current, check_out_date: Date.current + 2.days)

    patch "/api/v1/reservations/#{reservation.id}/check-in",
      params: { roomId: @second_room.id },
      headers: auth_headers(token),
      as: :json
    assert_response :success
    assert_equal "CHECKED_IN", reservation.reload.status
    assert_equal "OCCUPIED", @second_room.reload.status

    patch "/api/v1/reservations/#{reservation.id}/extend-stay",
      params: { additionalNights: 1, reason: "Guest requested one more night" },
      headers: auth_headers(token),
      as: :json
    assert_response :success
    assert_equal Date.current + 3.days, reservation.reload.check_out_date
    breakfast_item = reservation.folio.folio_items.find_by!(source_module: "SERVICE")
    assert_equal 3, breakfast_item.quantity
    assert_equal 15_000, reservation.folio.reload.sub_total
    assert_equal 1_500, reservation.folio.service_charge
    assert_equal 2_145, reservation.folio.tax_amount
    assert_equal 18_645, reservation.folio.grand_total
    extension_audit = AuditLog.find_by!(entity_type: "Reservation", entity_id: reservation.id, action: "EXTEND_STAY")
    assert_equal 1, extension_audit.new_values["additional_nights"]
    assert_equal "Guest requested one more night", extension_audit.new_values["reason"]

    patch "/api/v1/reservations/#{reservation.id}/extend-stay",
      params: { additionalNights: 1, reason: "" },
      headers: auth_headers(token),
      as: :json
    assert_response :unprocessable_content
    assert_equal Date.current + 3.days, reservation.reload.check_out_date

    clean_room = @property.rooms.create!(room_type: @room_type, room_number: "103", setup_managed: true)
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

  test "staff can archive an unused booking without erasing its audit history" do
    token = auth_token
    post "/api/v1/reservations", params: valid_payload.merge(roomId: @first_room.id, source: "WALK_IN"), headers: auth_headers(token), as: :json
    assert_response :created
    reservation = Reservation.find(response.parsed_body.dig("data", "id"))
    folio = reservation.folio

    assert_difference "AuditLog.count", 1 do
      assert_no_difference [ "Reservation.count", "Folio.count" ] do
        delete "/api/v1/reservations/#{reservation.id}", headers: auth_headers(token), as: :json
      end
    end
    assert_response :success
    assert_equal "ARCHIVED", reservation.reload.status
    assert_equal "VOID", folio.reload.status
    assert_equal "VACANT_CLEAN", @first_room.reload.status
    assert_equal "DELETE", AuditLog.where(entity_type: "Reservation", entity_id: reservation.id).order(:created_at).last.action

    get "/api/v1/reservations", headers: auth_headers(token), as: :json
    assert_response :success
    assert_not response.parsed_body["data"].any? { |entry| entry["id"] == reservation.id }
  end

  test "staff can archive an unpaid checked-in stay and release its room as dirty" do
    token = auth_token
    post "/api/v1/reservations", params: valid_payload.merge(roomId: @first_room.id, source: "WALK_IN"), headers: auth_headers(token), as: :json
    assert_response :created
    reservation = Reservation.find(response.parsed_body.dig("data", "id"))
    reservation.update!(status: "CHECKED_IN", check_in_date: Date.current, check_out_date: Date.current + 1.day, checked_in_at: Time.current)
    @first_room.update!(status: "OCCUPIED")

    delete "/api/v1/reservations/#{reservation.id}", headers: auth_headers(token), as: :json

    assert_response :success
    assert_equal "ARCHIVED", reservation.reload.status
    assert_equal "VOID", reservation.folio.reload.status
    assert_equal "VACANT_DIRTY", @first_room.reload.status
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

  def with_gateway_method(name, result)
    original = Payments::Gateway.method(name)
    Payments::Gateway.define_singleton_method(name) { |*| result }
    yield
  ensure
    Payments::Gateway.define_singleton_method(name, original)
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
      source: "ONLINE"
    }
  end
end
