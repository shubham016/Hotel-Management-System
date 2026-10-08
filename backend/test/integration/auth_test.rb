require "test_helper"
require "stringio"

class AuthTest < ActionDispatch::IntegrationTest
  setup do
    company = Company.create!(name: "Test Hotel Group", slug: "test-hotel-group")
    property = company.properties.create!(name: "Test Hotel", code: "TEST-HOTEL")
    role = company.roles.create!(name: "SUPER_ADMIN", system: true)
    @user = company.users.create!(
      role:,
      email: "owner@example.com",
      password: "Strong-Test-Password-2026!",
      first_name: "Test",
      last_name: "Owner"
    )
    UserProperty.create!(user: @user, property:)
  end

  test "valid credentials return a signed access token" do
    post "/api/v1/auth/login", params: {
      email: @user.email,
      password: "Strong-Test-Password-2026!"
    }, as: :json

    assert_response :success
    body = response.parsed_body
    assert body["success"]
    assert body.dig("data", "token").present?
    assert body.dig("data", "refreshToken").present?
    assert_equal "SUPER_ADMIN", body.dig("data", "role")
  end

  test "refresh token rotates the api session" do
    post "/api/v1/auth/login", params: {
      email: @user.email,
      password: "Strong-Test-Password-2026!"
    }, as: :json
    refresh_token = response.parsed_body.dig("data", "refreshToken")

    assert_difference "ApiSession.active.count", 0 do
      post "/api/v1/auth/refresh", params: { refreshToken: refresh_token }, as: :json
    end

    assert_response :success
    assert response.parsed_body.dig("data", "accessToken").present?
    assert_not_equal refresh_token, response.parsed_body.dig("data", "refreshToken")

    post "/api/v1/auth/refresh", params: { refreshToken: refresh_token }, as: :json
    assert_response :unauthorized
  end

  test "password reset changes password and revokes sessions" do
    post "/api/v1/auth/login", params: {
      email: @user.email,
      password: "Strong-Test-Password-2026!"
    }, as: :json
    assert_equal 1, ApiSession.active.count

    _, reset_token = PasswordResetToken.issue!(user: @user, request:)

    patch "/api/v1/auth/password", params: { token: reset_token, password: "Changed-Test-Password-2026!" }, as: :json
    assert_response :success
    assert_equal 0, ApiSession.active.count

    post "/api/v1/auth/login", params: {
      email: @user.email,
      password: "Changed-Test-Password-2026!"
    }, as: :json
    assert_response :success
  end

  test "invalid credentials are rejected without a demonstration bypass" do
    post "/api/v1/auth/login", params: { email: "missing@example.com", password: "Admin@123" }, as: :json

    assert_response :unauthorized
    assert_equal "INVALID_CREDENTIALS", response.parsed_body["code"]
  end

  test "failed login diagnostics identify rejection without exposing credentials" do
    captured = StringIO.new
    original_logger = Rails.logger
    Rails.logger = ActiveSupport::Logger.new(captured)
    begin
      post "/api/v1/auth/login", params: { email: "missing@example.com", password: "Wrong-Password-2026!" }, as: :json
      assert_response :unauthorized
      assert_equal "Invalid email or password", response.parsed_body["error"]
      assert_includes captured.string, "reason=ACCOUNT_NOT_FOUND"

      post "/api/v1/auth/login", params: { email: @user.email.upcase, password: "Wrong-Password-2026!" }, as: :json
      assert_response :unauthorized
      assert_equal "Invalid email or password", response.parsed_body["error"]
      assert_includes captured.string, "reason=PASSWORD_MISMATCH"
      assert_includes captured.string, "user_id=#{@user.id}"

      @user.update!(active: false)
      post "/api/v1/auth/login", params: { email: @user.email, password: "Strong-Test-Password-2026!" }, as: :json
      assert_response :unauthorized
      assert_equal "Invalid email or password", response.parsed_body["error"]
      assert_includes captured.string, "reason=ACCOUNT_INACTIVE"
    ensure
      Rails.logger = original_logger
    end
    assert_equal 0, @user.api_sessions.count
    captured.string.lines.grep(/Authentication failed/).each do |message|
      assert_not_includes message, @user.email
      assert_not_includes message, "missing@example.com"
      assert_not_includes message, "Wrong-Password-2026!"
      assert_not_includes message, "Strong-Test-Password-2026!"
      assert_not_includes message, @user.password_digest
    end
  end
end
