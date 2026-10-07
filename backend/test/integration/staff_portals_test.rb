require "test_helper"

class StaffPortalsTest < ActionDispatch::IntegrationTest
  setup do
    @company = Company.create!(name: "Portal Hotel", slug: "portal-hotel")
    @property = @company.properties.create!(name: "Portal Property", code: "PORTAL")
    Access::StaffRoles.install!(@company)
    @owner = create_user("OWNER", "owner")
    @admin = create_user("ADMIN", "admin")
    @frontdesk = create_user("FRONT_DESK_STAFF", "frontdesk")
    @housekeeper = create_user("HOUSEKEEPING", "housekeeper")
    @restaurant_user = create_user("RESTAURANT", "restaurant")
    @cook = create_user("KITCHEN", "cook")
    @restaurant = @property.restaurants.create!(name: "Hotel Restaurant", outlet_code: "REST")
    @table = @restaurant.restaurant_tables.create!(table_number: "01", capacity: 4, status: "AVAILABLE")
    @menu_item = @restaurant.menu_items.create!(name: "Lunch", category: "Food", price: 1000)
    @company.tax_configurations.create!(code: "VAT", name: "VAT", rate: 13, effective_from: Date.new(2020, 1, 1), calculation_order: 1)
  end

  test "owner and all rounder have full access within their assigned property" do
    [@owner, @admin].each do |user|
      %w[ROOM_SETUP USERS REPORTS RESERVATIONS TASKS KITCHEN_ORDERS].each { |mod| assert user.role.allows?(mod, "read") }
      get "/api/v1/users", headers: headers(user)
      assert_response :success
      assert_equal 6, response.parsed_body["users"].size
      get "/api/v1/accounting/reports", headers: headers(user)
      assert_response :success
      other_property = @company.properties.create!(name: "Other #{user.id}", code: "OTHER-#{user.id.first(6)}")
      get "/api/v1/users", headers: headers(user).merge("X-Property-Code" => other_property.code)
      assert_response :forbidden
    end
  end

  test "staff receive their own permissions and cannot access management modules" do
    [@frontdesk, @housekeeper, @restaurant_user, @cook].each do |user|
      get "/api/v1/auth/me", headers: headers(user)
      assert_response :success
      data = response.parsed_body["data"]
      assert_equal user.role.name, data["role"]
      assert_equal user.role.permissions, data["permissions"]
      assert_equal false, data["fullAccess"]
      %w[/api/v1/users /api/v1/accounting/reports /api/v1/hotel_settings].each do |path|
        get path, headers: headers(user)
        assert_response :forbidden
      end
    end
    assert @frontdesk.role.allows?("CHECKOUT", "create")
    assert @frontdesk.role.allows?("RESERVATIONS", "advance")
    assert @frontdesk.role.allows?("PMS_FRONTDESK", "extend_stay")
    assert_not @frontdesk.role.allows?("RESERVATIONS", "refund")
    assert_not @frontdesk.role.allows?("RESERVATIONS", "delete")
    patch "/api/v1/reservations/#{SecureRandom.uuid}/refund", params: { refundMethod: "CASH", refundReference: "R-1" }, headers: headers(@frontdesk), as: :json
    assert_response :forbidden
    delete "/api/v1/reservations/#{SecureRandom.uuid}", headers: headers(@frontdesk)
    assert_response :forbidden
    get "/api/v1/frontdesk", headers: headers(@frontdesk)
    assert_response :success
    get "/api/v1/reservations", headers: headers(@housekeeper)
    assert_response :forbidden
    get "/api/v1/pos/tables", headers: headers(@cook)
    assert_response :forbidden
    get "/api/v1/housekeeping/tasks", headers: headers(@housekeeper)
    assert_response :success
    get "/api/v1/housekeeping/tasks", headers: headers(@restaurant_user)
    assert_response :forbidden
  end

  test "administrator creates an individual staff account and access updates revoke sessions" do
    member = @property.staff_members.create!(name: "Keshav Bhattarai", department: "All Round", position: 1)
    post "/api/v1/users", params: { staffMemberId: member.id, email: "keshav@example.com", role: "ADMIN", password: password }, headers: headers(@owner), as: :json
    assert_response :created
    user = User.find(response.parsed_body.dig("data", "id"))
    assert_equal member.id, user.staff_member_id
    assert_equal [@property.id], user.property_ids
    post "/api/v1/auth/login", params: { email: user.email, password: }, as: :json
    assert_response :success
    token = response.parsed_body.dig("data", "token")
    assert_equal true, response.parsed_body.dig("data", "fullAccess")
    patch "/api/v1/users/#{user.id}", params: { role: "HOUSEKEEPING" }, headers: headers(@owner), as: :json
    assert_response :success
    assert_equal "HOUSEKEEPING", user.reload.role.name
    get "/api/v1/auth/me", headers: headers(user).merge("Authorization" => "Bearer #{token}")
    assert_response :unauthorized
    patch "/api/v1/users/#{user.id}", params: { active: false }, headers: headers(@admin), as: :json
    assert_response :success
    post "/api/v1/auth/login", params: { email: user.email, password: }, as: :json
    assert_response :unauthorized
  end

  test "portal account creation validates role password staff ownership and protected owner" do
    member = @property.staff_members.create!(name: "Staff Person", department: "Housekeeping", position: 1)
    payload = { staffMemberId: member.id, email: "staff@example.com", role: "OWNER", password: }
    post "/api/v1/users", params: payload, headers: headers(@admin), as: :json
    assert_response :unprocessable_content
    post "/api/v1/users", params: payload.merge(role: "HOUSEKEEPING", password: "short"), headers: headers(@admin), as: :json
    assert_response :unprocessable_content
    patch "/api/v1/users/#{@owner.id}", params: { role: "HOUSEKEEPING", active: false }, headers: headers(@admin), as: :json
    assert_response :forbidden
    assert @owner.reload.active?
    other = Company.create!(name: "Other Hotel", slug: "other-portal-hotel")
    other_property = other.properties.create!(name: "Other", code: "OTHER")
    other_member = other_property.staff_members.create!(name: "Other Staff", department: "Housekeeping", position: 1)
    post "/api/v1/users", params: payload.merge(role: "HOUSEKEEPING", staffMemberId: other_member.id), headers: headers(@admin), as: :json
    assert_response :not_found
    post "/api/v1/users", params: payload.merge(role: "HOUSEKEEPING"), headers: headers(@admin), as: :json
    assert_response :created
    post "/api/v1/users", params: payload.merge(role: "HOUSEKEEPING", email: "duplicate@example.com"), headers: headers(@admin), as: :json
    assert_response :conflict
  end

  test "every staff member can change their own password without management access" do
    post "/api/v1/auth/login", params: { email: @cook.email, password: }, as: :json
    token = response.parsed_body.dig("data", "token")
    auth = headers(@cook).merge("Authorization" => "Bearer #{token}")
    patch "/api/v1/auth/profile", params: { currentPassword: "wrong", password: "New-Staff-Password-2026!", passwordConfirmation: "New-Staff-Password-2026!" }, headers: auth, as: :json
    assert_response :unprocessable_content
    patch "/api/v1/auth/profile", params: { currentPassword: password, password: "New-Staff-Password-2026!", passwordConfirmation: "New-Staff-Password-2026!" }, headers: auth, as: :json
    assert_response :success
    assert_equal 0, @cook.api_sessions.active.count
    get "/api/v1/auth/me", headers: auth
    assert_response :unauthorized
    post "/api/v1/auth/login", params: { email: @cook.email, password: "New-Staff-Password-2026!" }, as: :json
    assert_response :success
  end

  test "restaurant sends persistent kitchen tickets and cook cannot serve or bill" do
    key = SecureRandom.uuid
    payload = { tableId: @table.id, idempotencyKey: key, items: [{ menuItemId: @menu_item.id, quantity: 2 }], notes: "No chilli" }
    post "/api/v1/pos/kitchen_orders", params: payload, headers: headers(@restaurant_user), as: :json
    assert_response :created
    id = response.parsed_body.dig("order", "id")
    assert_equal "OCCUPIED", @table.reload.status
    assert_difference "KitchenOrder.count", 0 do
      post "/api/v1/pos/kitchen_orders", params: payload, headers: headers(@restaurant_user), as: :json
    end
    assert_equal id, response.parsed_body.dig("order", "id")
    get "/api/v1/pos/kitchen_orders", headers: headers(@cook)
    assert_response :success
    assert_equal "No chilli", response.parsed_body.dig("orders", 0, "notes")
    patch "/api/v1/pos/kitchen_orders/#{id}", params: { status: "SERVED" }, headers: headers(@cook), as: :json
    assert_response :forbidden
    patch "/api/v1/pos/kitchen_orders/#{id}", params: { status: "PREPARING" }, headers: headers(@cook), as: :json
    assert_response :success
    patch "/api/v1/pos/kitchen_orders/#{id}", params: { status: "READY" }, headers: headers(@cook), as: :json
    assert_response :success
    patch "/api/v1/pos/kitchen_orders/#{id}", params: { status: "SERVED" }, headers: headers(@restaurant_user), as: :json
    assert_response :success
    post "/api/v1/pos/billing", params: { outletCode: "REST" }, headers: headers(@cook), as: :json
    assert_response :forbidden
    get "/api/v1/pos/kitchen_orders", headers: headers(@cook)
    assert_equal [], response.parsed_body["orders"]
    get "/api/v1/pos/tables", params: { outlet: "REST" }, headers: headers(@restaurant_user)
    assert_equal id, response.parsed_body.dig("tables", 0, "orders", 0, "id")
  end

  test "ticket settlement uses saved prices clears table and rejects double settlement" do
    post "/api/v1/pos/kitchen_orders", params: { tableId: @table.id, idempotencyKey: SecureRandom.uuid, items: [{ menuItemId: @menu_item.id, quantity: 2 }] }, headers: headers(@restaurant_user), as: :json
    id = response.parsed_body.dig("order", "id")
    payload = { outletCode: "REST", tableNumber: "01", kitchenOrderIds: [id], idempotencyKey: SecureRandom.uuid, paymentMethod: "CASH", grandTotal: 1 }
    post "/api/v1/pos/billing", params: payload, headers: headers(@restaurant_user), as: :json
    assert_response :conflict
    assert_equal "ORDER_NOT_SERVED", response.parsed_body["code"]
    order = KitchenOrder.find(id)
    order.update!(status: "SERVED")
    @menu_item.update!(price: 2000)
    post "/api/v1/pos/billing", params: payload, headers: headers(@restaurant_user), as: :json
    assert_response :success
    assert_equal 2260, @company.journal_entries.last.total_debit
    assert order.reload.settled_at
    assert_equal "AVAILABLE", @table.reload.status
    assert_difference "JournalEntry.count", 0 do
      post "/api/v1/pos/billing", params: payload, headers: headers(@restaurant_user), as: :json
    end
    assert_response :success
    post "/api/v1/pos/billing", params: payload.merge(idempotencyKey: SecureRandom.uuid), headers: headers(@restaurant_user), as: :json
    assert_response :conflict
  end

  test "kitchen rejects invalid menu quantity and cross property orders" do
    payload = { tableId: @table.id, idempotencyKey: SecureRandom.uuid, items: [{ menuItemId: @menu_item.id, quantity: -1 }] }
    post "/api/v1/pos/kitchen_orders", params: payload, headers: headers(@restaurant_user), as: :json
    assert_response :unprocessable_content
    assert_equal 0, KitchenOrder.count
    post "/api/v1/pos/kitchen_orders", params: payload.merge(items: [{ menuItemId: @menu_item.id, quantity: 1.5 }]), headers: headers(@restaurant_user), as: :json
    assert_response :unprocessable_content
    post "/api/v1/pos/kitchen_orders", params: payload.merge(items: [{ menuItemId: @menu_item.id, quantity: 1 }]), headers: headers(@cook), as: :json
    assert_response :forbidden
    other_property = @company.properties.create!(name: "Other Outlet", code: "OTHER-OUTLET")
    other_restaurant = other_property.restaurants.create!(name: "Other", outlet_code: "OTHER-REST")
    other_table = other_restaurant.restaurant_tables.create!(table_number: "01", capacity: 4)
    post "/api/v1/pos/kitchen_orders", params: payload.merge(tableId: other_table.id), headers: headers(@restaurant_user), as: :json
    assert_response :not_found
  end

  test "ticket room posting uses saved prices and rejects missing room without taking payment" do
    room_type = @property.room_types.create!(name: "Standard", code: "STD", slug: "standard", base_price: 1000, setup_managed: true)
    room = @property.rooms.create!(room_type:, room_number: "101", setup_managed: true, status: "OCCUPIED")
    guest = @company.guests.create!(first_name: "Guest", last_name: "One", phone: "9800000000")
    reservation = @property.reservations.create!(guest:, confirmation_number: "ROOM-BOOKING", status: "CHECKED_IN", source: "WALK_IN", check_in_date: Date.current, check_out_date: Date.tomorrow, adults_count: 1, room_total: 0, grand_total: 0)
    reservation.reservation_rooms.create!(room_type:, room:, nightly_rate: 1000, nights: 1)
    folio = @property.folios.create!(reservation:, guest:, folio_number: "ROOM-FOLIO", status: "OPEN")
    post "/api/v1/pos/kitchen_orders", params: { tableId: @table.id, idempotencyKey: SecureRandom.uuid, items: [{ menuItemId: @menu_item.id, quantity: 2 }] }, headers: headers(@restaurant_user), as: :json
    order = KitchenOrder.find(response.parsed_body.dig("order", "id"))
    order.update!(status: "SERVED")
    @menu_item.update!(price: 2000)
    payload = { outletCode: "REST", tableNumber: "01", kitchenOrderIds: [order.id], idempotencyKey: SecureRandom.uuid, postToRoom: true }
    assert_no_difference "JournalEntry.count" do
      post "/api/v1/pos/billing", params: payload, headers: headers(@restaurant_user), as: :json
    end
    assert_response :unprocessable_content
    assert_equal "ROOM_REQUIRED", response.parsed_body["code"]
    get "/api/v1/pos/tables", params: { outlet: "REST" }, headers: headers(@restaurant_user)
    assert_equal "101", response.parsed_body.dig("inHouseRooms", 0, "roomNumber")
    post "/api/v1/pos/billing", params: payload.merge(roomNumber: "101"), headers: headers(@restaurant_user), as: :json
    assert_response :success
    assert_equal 2260, folio.reload.balance_due
    assert_equal 1000.0, folio.folio_items.last.calculation_snapshot.dig("lines", 0, "unitPrice")
    assert order.reload.settled_at
    assert_equal "AVAILABLE", @table.reload.status
    assert_no_difference "FolioItem.count" do
      post "/api/v1/pos/billing", params: payload.merge(roomNumber: "101"), headers: headers(@restaurant_user), as: :json
    end
    assert_response :success
    assert_equal 2260, folio.reload.balance_due
  end

  private


  def password = "Staff-Strong-Password-2026!"

  def create_user(role_name, email_name)
    user = @company.users.create!(role: @company.roles.find_by!(name: role_name), email: "#{email_name}@example.com", first_name: email_name.titleize, last_name: "Staff", password:)
    user.user_properties.create!(property: @property)
    user
  end

  def headers(user)
    { "Authorization" => "Bearer #{Authentication::Token.encode(user)}", "X-Property-Code" => @property.code }
  end
end
