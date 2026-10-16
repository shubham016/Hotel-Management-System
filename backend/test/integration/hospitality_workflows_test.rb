require "test_helper"

class HospitalityWorkflowsTest < ActionDispatch::IntegrationTest
  setup do
    @company = Company.create!(name: "Hospitality review", slug: "hospitality-review")
    @property = @company.properties.create!(name: "Review Hotel", code: "TEST-HOSPITALITY")
    @hall = @property.banquet_halls.create!(name: "Review Hall", code: "REVIEW", theater_capacity: 50, base_rent: 5000)
    Access::StaffRoles.install!(@company)
    @owner = @company.users.create!(role: @company.roles.find_by!(name: "OWNER"), email: "hospitality@example.test", password: password, first_name: "Review", last_name: "Owner")
    UserProperty.create!(user: @owner, property: @property)
    post "/api/v1/auth/login", params: { email: @owner.email, password: }, as: :json
    @headers = { "Authorization" => "Bearer #{response.parsed_body.dig('data', 'token')}", "X-Property-Code" => @property.code }
  end

  test "banquet persists a daily booking and rejects overlap without extra guests or journals" do
    assert_difference "BanquetBooking.count", 1 do
      assert_no_difference "JournalEntry.count" do
        post_event
        assert_response :success
      end
    end
    booking = @hall.banquet_bookings.last
    assert_equal 6000, booking.grand_total
    assert_equal 0, booking.advance_paid
    assert_equal Calendars::BikramSambat.iso(Date.current + 1), booking.nepali_date
    assert_equal (Date.current + 2).in_time_zone, booking.end_date_time
    assert_no_difference ["BanquetBooking.count", "Guest.count"] do
      post_event(phone: "9800011112")
      assert_response :conflict
      assert_equal "HALL_UNAVAILABLE", response.parsed_body["code"]
    end
    post_event(startDate: (Date.current + 2).iso8601)
    assert_response :success
    assert_equal 2, @hall.banquet_bookings.count
  end

  test "banquet rejects invalid dates amounts capacity and inactive or foreign halls" do
    invalid = [ { startDate: "bad" }, { startDate: (Date.current - 1).iso8601 },
      { expectedPax: 51 }, { expectedPax: "1.5" }, { expectedPax: 0 },
      { hallRent: -1 }, { cateringTotal: "NaN" }, { advancePaid: 6001 },
      { hallRent: "12.345" }, { eventName: " " }, { phone: "12" },
      { endDate: (Date.current + 4).iso8601 } ]
    invalid.each do |changes|
      assert_no_difference ["BanquetBooking.count", "Guest.count"] do
        post_event(**changes)
        assert_includes [400, 422], response.status, changes.inspect + response.body
      end
    end
    @hall.update!(active: false)
    post_event
    assert_response :not_found
    other = @company.properties.create!(name: "Other Hotel", code: "OTHER-HOSP")
    other.banquet_halls.create!(name: "Private Hall", code: "PRIVATE", theater_capacity: 50)
    post_event(hallCode: "PRIVATE")
    assert_response :not_found
  end

  test "historical zero duration booking still blocks that day" do
    post_event
    @hall.banquet_bookings.last.update_columns(end_date_time: (Date.current + 1).in_time_zone)
    post_event
    assert_response :conflict
  end

  test "guest create does not overwrite existing profile and explicit edit preserves identity" do
    payload = { firstName: "Guest", lastName: "One", phone: "9800011111", vipLevel: "GOLD", preferences: "Quiet room", notes: "Call before arrival" }
    post "/api/v1/crm/guests", params: payload, headers: @headers, as: :json
    assert_response :success
    guest = @company.guests.last
    assert_no_difference "Guest.count" do
      post "/api/v1/crm/guests", params: payload.merge(firstName: "Overwrite", phone: "980-001-1111"), headers: @headers, as: :json
      assert_response :conflict
    end
    assert_equal "Guest", guest.reload.first_name
    post "/api/v1/crm/guests", params: payload.merge(id: guest.id, notes: "Updated note"), headers: @headers, as: :json
    assert_response :success
    assert_equal "Updated note", guest.reload.notes
    get "/api/v1/crm/guests", headers: @headers
    assert_response :success
    assert_equal "Updated note", response.parsed_body["guests"].first["notes"]
    assert_equal "GOLD", response.parsed_body["guests"].first["vipLevel"]
  end

  test "department staff cannot book halls or modify guests and foreign guest ids are rejected" do
    cook = @company.users.create!(role: @company.roles.find_by!(name: "KITCHEN"), email: "hospitality-cook@example.test", password: password, first_name: "Review", last_name: "Cook")
    UserProperty.create!(user: cook, property: @property)
    post "/api/v1/auth/login", params: { email: cook.email, password: }, as: :json
    staff_headers = @headers.merge("Authorization" => "Bearer #{response.parsed_body.dig('data', 'token')}")
    post "/api/v1/banquet/bookings", params: event_payload, headers: staff_headers, as: :json
    assert_response :forbidden
    post "/api/v1/crm/guests", params: { firstName: "No", lastName: "Access", phone: "9800011111" }, headers: staff_headers, as: :json
    assert_response :forbidden
    foreign = Company.create!(name: "Other company", slug: "hospitality-foreign").guests.create!(first_name: "Private", last_name: "Guest", phone: "9800011112")
    post "/api/v1/crm/guests", params: { id: foreign.id, firstName: "No", lastName: "Access", phone: "9800011112" }, headers: @headers, as: :json
    assert_response :not_found
  end

  test "guest history excludes unassigned property reservations" do
    guest = @company.guests.create!(first_name: "Shared", last_name: "Guest", phone: "9800011111")
    other = @company.properties.create!(name: "Private Hotel", code: "PRIVATE-HOSP")
    [@property, other].each do |property|
      reservation = property.reservations.create!(guest:, confirmation_number: "HOSP-#{property.code}", check_in_date: Date.current,
        check_out_date: Date.current + 1, room_total: 100, grand_total: 100, status: "CHECKED_OUT")
      reservation.create_folio!(guest:, property:, folio_number: "HOSP-FOL-#{property.code}", status: "CLOSED", grand_total: 150)
    end
    get "/api/v1/crm/guests", headers: @headers
    assert_response :success
    history = response.parsed_body["guests"].find { |g| g["id"] == guest.id }["recentReservations"]
    assert_equal ["HOSP-#{@property.code}"], history.map { |r| r["confirmationNumber"] }
    profile = response.parsed_body["guests"].find { |g| g["id"] == guest.id }
    assert_equal 1, profile["stayCount"]
    assert_equal 150, profile["lifetimeSpend"]
  end

  test "table tax preview uses operating date rather than calendar date" do
    @property.update!(business_date: Date.current - 1)
    restaurant = @property.restaurants.create!(name: "Tax Restaurant", outlet_code: "TAX-REST")
    @company.tax_configurations.create!(code: "VAT", name: "Prior VAT", rate: 10, effective_from: Date.current - 10, effective_until: Date.current - 1)
    @company.tax_configurations.create!(code: "VAT", name: "New VAT", rate: 13, effective_from: Date.current)
    get "/api/v1/pos/tables", params: { outlet: restaurant.outlet_code }, headers: @headers
    assert_response :success
    assert_equal [10], response.parsed_body["taxes"].map { |t| t["rate"] }
  end

  private

  def password = "Hospitality-Test-2026!"

  def event_payload
    { hallCode: @hall.code, eventName: "Review Event", guestName: "Review Organizer", phone: "9800011111",
      startDate: (Date.current + 1).iso8601, expectedPax: 25, hallRent: 5000, cateringTotal: 1000, advancePaid: 0, idempotencyKey: SecureRandom.uuid }
  end

  def post_event(**changes)
    post "/api/v1/banquet/bookings", params: event_payload.merge(changes), headers: @headers, as: :json
  end
end
