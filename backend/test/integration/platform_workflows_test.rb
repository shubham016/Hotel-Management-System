require "test_helper"

class PlatformWorkflowsTest < ActionDispatch::IntegrationTest
  setup do
    @company = Company.create!(name: "Platform Test", slug: "platform-workflows-test")
    @property = @company.properties.create!(name: "Platform Hotel", code: "PLATFORM-TEST")
    @second = @company.properties.create!(name: "Second Hotel", code: "PLATFORM-SECOND")
    Access::StaffRoles.install!(@company)
    @owner = actor("OWNER", "owner")
    @owner.user_properties.create!(property: @second)
    @desk = actor("FRONT_DESK_STAFF", "desk")
  end

  test "CMS pages remain property specific and override company defaults deterministically" do
    @company.cms_pages.create!(slug: "home", title: "Company fallback", published: true)
    [@property, @second].each do |property|
      post "/api/v1/cms/pages", params: { slug: "home", title: property.name, heroHeading: property.name, seoTitle: "SEO #{property.name}" }, headers: headers(property: property), as: :json
      assert_response :success
      get "/api/v1/cms/pages", params: { propertyCode: property.code, slug: "home" }
      assert_response :success
      assert_equal property.name, response.parsed_body.dig("page", "heroHeading")
    end
    assert_equal 3, @company.cms_pages.where(slug: "home").count
    assert_equal @property.name, @property.cms_pages.find_by!(slug: "home").title
    assert_equal @second.name, @second.cms_pages.find_by!(slug: "home").title
    get "/api/v1/cms/pages", params: { propertyCode: @property.code, slug: "home" }
    assert_equal @property.name, response.parsed_body.dig("page", "heroHeading")
    assert_no_difference ["CmsPage.count", "AuditLog.count"] do
      post "/api/v1/cms/pages", params: { slug: "invalid", title: "Invalid" }, headers: headers, as: :json
    end
    assert_response :unprocessable_content
    post "/api/v1/cms/pages", params: { slug: "home", title: "Denied" }, headers: headers(@desk), as: :json
    assert_response :forbidden
  end

  test "audit logs expose actors and searchable paginated records only for the selected property" do
    101.times do |index|
      AuditLog.create!(company: @company, property: @property, user: @owner, module_name: "CMS", action: "UPDATE", entity_type: "CmsPage", entity_id: SecureRandom.uuid, ip_address: "192.0.2.10")
    end
    hidden = AuditLog.create!(company: @company, property: @second, user: @owner, module_name: "PRIVATE", action: "CREATE", entity_type: "Property", entity_id: @second.id)
    get "/api/v1/audit_logs", headers: headers
    assert_response :success
    assert_equal 101, response.parsed_body["total"]
    assert_equal 100, response.parsed_body["logs"].length
    assert response.parsed_body["hasNext"]
    assert_equal ["CMS"], response.parsed_body["modules"]
    first = response.parsed_body["logs"].first
    assert_equal "CMS", first["module"]
    assert_equal @owner.full_name, first["actor"]
    assert_equal "192.0.2.10", first["ipAddress"]
    assert first["createdAt"].present?
    assert first["entityName"].present?
    assert first["description"].present?
    refute_includes response.parsed_body["logs"].pluck("id"), hidden.id
    get "/api/v1/audit_logs", params: { page: 2 }, headers: headers
    assert_equal 1, response.parsed_body["logs"].length
    refute response.parsed_body["hasNext"]
    get "/api/v1/audit_logs", params: { q: "UPDATE", module: "CMS" }, headers: headers
    assert_equal 101, response.parsed_body["total"]
    get "/api/v1/audit_logs", params: { q: "not-found" }, headers: headers
    assert_equal 0, response.parsed_body["total"]
    get "/api/v1/audit_logs", headers: headers(@desk)
    assert_response :forbidden
    assert_raises(ActiveRecord::ReadOnlyRecord) { AuditLog.find(first["id"]).update!(action: "DELETE") }
  end

  test "deactivating an employee disables login and revokes sessions while preserving payroll and audit links" do
    member = @property.staff_members.create!(name: "Portal Staff", department: "Front Desk")
    @desk.update!(staff_member: member)
    post "/api/v1/auth/login", params: { email: @desk.email, password: password }, as: :json
    assert_response :success
    token = response.parsed_body.dig("data", "token")
    refresh = response.parsed_body.dig("data", "refreshToken")
    delete "/api/v1/staff_members/#{member.id}", headers: headers
    assert_response :success
    refute member.reload.active?
    refute @desk.reload.active?
    assert_equal member.id, @desk.staff_member_id
    assert_equal 0, @desk.api_sessions.active.count
    assert AuditLog.exists?(entity_id: @desk.id, action: "DEACTIVATE", user: @owner)
    get "/api/v1/auth/me", headers: headers(@desk).merge("Authorization" => "Bearer #{token}")
    assert_response :unauthorized
    post "/api/v1/auth/refresh", params: { refreshToken: refresh }, as: :json
    assert_response :unauthorized
    post "/api/v1/auth/login", params: { email: @desk.email, password: password }, as: :json
    assert_response :unauthorized
    patch "/api/v1/users/#{@desk.id}", params: { active: true }, headers: headers, as: :json
    assert_response :unprocessable_content
    refute @desk.reload.active?
    patch "/api/v1/staff_members/#{member.id}", params: { staff_member: { active: true } }, headers: headers, as: :json
    assert_response :success
    refute @desk.reload.active?
    patch "/api/v1/users/#{@desk.id}", params: { active: true }, headers: headers, as: :json
    assert_response :success
  end

  test "protected accounts and inactive legacy employees cannot bypass staff access safeguards" do
    member = @property.staff_members.create!(name: "Owner Staff", department: "Management")
    @owner.update!(staff_member: member)
    delete "/api/v1/staff_members/#{member.id}", headers: headers
    assert_response :unprocessable_content
    assert member.reload.active?
    staff = @property.staff_members.create!(name: "Legacy Staff", department: "Front Desk")
    @desk.update!(staff_member: staff)
    staff.update_column(:active, false)
    post "/api/v1/auth/login", params: { email: @desk.email, password: password }, as: :json
    assert_response :unauthorized
    get "/api/v1/auth/me", headers: headers(@desk)
    assert_response :unauthorized
    assert_no_difference "Notification.count" do
      post "/api/v1/auth/password", params: { email: @desk.email }, as: :json
    end
    assert_response :success
    assert_nil @desk.reload.password_reset_requested_at
  end

  test "settings use the current tax version and roll back invalid property times" do
    old = @company.tax_configurations.create!(code: "VAT", name: "Old VAT", rate: 13, effective_from: Date.current - 10, effective_until: Date.current - 2, calculation_order: 1)
    current = @company.tax_configurations.create!(code: "VAT", name: "VAT", rate: 13, effective_from: Date.current - 1, calculation_order: 1)
    future = @company.tax_configurations.create!(code: "VAT", name: "Future VAT", rate: 13, effective_from: Date.current + 1, calculation_order: 1)
    patch "/api/v1/hotel_settings", params: { vat: { inclusive: true } }, headers: headers, as: :json
    assert_response :success
    assert current.reload.inclusive?
    refute old.reload.inclusive?
    refute future.reload.inclusive?
    get "/api/v1/hotel_settings", headers: headers
    assert response.parsed_body.dig("data", "vat", "inclusive")
    %i[check_in_time check_out_time].each do |field|
      assert_no_difference "AuditLog.count" do
        patch "/api/v1/hotel_settings", params: { property: { name: "Must roll back", field => "25:90" } }, headers: headers, as: :json
      end
      assert_response :unprocessable_content
      assert_equal "Platform Hotel", @property.reload.name
    end
  end

  test "floor renumbering cannot leave rooms with an undefined floor" do
    floor = @property.floors.create!(number: 1, name: "First floor")
    category = @property.room_types.create!(name: "Standard", code: "STD", slug: "standard", base_price: 2000, setup_managed: true)
    room = @property.rooms.create!(room_type: category, room_number: "101", floor: 1, setup_managed: true)
    patch "/api/v1/floors/#{floor.id}", params: { floor: { number: 2, name: "Moved floor" } }, headers: headers, as: :json
    assert_response :unprocessable_content
    assert_equal 1, floor.reload.number
    assert_equal 1, room.reload.floor
    patch "/api/v1/floors/#{floor.id}", params: { floor: { name: "New display name" } }, headers: headers, as: :json
    assert_response :success
    assert_equal "New display name", floor.reload.name
  end

  private

  def password = "Platform-Review-Test-2026!"
  def actor(role, name)
    user = @company.users.create!(role: @company.roles.find_by!(name: role), email: "platform-#{name}@example.test", first_name: "Platform", last_name: name, password: password)
    user.user_properties.create!(property: @property)
    user
  end
  def headers(user = @owner, property: @property)
    { "Authorization" => "Bearer #{Authentication::Token.encode(user)}", "X-Property-Code" => property.code }
  end
end
