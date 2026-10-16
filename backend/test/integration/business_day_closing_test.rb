require "test_helper"

class BusinessDayClosingTest < ActionDispatch::IntegrationTest
  setup do
    travel_to Date.current.in_time_zone.change(hour: 10)
    @company = Company.create!(name: "Closing Hotel", slug: "closing-tests")
    @property = @company.properties.create!(name: "Closing Property", code: "CLOSE-TEST", business_date: Date.current)
    @role = @company.roles.create!(name: "SUPER_ADMIN", system: true)
    @user = @company.users.create!(role: @role, email: "closing@example.test", first_name: "Closing", last_name: "Manager", password: "Strong-Test-Password-2026!")
    UserProperty.create!(user: @user, property: @property)
    @type = @property.room_types.create!(name: "Standard", code: "STD", slug: "standard", base_price: 2000, max_adults: 2, max_children: 1, max_occupancy: 3, setup_managed: true)
    @rooms = %w[101 102 103].map { |number| @property.rooms.create!(room_type: @type, room_number: number, setup_managed: true) }
    @property.rate_plans.create!(room_type: @type, name: "Room only", code: "EP", price_modifier: 0)
    @company.tax_configurations.create!(name: "VAT", code: "VAT", rate: 13, effective_from: Date.new(2020, 1, 1), calculation_order: 1)
  end
  teardown { travel_back }

  test "group checkin occupies all rooms and group checkout releases all rooms once" do
    stay = book(rooms: 2)
    assignments = stay.reservation_rooms.order(:id).zip(@rooms).map { |rr, room| { reservationRoomId: rr.id, roomId: room.id } }
    @rooms[1].update!(status: "VACANT_DIRTY")
    patch "/api/v1/reservations/#{stay.id}/check-in", params: { roomAssignments: assignments }, headers: headers, as: :json
    assert_response :conflict
    assert_equal "INQUIRY", stay.reload.status
    assert stay.reservation_rooms.all? { |rr| rr.room_id.nil? }
    assert_equal "VACANT_CLEAN", @rooms[0].reload.status
    @rooms[1].update!(status: "VACANT_CLEAN")
    patch "/api/v1/reservations/#{stay.id}/check-in", params: { roomAssignments: assignments }, headers: headers, as: :json
    assert_response :success
    assert_equal "CHECKED_IN", stay.reload.status
    assert_equal %w[OCCUPIED OCCUPIED], @rooms.first(2).map { |room| room.reload.status }
    assert_equal 1, stay.guest.reload.stay_count
    get "/api/v1/frontdesk", headers: headers
    assert_includes response.parsed_body["folios"].first["roomNumber"], "101"
    assert_includes response.parsed_body["folios"].first["roomNumber"], "102"
    patch "/api/v1/reservations/#{stay.id}/check-in", params: { roomAssignments: assignments }, headers: headers, as: :json
    assert_response :conflict
    assert_equal 1, stay.guest.reload.stay_count
    patch "/api/v1/reservations/#{stay.id}/extend-stay", params: { additionalNights: 1, reason: "Group staying longer" }, headers: headers, as: :json
    assert_response :success
    assert_equal [2, 2], stay.reservation_rooms.reload.pluck(:nights)
    assert_difference ["Payment.count", "JournalEntry.count"], 1 do
      post "/api/v1/checkout", params: { folioId: stay.folio.id, paymentMethod: "CASH" }, headers: headers, as: :json
    end
    assert_response :success
    assert_equal %w[VACANT_DIRTY VACANT_DIRTY], @rooms.first(2).map { |room| room.reload.status }
    assert_equal 2, HousekeepingTask.where(room: @rooms.first(2), status: "PENDING", task_type: "CLEANING").count
    entry = @property.journal_entries.find_by!(source_reference: "PMS_CHECKOUT:#{stay.folio.id}")
    assert_equal entry.journal_lines.sum(:debit), entry.journal_lines.sum(:credit)
    assert_equal @property.operating_date, entry.posting_date
  end

  test "group assignments reject duplicates missing rooms and rooms from another property" do
    stay = book(rooms: 2)
    rows = stay.reservation_rooms.order(:id).to_a
    invalid = rows.map { |rr| { reservationRoomId: rr.id, roomId: @rooms.first.id } }
    patch "/api/v1/reservations/#{stay.id}/check-in", params: { roomAssignments: invalid }, headers: headers, as: :json
    assert_response :unprocessable_content
    patch "/api/v1/reservations/#{stay.id}/check-in", params: { roomAssignments: invalid.take(1) }, headers: headers, as: :json
    assert_response :unprocessable_content
    other = @company.properties.create!(name: "Other", code: "OTHER-CLOSING")
    other_type = other.room_types.create!(name: "Other", code: "OTH", slug: "other", base_price: 1000, setup_managed: true)
    foreign = other.rooms.create!(room_type: other_type, room_number: "999", setup_managed: true)
    invalid.last[:roomId] = foreign.id
    patch "/api/v1/reservations/#{stay.id}/check-in", params: { roomAssignments: invalid }, headers: headers, as: :json
    assert_response :not_found
    assert_equal "INQUIRY", stay.reload.status
    assert stay.reservation_rooms.all? { |rr| rr.room_id.nil? }
    assert_equal "VACANT_CLEAN", foreign.reload.status
  end

  test "daily close requires cashier reconciliation and advances the date exactly once" do
    date = @property.operating_date
    close_action("CLOSE_DAY")
    assert_response :conflict
    assert_equal date, @property.reload.operating_date
    close_action("CLOSE_CASHIER", openingCash: "500", countedCash: "500")
    assert_response :success
    cashier_id = response.parsed_body.dig("data", "id")
    assert_no_difference ["CashierClosing.count", "AuditLog.count"] do
      close_action("CLOSE_CASHIER", openingCash: "500", countedCash: "500")
    end
    assert_response :success
    assert_equal cashier_id, response.parsed_body.dig("data", "id")
    assert_difference "BusinessDayClosing.count", 1 do
      assert_no_difference ["JournalEntry.count", "Payment.count", "FolioItem.count"] do
        close_action("CLOSE_DAY")
      end
    end
    assert_response :success
    closing_id = response.parsed_body.dig("data", "id")
    assert_equal date + 1.day, @property.reload.operating_date
    assert_no_difference ["BusinessDayClosing.count", "AuditLog.count"] do
      close_action("CLOSE_DAY", businessDate: date.iso8601)
    end
    assert_response :success
    assert_equal closing_id, response.parsed_body.dig("data", "id")
    assert_equal date + 1.day, @property.reload.operating_date
    get "/api/v1/dashboard", params: { compact: true }, headers: headers
    assert_equal (date + 1.day).iso8601, response.parsed_body["businessDate"]
    get "/api/v1/night-audit", headers: headers
    assert_equal closing_id, response.parsed_body["closingHistory"].first["id"]
    assert_equal "Closing Manager", response.parsed_body["closingHistory"].first["closedBy"]
    get "/api/v1/night-audit", params: { closingId: closing_id }, headers: headers
    assert_response :success
    assert_equal date.iso8601, response.parsed_body.dig("closingReport", "businessDate")
    assert_equal 500, BigDecimal(response.parsed_body.dig("closingReport", "cashier", "counted_cash"))
    travel 3.days
    assert_equal date + 1.day, @property.reload.operating_date
  end

  test "cashier differences require reasons reopening preserves evidence and closed cashiers block payments" do
    stay = book(check_in: Date.current + 2.days)
    patch "/api/v1/reservations/#{stay.id}/advance", params: { amount: 1000, paymentMethod: "CASH", idempotencyKey: SecureRandom.uuid }, headers: headers, as: :json
    assert_response :success
    close_action("CLOSE_CASHIER", openingCash: 200, countedCash: 1199)
    assert_response :unprocessable_content
    assert_equal "VARIANCE_REASON_REQUIRED", response.parsed_body["code"]
    close_action("CLOSE_CASHIER", openingCash: 200, countedCash: 1199, notes: "One rupee short")
    assert_response :success
    record = CashierClosing.find(response.parsed_body.dig("data", "id"))
    assert_equal 1200, record.expected_cash
    assert_equal(-1, record.variance)
    assert_no_difference "Payment.count" do
      patch "/api/v1/reservations/#{stay.id}/advance", params: { amount: 100, paymentMethod: "CASH", idempotencyKey: SecureRandom.uuid }, headers: headers, as: :json
    end
    assert_response :conflict
    assert_equal "CASHIER_CLOSED", response.parsed_body["code"]
    close_action("REOPEN_CASHIER")
    assert_response :unprocessable_content
    close_action("REOPEN_CASHIER", notes: "Cash count correction")
    assert_response :success
    assert_equal "REOPENED", record.reload.status
    assert_equal 1199, record.counted_cash
    close_action("CLOSE_CASHIER", openingCash: 200, countedCash: 1200)
    assert_response :success
    assert_equal 2, @property.cashier_closings.count
    close_action("CLOSE_DAY")
    assert_response :success
    patch "/api/v1/reservations/#{stay.id}/advance", params: { amount: 100, paymentMethod: "CASH", idempotencyKey: SecureRandom.uuid }, headers: headers, as: :json
    assert_response :success
    assert_equal @property.reload.operating_date, stay.folio.payments.find_by!(amount: 100).business_date
  end

  test "pending arrivals and due departures must be resolved and no-shows preserve paid advances" do
    pending = book
    close_action("CLOSE_CASHIER", openingCash: 0, countedCash: 0)
    assert_response :success
    close_action("CLOSE_DAY")
    assert_response :conflict
    assert_includes response.parsed_body["error"], "pending arrival"
    patch "/api/v1/reservations/#{pending.id}/no-show", headers: headers, as: :json
    assert_response :success
    assert_equal "NO_SHOW", pending.reload.status
    assert_equal "VOID", pending.folio.reload.status
    close_action("CLOSE_DAY")
    assert_response :success
  end

  test "cash refunds and classified restaurant receipts reconcile with the cashier" do
    stay = book(check_in: Date.current + 2.days)
    patch "/api/v1/reservations/#{stay.id}/advance", params: { amount: 1000, paymentMethod: "CASH", idempotencyKey: SecureRandom.uuid }, headers: headers, as: :json
    assert_response :success
    patch "/api/v1/reservations/#{stay.id}/cancel", params: { expectedPaidAmount: 1000, reason: "Guest cancelled" }, headers: headers, as: :json
    assert_response :success
    patch "/api/v1/reservations/#{stay.id}/refund", params: { refundMethod: "CASH", refundReference: "TEST-REFUND" }, headers: headers, as: :json
    assert_response :success
    cash = @company.accounts.find_by!(account_code: "1001")
    revenue = @company.accounts.find_by!(account_code: "4003")
    legacy = @company.journal_entries.create!(voucher_number: "TEST-LEGACY-POS", posting_date: Date.current, total_debit: 200, total_credit: 200, source_module: "POS_RESTAURANT")
    legacy.journal_lines.create!(account: cash, debit: 200, credit: 0)
    legacy.journal_lines.create!(account: revenue, debit: 0, credit: 200)
    close_action("CLOSE_CASHIER", openingCash: 0, countedCash: 300)
    assert_response :conflict
    close_action("CLASSIFY_RECEIPT", receiptId: legacy.id, paymentMethod: "CASH")
    assert_response :success
    assert_equal @property.id, legacy.reload.property_id
    assert_equal 200, legacy.total_debit
    close_action("CLOSE_CASHIER", openingCash: 0, countedCash: 300)
    assert_response :success
    record = @property.cashier_closings.last
    assert_equal 300, record.expected_cash
    cash_tender = record.snapshot["tenders"].find { |t| t["method"] == "CASH" }
    assert_equal 900, BigDecimal(cash_tender["refunds"])
    assert_equal 1200, BigDecimal(cash_tender["receipts"])
    close_action("CLOSE_DAY")
    assert_response :success
  end

  test "day closing enforces closing permission property access stale dates and future dates" do
    role = @company.roles.create!(name: "AUDIT_READER", permissions: { "NIGHT_AUDIT" => %w[read create] })
    reader = @company.users.create!(role:, email: "reader@example.test", first_name: "Read", last_name: "Only", password: "Strong-Test-Password-2026!")
    UserProperty.create!(user: reader, property: @property)
    post "/api/v1/night-audit", params: { operation: "CLOSE_CASHIER", businessDate: Date.current.iso8601, openingCash: 0, countedCash: 0 }, headers: headers(reader), as: :json
    assert_response :forbidden
    close_action("CLOSE_DAY", businessDate: (Date.current - 1.day).iso8601)
    assert_response :conflict
    assert_equal "BUSINESS_DATE_CHANGED", response.parsed_body["code"]
    @property.update!(business_date: Date.tomorrow)
    close_action("CLOSE_DAY")
    assert_response :conflict
    assert_equal "FUTURE_BUSINESS_DATE", response.parsed_body["code"]
    assert_equal 0, @property.business_day_closings.count
  end

  test "due departures must be extended or checked out before the day can close" do
    stay = book
    patch "/api/v1/reservations/#{stay.id}/check-in", params: { roomId: @rooms.first.id }, headers: headers, as: :json
    assert_response :success
    travel 1.day
    @property.update!(business_date: Date.current)
    close_action("CLOSE_CASHIER", openingCash: 0, countedCash: 0)
    assert_response :success
    close_action("CLOSE_DAY")
    assert_response :conflict
    assert_includes response.parsed_body["error"], "departure"
    patch "/api/v1/reservations/#{stay.id}/extend-stay", params: { additionalNights: 1, reason: "Guest stays another night" }, headers: headers, as: :json
    assert_response :success
    assert_no_difference ["FolioItem.count", "Payment.count", "JournalEntry.count"] do
      close_action("CLOSE_DAY")
    end
    assert_response :success
    assert_equal "CHECKED_IN", stay.reload.status
    assert stay.folio.reload.balance_due.positive?
  end

  test "started gateway payments prevent cashier closure and paid no-shows require refund review" do
    stay = book
    request = stay.folio.payment_requests.create!(kind: "ADVANCE", amount: 100, public_token: SecureRandom.hex(32), expires_at: 1.hour.from_now, status: "INITIATED")
    close_action("CLOSE_CASHIER", openingCash: 0, countedCash: 0)
    assert_response :conflict
    assert_equal "CASHIER_NOT_READY", response.parsed_body["code"]
    request.update!(status: "FAILED")
    patch "/api/v1/reservations/#{stay.id}/advance", params: { amount: 100, paymentMethod: "CASH", idempotencyKey: SecureRandom.uuid }, headers: headers, as: :json
    assert_response :success
    assert_no_difference ["Payment.count", "JournalEntry.count"] do
      patch "/api/v1/reservations/#{stay.id}/no-show", headers: headers, as: :json
    end
    assert_response :conflict
    assert_equal "ADVANCE_REVIEW_REQUIRED", response.parsed_body["code"]
    assert_equal "INQUIRY", stay.reload.status
    assert_equal 100, stay.folio.payments.sum(:amount)
  end

  test "restaurant activity and unbalanced journals prevent day closing" do
    restaurant = @property.restaurants.create!(name: "Test outlet", outlet_code: "TEST")
    table = restaurant.restaurant_tables.create!(table_number: "01", status: "OCCUPIED", capacity: 2)
    close_action("CLOSE_CASHIER", openingCash: 0, countedCash: 0)
    assert_response :success
    close_action("CLOSE_DAY")
    assert_response :conflict
    assert_includes response.parsed_body["error"], "restaurant table"
    table.update!(status: "AVAILABLE")
    @company.journal_entries.create!(property: @property, voucher_number: "BAD-TEST-JOURNAL", posting_date: Date.current, total_debit: 100, total_credit: 100)
    close_action("CLOSE_DAY")
    assert_response :conflict
    assert_includes response.parsed_body["error"], "unbalanced journal"
    assert_equal 0, @property.business_day_closings.count
  end

  test "closing requests cannot cross assigned property boundaries" do
    role = @company.roles.create!(name: "NIGHT_CLOSER", permissions: { "NIGHT_AUDIT" => %w[read create close] })
    staff = @company.users.create!(role:, email: "closer@example.test", first_name: "Night", last_name: "Closer", password: "Strong-Test-Password-2026!")
    UserProperty.create!(user: staff, property: @property)
    other = @company.properties.create!(name: "Other", code: "NO-ACCESS", business_date: Date.current)
    assert_no_difference "CashierClosing.count" do
      post "/api/v1/night-audit", params: { operation: "CLOSE_CASHIER", businessDate: Date.current.iso8601, openingCash: 0, countedCash: 0 }, headers: headers(staff).merge("X-Property-Code" => other.code), as: :json
    end
    assert_response :forbidden
    assert_equal Date.current, other.reload.operating_date
  end

  test "new receipts journals and tax calculations use the rolled business date" do
    stay = book
    patch "/api/v1/reservations/#{stay.id}/check-in", params: { roomId: @rooms.first.id }, headers: headers, as: :json
    assert_response :success
    @company.tax_configurations.find_by!(code: "VAT").update!(effective_until: Date.current)
    @company.tax_configurations.create!(code: "VAT", name: "Next day VAT", rate: 15, effective_from: Date.tomorrow, calculation_order: 1)
    close_action("CLOSE_CASHIER", openingCash: 0, countedCash: 0)
    assert_response :success
    close_action("CLOSE_DAY")
    assert_response :success
    post "/api/v1/folio", params: { operation: "ADD_CHARGE", folioId: stay.folio.id, amount: 100, description: "Next day extra" }, headers: headers, as: :json
    assert_response :success
    assert_equal 15, stay.folio.folio_items.find_by!(description: "Next day extra").tax_amount
    post "/api/v1/folio", params: { operation: "RECORD_PAYMENT", folioId: stay.folio.id, amount: 100, paymentMethod: "CASH" }, headers: headers, as: :json
    assert_response :success
    assert_equal Date.tomorrow, stay.folio.payments.sole.business_date
    restaurant = @property.restaurants.create!(name: "Test outlet", outlet_code: "TEST")
    item = restaurant.menu_items.create!(name: "Tea", price: 100, category: "Drinks")
    post "/api/v1/pos/billing", params: { outletCode: "TEST", tableNumber: "01", paymentMethod: "CASH", idempotencyKey: SecureRandom.uuid, items: [{ menuItemId: item.id, quantity: 1 }] }, headers: headers, as: :json
    assert_response :success
    entry = @property.journal_entries.find_by!(source_module: "POS_RESTAURANT")
    assert_equal Date.tomorrow, entry.posting_date
    assert_equal 115, entry.total_debit
    get "/api/v1/night-audit", headers: headers
    assert_equal 215, BigDecimal(response.parsed_body.dig("reconciliation", "cashNet"))
  end

  test "cashier requires explicit opening and counted cash instead of assuming zero" do
    [{ openingCash: "", countedCash: "0" }, { openingCash: "0", countedCash: "" }, { countedCash: "0" }].each do |amounts|
      assert_no_difference ["CashierClosing.count", "BusinessDayClosing.count", "JournalEntry.count", "AuditLog.count"] do
        close_action("CLOSE_CASHIER", **amounts)
        assert_response :unprocessable_content
        assert_equal "INVALID_CASH_AMOUNT", response.parsed_body["code"]
      end
    end
    close_action("CLOSE_CASHIER", openingCash: "0", countedCash: "0")
    assert_response :success
    assert_equal 0, @property.cashier_closings.sole.opening_cash
    assert_equal 0, @property.cashier_closings.sole.counted_cash
  end

  private

  def headers(user = @user)
    { "Authorization" => "Bearer #{Authentication::Token.encode(user)}", "X-Property-Code" => @property.code }
  end

  def close_action(operation, **extra)
    post "/api/v1/night-audit", params: { operation:, businessDate: @property.reload.operating_date.iso8601 }.merge(extra), headers: headers, as: :json
  end

  def book(rooms: 1, check_in: Date.current)
    post "/api/v1/reservations", params: { propertyCode: @property.code, roomTypeCode: @type.code, roomsCount: rooms, checkInDate: check_in.iso8601, checkOutDate: (check_in + 1.day).iso8601, adultsCount: 1, firstName: "Test", lastName: "Guest", phone: "9800000123" }, as: :json
    assert_response :created
    Reservation.find(response.parsed_body.dig("data", "id"))
  end
end
