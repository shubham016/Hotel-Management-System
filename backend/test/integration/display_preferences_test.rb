require "test_helper"

class DisplayPreferencesTest < ActionDispatch::IntegrationTest
  setup do
    @company = Company.create!(name: "Display Test", slug: "display-preferences-test")
    @property = @company.properties.create!(name: "Display Hotel", code: "DISPLAY-TEST")
    Access::StaffRoles.install!(@company)
    @owner = actor("OWNER", "owner")
    @desk = actor("FRONT_DESK_STAFF", "desk")
  end

  test "preferences persist and reach staff sessions without changing accounting currency or payroll calendar" do
    assert @property.nepali_calendar_enabled?
    assert_equal "SYMBOL", @property.currency_display
    assert_difference "AuditLog.count", 1 do
      patch "/api/v1/hotel_settings", params: { display_preferences: { currency_display: "CODE", nepali_calendar_enabled: false } }, headers: headers(@owner), as: :json
    end
    assert_response :success
    refute @property.reload.nepali_calendar_enabled?
    assert_equal "CODE", @property.currency_display
    assert_equal "NPR", @company.reload.currency_code
    get "/api/v1/hotel_settings", headers: headers(@owner)
    assert_equal({ "currency_code" => "NPR", "currency_display" => "CODE", "nepali_calendar_enabled" => false }, response.parsed_body.dig("data", "display_preferences"))
    get "/api/v1/auth/me", headers: headers(@desk)
    assert_response :success
    assert_equal "CODE", response.parsed_body.dig("data", "displayPreferences", "currency_display")
    assert_equal false, response.parsed_body.dig("data", "displayPreferences", "nepali_calendar_enabled")
    get "/api/v1/accounting/payroll", params: { calendar: "BS", period: Calendars::BikramSambat.iso(Date.current).first(7) }, headers: headers(@owner)
    assert_response :success
    assert_equal "BS", response.parsed_body.dig("payroll_period", "system")
  end

  test "invalid preferences and currency relabeling cannot alter financial records" do
    [ { currency_display: "USD" }, { nepali_calendar_enabled: "false" }, { nepali_calendar_enabled: nil }, { currency_code: "USD" } ].each do |invalid|
      assert_no_difference ["AuditLog.count", "JournalEntry.count", "Payment.count"] do
        patch "/api/v1/hotel_settings", params: { property: { name: "Must roll back" }, display_preferences: invalid }, headers: headers(@owner), as: :json
      end
      assert_response :unprocessable_content
      assert_equal "Display Hotel", @property.reload.name
      assert_equal "SYMBOL", @property.currency_display
      assert @property.nepali_calendar_enabled?
      assert_equal "NPR", @company.reload.currency_code
    end
  end

  test "only authorized staff can change preferences and changes stay within their property" do
    patch "/api/v1/hotel_settings", params: { display_preferences: { currency_display: "CODE" } }, headers: headers(@desk), as: :json
    assert_response :forbidden
    other = @company.properties.create!(name: "Other", code: "OTHER-DISPLAY")
    patch "/api/v1/hotel_settings", params: { display_preferences: { currency_display: "CODE" } }, headers: headers(@owner).merge("X-Property-Code" => other.code), as: :json
    assert_response :forbidden
    assert_equal "SYMBOL", other.reload.currency_display
  end

  private

  def actor(role, name)
    user = @company.users.create!(role: @company.roles.find_by!(name: role), email: "display-#{name}@example.test", first_name: "Display", last_name: name, password: "Display-Test-Password-2026!")
    user.user_properties.create!(property: @property)
    user
  end
  def headers(user) = { "Authorization" => "Bearer #{Authentication::Token.encode(user)}", "X-Property-Code" => @property.code }
end
