require "test_helper"

class StaffPasswordResetTest < ActionDispatch::IntegrationTest
  include ActiveJob::TestHelper

  setup do
    @company = Company.create!(name: "Reset Hotel", slug: "reset-hotel")
    @property = @company.properties.create!(name: "Reset Property", code: "RESET")
    Access::StaffRoles.install!(@company)
    @owner = create_user("OWNER", "owner")
    @admin = create_user("ADMIN", "admin")
    @staff = create_user("FRONT_DESK_STAFF", "staff")
    ActionMailer::Base.deliveries.clear
    clear_enqueued_jobs
  end

  test "request emails assigned administrators without exposing a token or changing password" do
    original_digest = @staff.password_digest
    perform_enqueued_jobs { post "/api/v1/auth/password", params: { email: " #{@staff.email.upcase} " }, as: :json }
    assert_response :success
    assert_nil response.parsed_body["resetToken"]
    assert @staff.reload.password_reset_requested_at
    assert_equal "SENT", @staff.password_reset_email_status
    assert_equal original_digest, @staff.password_digest
    assert_equal 0, @staff.password_reset_tokens.count
    assert_equal [@owner.email, @admin.email].sort, ActionMailer::Base.deliveries.flat_map(&:to).sort
    assert_equal 2, Notification.where(action_url: "/admin/staff-access?user=#{@staff.id}").count
    ActionMailer::Base.deliveries.each do |mail|
      assert_includes mail.body.encoded, @staff.email
      assert_includes mail.body.encoded, "/admin/staff-access?user=#{@staff.id}"
      assert_not_includes mail.body.encoded, password
    end
    assert_no_enqueued_jobs { post "/api/v1/auth/password", params: { email: @staff.email }, as: :json }
    assert_response :success
    assert_equal 2, Notification.where(action_url: "/admin/staff-access?user=#{@staff.id}").count
  end

  test "unknown inactive and protected accounts get the same response without sending mail" do
    post "/api/v1/auth/password", params: { email: "unknown@example.com" }, as: :json
    expected = response.parsed_body
    assert_response :success
    @staff.update!(active: false)
    [@staff.email, @owner.email].each do |email|
      assert_no_enqueued_jobs { post "/api/v1/auth/password", params: { email: }, as: :json }
      assert_response :success
      assert_equal expected, response.parsed_body
    end
    assert_equal 0, Notification.count
    assert_nil @staff.reload.password_reset_requested_at
  end

  test "request emails cannot cross property or company boundaries" do
    other_property = @company.properties.create!(name: "Other Property", code: "RESET-OTHER")
    other_admin = create_user("ADMIN", "other-admin", property: other_property)
    other_company = Company.create!(name: "Other Hotel", slug: "other-reset-hotel")
    other_hotel = other_company.properties.create!(name: "Other Hotel", code: "RESET-OTHER-HOTEL")
    Access::StaffRoles.install!(other_company)
    other_owner = other_company.users.create!(role: other_company.roles.find_by!(name: "OWNER"), email: "other-owner@example.com", first_name: "Other", last_name: "Owner", password:)
    other_owner.user_properties.create!(property: other_hotel)
    perform_enqueued_jobs { post "/api/v1/auth/password", params: { email: @staff.email }, as: :json }
    assert_response :success
    assert_equal 0, other_admin.notifications.count
    assert_equal 0, other_owner.notifications.count
    assert_not_includes ActionMailer::Base.deliveries.flat_map(&:to), other_admin.email
    assert_not_includes ActionMailer::Base.deliveries.flat_map(&:to), other_owner.email
  end

  test "administrator reset clears request revokes sessions and staff can choose a private password" do
    post "/api/v1/auth/login", params: { email: @staff.email, password: }, as: :json
    old_token = response.parsed_body.dig("data", "token")
    PasswordResetToken.issue!(user: @staff, request:)
    post "/api/v1/auth/password", params: { email: @staff.email }, as: :json
    assert_response :success
    patch "/api/v1/users/#{@staff.id}", params: { role: "FRONT_DESK_STAFF" }, headers: headers(@owner), as: :json
    assert_response :success
    assert @staff.reload.password_reset_requested_at
    replacement = "Replacement-Password-2026!"
    patch "/api/v1/users/#{@staff.id}", params: { password: replacement }, headers: headers(@owner), as: :json
    assert_response :success
    assert_nil @staff.reload.password_reset_requested_at
    assert_nil @staff.password_reset_email_status
    assert_equal 0, @staff.api_sessions.active.count
    assert_equal 0, @staff.password_reset_tokens.active.count
    get "/api/v1/auth/me", headers: headers(@staff).merge("Authorization" => "Bearer #{old_token}")
    assert_response :unauthorized
    post "/api/v1/auth/login", params: { email: @staff.email, password: replacement }, as: :json
    assert_response :success
    token = response.parsed_body.dig("data", "token")
    private_password = "Employee-Private-Password-2026!"
    patch "/api/v1/auth/profile", params: { currentPassword: replacement, password: private_password, passwordConfirmation: private_password }, headers: headers(@staff).merge("Authorization" => "Bearer #{token}"), as: :json
    assert_response :success
    post "/api/v1/auth/login", params: { email: @staff.email, password: replacement }, as: :json
    assert_response :unauthorized
    post "/api/v1/auth/login", params: { email: @staff.email, password: private_password }, as: :json
    assert_response :success
  end

  private

  def password = "Staff-Reset-Test-Password-2026!"

  def create_user(role, name, property: @property)
    user = @company.users.create!(role: @company.roles.find_by!(name: role), email: "#{name}@example.com", first_name: name, last_name: "Staff", password:)
    user.user_properties.create!(property:)
    user
  end

  def headers(user)
    { "Authorization" => "Bearer #{Authentication::Token.encode(user)}", "X-Property-Code" => @property.code }
  end
end
