require "test_helper"

class PosBillingTest < ActionDispatch::IntegrationTest
  setup do
    @company = Company.create!(name: "Test Hotel Group", slug: "pos-billing-test-group")
    @property = @company.properties.create!(name: "Test Hotel", code: "TEST-POS")
    @role = @company.roles.create!(name: "SUPER_ADMIN", system: true)
    @user = @company.users.create!(
      role: @role,
      email: "cashier@example.com",
      password: "Strong-Test-Password-2026!",
      password_confirmation: "Strong-Test-Password-2026!",
      first_name: "POS",
      last_name: "Cashier"
    )
    UserProperty.create!(user: @user, property: @property)
    @company.tax_configurations.create!(code: "SERVICE_CHARGE", name: "Service Charge", rate: 10, effective_from: Date.new(2020, 1, 1), calculation_order: 1)
    @company.tax_configurations.create!(code: "VAT", name: "VAT", rate: 13, effective_from: Date.new(2020, 1, 1), calculation_order: 2)

    @restaurant = @property.restaurants.create!(name: "Test Restaurant", outlet_code: "TEST-REST")
    @item = @restaurant.menu_items.create!(name: "Test Dish", category: "Nepali", price: 1_000)

    @token = auth_token
  end

  test "billing recomputes totals from server menu prices and ignores client-sent totals" do
    post "/api/v1/pos/billing", params: {
      outletCode: @restaurant.outlet_code,
      tableNumber: "T-01",
      items: [ { menuItemId: @item.id, quantity: 2 } ],
      idempotencyKey: SecureRandom.uuid,
      # A malicious/buggy client sending a bogus low total must have no effect.
      grandTotal: 1,
      subTotal: 1,
      vatAmount: 0,
      serviceCharge: 0
    }, headers: auth_headers, as: :json

    assert_response :success
    voucher = JournalEntry.order(:created_at).last
    # 2 x 1000 = 2000 sub, +10% SC (200) = 2200, +13% VAT on 2200 (286) = 2486 grand.
    assert_equal 2_486.0, voucher.total_debit.to_f
    assert_equal 2_486.0, voucher.total_credit.to_f
  end

  test "unknown menu item id is rejected" do
    post "/api/v1/pos/billing", params: {
      outletCode: @restaurant.outlet_code,
      tableNumber: "T-01",
      items: [ { menuItemId: SecureRandom.uuid, quantity: 1 } ],
      idempotencyKey: SecureRandom.uuid
    }, headers: auth_headers, as: :json

    assert_response :unprocessable_entity
    assert_equal "INVALID_MENU_ITEM", response.parsed_body["code"]
  end

  test "posted journal entries are immutable" do
    post "/api/v1/pos/billing", params: {
      outletCode: @restaurant.outlet_code,
      tableNumber: "T-01",
      items: [ { menuItemId: @item.id, quantity: 1 } ],
      idempotencyKey: SecureRandom.uuid
    }, headers: auth_headers, as: :json
    assert_response :success

    voucher = JournalEntry.order(:created_at).last
    assert_raises(ActiveRecord::ReadOnlyRecord) { voucher.update!(narration: "tampered") }
    assert_raises(ActiveRecord::ReadOnlyRecord) { voucher.destroy! }
  end

  test "retrying the same idempotency key does not double-post the journal" do
    key = SecureRandom.uuid
    payload = { outletCode: @restaurant.outlet_code, tableNumber: "T-01", items: [ { menuItemId: @item.id, quantity: 1 } ], idempotencyKey: key }

    assert_difference "JournalEntry.count", 1 do
      post "/api/v1/pos/billing", params: payload, headers: auth_headers, as: :json
      assert_response :success
      post "/api/v1/pos/billing", params: payload, headers: auth_headers, as: :json
      assert_response :success
    end
  end

  private

  def auth_token
    post "/api/v1/auth/login", params: { email: @user.email, password: "Strong-Test-Password-2026!" }, as: :json
    response.parsed_body.dig("data", "token")
  end

  def auth_headers
    { "Authorization" => "Bearer #{@token}", "X-Property-Code" => @property.code }
  end
end
