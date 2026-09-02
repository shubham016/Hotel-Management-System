require "test_helper"

class NotificationsTest < ActionDispatch::IntegrationTest
  setup do
    @company = Company.create!(name: "Test Hotel Group", slug: "notifications-test-group")
    @property = @company.properties.create!(name: "Test Hotel", code: "TEST-NOTIF")
    @role = @company.roles.create!(name: "OWNER", permissions: { "NOTIFICATIONS" => %w[read update] })
    @user = @company.users.create!(
      role: @role,
      email: "owner@example.com",
      password: "Strong-Test-Password-2026!",
      password_confirmation: "Strong-Test-Password-2026!",
      first_name: "Property",
      last_name: "Owner"
    )
    UserProperty.create!(user: @user, property: @property)
    @notification = @user.notifications.create!(title: "New Inquiry", message: "A guest reached out.", action_url: "/admin/crm")

    post "/api/v1/auth/login", params: { email: @user.email, password: "Strong-Test-Password-2026!" }, as: :json
    @token = response.parsed_body.dig("data", "token")
  end

  test "a scoped role with NOTIFICATIONS permission can list and mark notifications read" do
    get "/api/v1/notifications", headers: auth_headers, as: :json
    assert_response :success
    body = response.parsed_body
    assert_equal 1, body["unreadCount"]
    assert_equal false, body["notifications"].first["read"]

    patch "/api/v1/notifications/#{@notification.id}", headers: auth_headers, as: :json
    assert_response :success
    assert response.parsed_body.dig("notification", "read")
    assert @notification.reload.read_at.present?
  end

  test "a role without NOTIFICATIONS permission is forbidden" do
    limited_role = @company.roles.create!(name: "NO_NOTIFS", permissions: {})
    user = @company.users.create!(
      role: limited_role,
      email: "limited@example.com",
      password: "Strong-Test-Password-2026!",
      password_confirmation: "Strong-Test-Password-2026!",
      first_name: "Limited",
      last_name: "User"
    )
    UserProperty.create!(user:, property: @property)
    post "/api/v1/auth/login", params: { email: user.email, password: "Strong-Test-Password-2026!" }, as: :json
    token = response.parsed_body.dig("data", "token")

    get "/api/v1/notifications", headers: { "Authorization" => "Bearer #{token}" }, as: :json
    assert_response :forbidden
  end

  private

  def auth_headers
    { "Authorization" => "Bearer #{@token}" }
  end
end
