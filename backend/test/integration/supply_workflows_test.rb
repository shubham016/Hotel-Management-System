require "test_helper"

class SupplyWorkflowsTest < ActionDispatch::IntegrationTest
  setup do
    @company = Company.create!(name: "Supply Test", slug: "supply-test")
    @property = @company.properties.create!(name: "Supply Hotel", code: "SUPPLY-TEST", business_date: Date.current - 1)
    Access::StaffRoles.install!(@company)
    @owner = @company.users.create!(role: @company.roles.find_by!(name: "OWNER"), email: "supply-owner@example.test", first_name: "Supply", last_name: "Owner", password: password)
    UserProperty.create!(user: @owner, property: @property)
    @headers = login(@owner)
    @main = @property.stores.create!(name: "Main Store", code: "MAIN")
    @kitchen = @property.stores.create!(name: "Kitchen", code: "KITCHEN")
    @item = @company.inventory_items.create!(name: "Rice", item_code: "RICE", unit_of_measure: "kg", standard_cost: 10, min_reorder_level: 3)
    @stock = @item.stock_balances.create!(store: @main, quantity_on_hand: 10, inventory_value: 100)
    @supplier = @company.suppliers.create!(name: "Rice Supplier", phone: "9800012345")
  end

  test "inventory and purchase order lists are property scoped and filters use actual stores" do
    other = @company.properties.create!(name: "Other Hotel", code: "OTHER-SUPPLY")
    foreign_store = other.stores.create!(name: "Private Store", code: "PRIVATE")
    @item.stock_balances.create!(store: foreign_store, quantity_on_hand: 100, inventory_value: 1000)
    other.purchase_orders.create!(company: @company, supplier: @supplier, po_number: "PRIVATE-ORDER", order_date: Date.current)
    get "/api/v1/inventory/items", headers: @headers
    assert_response :success
    item = response.parsed_body["items"].sole
    assert_equal 10, item["currentStock"]
    assert_equal 100, item["totalValuation"]
    assert_equal ["Main Store"], item["storesBreakdown"].map { |b| b["storeName"] }
    get "/api/v1/inventory/items", params: { storeId: @kitchen.id }, headers: @headers
    assert_response :success
    assert_equal 0, response.parsed_body["items"].sole["currentStock"]
    get "/api/v1/inventory/items", params: { storeId: foreign_store.id }, headers: @headers
    assert_response :not_found
    get "/api/v1/procurement/orders", headers: @headers
    assert_response :success
    assert_empty response.parsed_body["purchaseOrders"]
  end

  test "issues record fractional quantities chosen store department cost and staff once" do
    payload = movement(quantity: "2.50")
    assert_difference "StockMovement.count", 1 do
      2.times { issue(payload); assert_response :success }
    end
    assert_equal 7.5, @stock.reload.quantity_on_hand.to_f
    assert_equal 75, @stock.inventory_value
    m = StockMovement.find(response.parsed_body.dig("data", "id"))
    assert_equal @main.id, m.source_store_id
    assert_equal "Kitchen use", m.department
    assert_equal @owner.id, m.user_id
    assert_equal 25, m.total_cost
    assert_equal @property.operating_date, m.business_date
    assert_raises(ActiveRecord::ReadOnlyRecord) { m.update!(quantity: 1) }
    issue(payload.merge(quantity: 1)); assert_response :conflict
  end

  test "invalid issues never add stock or overspend a store balance" do
    [-1, 0, "NaN", "1.001", 11].each do |qty|
      assert_no_difference "StockMovement.count" do
        issue(movement(quantity: qty)); assert_includes [409, 422], response.status
      end
    end
    issue(movement(storeId: @kitchen.id)); assert_response :conflict
    issue(movement(department: " ")); assert_response :unprocessable_content
    assert_equal 10, @stock.reload.quantity_on_hand
    assert_equal 100, @stock.inventory_value
  end

  test "store transfer preserves property quantity and value while recording both stores" do
    issue(movement(operation: "TRANSFER", quantity: "2.50", destinationStoreId: @kitchen.id))
    assert_response :success
    assert_equal 7.5, @stock.reload.quantity_on_hand.to_f
    target = @item.stock_balances.find_by!(store: @kitchen)
    assert_equal 2.5, target.quantity_on_hand.to_f
    assert_equal 25, target.inventory_value
    assert_equal 10, @item.stock_balances.sum(:quantity_on_hand)
    assert_equal 100, @item.stock_balances.sum(:inventory_value)
    issue(movement(operation: "TRANSFER", destinationStoreId: @main.id)); assert_response :unprocessable_content
  end

  test "purchase totals are derived from actual lines and creation retries do not duplicate" do
    payload = order_payload
    assert_difference ["PurchaseOrder.count", "PurchaseOrderItem.count"], 1 do
      2.times { post_order(payload.merge(totalAmount: 1)); assert_response :success }
    end
    order = PurchaseOrder.find(response.parsed_body.dig("data", "id"))
    assert_equal 100, order.grand_total
    assert_equal "DRAFT", order.status
    assert_equal @property.operating_date, order.order_date
    assert_equal order.po_number, response.parsed_body.dig("data", "poNumber")
    post_order(payload.merge(notes: "Another request")); assert_response :conflict
    post_order(order_payload.merge(items: [])); assert_includes [400,422], response.status
    post_order(order_payload.merge(items: [payload[:items][0],payload[:items][0]])); assert_response :unprocessable_content
    post_order(order_payload.merge(items: [{ itemId: @item.id, quantity: "1.25", unitPrice: "10.20" }])); assert_response :success
    assert_equal 12.75, response.parsed_body.dig("data", "grandTotal")
  end

  test "orders reject foreign suppliers and items and invalid monetary values atomically" do
    other = Company.create!(name: "Foreign", slug: "foreign-supply")
    foreign_supplier = other.suppliers.create!(name: "Foreign Vendor")
    foreign_item = other.inventory_items.create!(name: "Private Item", item_code: "PRIVATE")
    invalid = [{supplierId: foreign_supplier.id}, {items: [{itemId: foreign_item.id, quantity: 1, unitPrice: 10}]},
      {items: [{itemId: @item.id, quantity: -1, unitPrice: 10}]}, {items: [{itemId: @item.id, quantity: 1, unitPrice: "NaN"}]}]
    invalid.each do |changes|
      assert_no_difference ["PurchaseOrder.count", "PurchaseOrderItem.count"] do
        post_order(order_payload.merge(changes)); assert_includes [404,422], response.status
      end
    end
  end

  test "draft editing and approval use versions and preserve an approved order" do
    order = book
    version = order.lock_version
    patch_order(order, quantity: 20); assert_response :success
    assert_equal 200, order.reload.grand_total
    patch_order(order, quantity: 1, version: version); assert_response :conflict
    approve(order); assert_response :success
    assert_equal "APPROVED", order.reload.status
    patch_order(order, quantity: 2); assert_response :conflict
    assert_equal 200, order.reload.grand_total
    assert_equal 0, @stock.reload.quantity_on_hand - 10
  end

  test "receiving requires approval and records only delivered quantities with receipt evidence" do
    order = book
    receive(order, 4); assert_response :conflict
    approve(order); assert_response :success
    assert_difference ["PurchaseReceipt.count", "StockMovement.count"], 1 do
      receive(order, 4); assert_response :success
    end
    assert_equal "PARTIALLY_RECEIVED", order.reload.status
    assert_equal 4, order.purchase_order_items.sole.received_quantity
    assert_equal 14, @stock.reload.quantity_on_hand
    assert_equal 140, @stock.inventory_value
    receipt = order.purchase_receipts.sole
    assert_match(/^GRN-SUPPLY-TEST-/, receipt.receipt_number)
    assert_equal @owner.id, receipt.user_id
    assert_equal @main.id, receipt.store_id
    assert_equal @property.operating_date, receipt.business_date
    assert_equal order.purchase_order_items.sole.id, receipt.stock_movements.sole.purchase_order_item_id
    assert_raises(ActiveRecord::ReadOnlyRecord) { receipt.update!(notes: "Replaced") }
  end

  test "receipt retries and duplicate delivery references cannot increase stock twice" do
    order = book; approve(order); assert_response :success
    params = receipt_payload(order, 4)
    2.times { post_receipt(order, params); assert_response :success }
    assert_equal 1, order.purchase_receipts.count
    assert_equal 14, @stock.reload.quantity_on_hand
    post_receipt(order, params.merge(idempotencyKey: SecureRandom.uuid)); assert_response :conflict
    post_receipt(order, params.merge(items: [{lineId: order.purchase_order_items.sole.id, quantity: 1}])); assert_response :conflict
    receive(order, 7); assert_response :conflict
    assert_equal 14, @stock.reload.quantity_on_hand
    receive(order, 6); assert_response :success
    assert_equal "RECEIVED", order.reload.status
    assert_equal 20, @stock.reload.quantity_on_hand
    receive(order, 1); assert_response :conflict
  end

  test "partial order remainder can be closed without reversing received goods" do
    order = book; approve(order); receive(order, 4); assert_response :success
    post "/api/v1/procurement/orders/#{order.id}/cancel", params: {version: order.reload.lock_version, reason: "Supplier cannot deliver remainder"}, headers: @headers, as: :json
    assert_response :success
    assert_equal "CLOSED", order.reload.status
    assert_equal 4, order.purchase_order_items.sole.received_quantity
    assert_equal 14, @stock.reload.quantity_on_hand
    receive(order, 6); assert_response :conflict
    assert_equal 1, order.purchase_receipts.count
  end

  test "receiving a multi line order rolls back completely if a balance would overflow" do
    second = @company.inventory_items.create!(item_code: "TEA", name: "Tea")
    second.stock_balances.create!(store: @main, quantity_on_hand: 1, inventory_value: Supply::Support::MAX)
    order = book(items: [{itemId: @item.id, quantity: 1, unitPrice: 10},{itemId: second.id, quantity: 1, unitPrice: 10}])
    approve(order); assert_response :success
    assert_no_difference ["PurchaseReceipt.count", "StockMovement.count"] do
      params = receipt_payload(order, 1).merge(items: order.purchase_order_items.map { |i| {lineId: i.id, quantity: 1} })
      post_receipt(order, params); assert_response :unprocessable_content
    end
    assert_equal 10, @stock.reload.quantity_on_hand
    assert_equal 0, order.purchase_order_items.sum(:received_quantity)
  end

  test "receipt values create a weighted average and full depletion retains no rounding residual" do
    order = book(items: [{itemId: @item.id, quantity: 10, unitPrice: 20}]); approve(order); receive(order, 10); assert_response :success
    assert_equal 300, @stock.reload.inventory_value
    issue(movement(quantity: "0.33")); assert_response :success
    assert_equal BigDecimal("295.05"), @stock.reload.inventory_value
    issue(movement(operation: "TRANSFER", quantity: "19.67", destinationStoreId: @kitchen.id)); assert_response :success
    assert_equal 0, @stock.reload.inventory_value
    assert_equal 0, @stock.quantity_on_hand
    issue(movement(storeId: @kitchen.id, quantity: "19.67")); assert_response :success
    assert_equal 0, @item.stock_balances.sum(:quantity_on_hand)
    assert_equal 0, @item.stock_balances.sum(:inventory_value)
  end

  test "store and order boundaries reject foreign stores lines and order ids" do
    other = @company.properties.create!(name: "Private", code: "PRIVATE-SUPPLY")
    foreign = other.stores.create!(name: "Private", code: "PRIVATE")
    issue(movement(storeId: foreign.id)); assert_response :not_found
    issue(movement(operation: "TRANSFER", destinationStoreId: foreign.id)); assert_response :not_found
    order = book; approve(order)
    post_receipt(order, receipt_payload(order, 1).merge(storeId: foreign.id)); assert_response :not_found
    post_receipt(order, receipt_payload(order, 1).merge(items: [{lineId: SecureRandom.uuid, quantity: 1}])); assert_response :unprocessable_content
    get "/api/v1/procurement/orders", headers: @headers.merge("X-Property-Code" => other.code); assert_response :forbidden
    UserProperty.create!(user: @owner, property: other)
    get "/api/v1/procurement/orders/#{order.id}", headers: @headers.merge("X-Property-Code" => other.code); assert_response :not_found
  end

  test "read only and departmental staff cannot change stock orders receiving or master records" do
    role = @company.roles.create!(name: "SUPPLY_READER", permissions: {"ITEMS"=>["read"],"ORDERS"=>["read"]})
    user = @company.users.create!(role:, email: "supply-reader@example.test", first_name: "Supply", last_name: "Reader", password: password)
    UserProperty.create!(user:, property: @property)
    headers = login(user)
    ["/api/v1/inventory/items", "/api/v1/procurement/orders"].each { |path| get path, headers:; assert_response :success }
    order = book
    ["/api/v1/inventory/items", "/api/v1/inventory/items/catalog", "/api/v1/inventory/items/store", "/api/v1/procurement/orders", "/api/v1/procurement/orders/supplier", "/api/v1/procurement/orders/#{order.id}/approve", "/api/v1/procurement/orders/#{order.id}/receive", "/api/v1/procurement/orders/#{order.id}/cancel"].each do |path|
      post path, params: {}, headers:, as: :json; assert_response :forbidden
    end
  end

  test "master records validate persist and reject duplicate or invalid entries" do
    post "/api/v1/inventory/items/catalog", params: {sku: "OIL", name: "Cooking Oil", unit: "l", standardCost: "100.50", minStock: 5}, headers: @headers, as: :json
    assert_response :success
    assert_equal BigDecimal("100.50"), @company.inventory_items.find_by!(item_code: "OIL").standard_cost
    post "/api/v1/inventory/items/catalog", params: {sku: "BAD", name: "Bad", unit: " ", standardCost: -1}, headers: @headers, as: :json
    assert_includes [400, 422], response.status
    post "/api/v1/inventory/items/store", params: {code: "BAR", name: "Bar Store"}, headers: @headers, as: :json; assert_response :success
    post "/api/v1/procurement/orders/supplier", params: {name: "New Supplier", email: "bad"}, headers: @headers, as: :json; assert_response :unprocessable_content
    2.times do |index|
      post "/api/v1/procurement/orders/supplier", params: {name: "New Supplier", email: "supply@example.test"}, headers: @headers, as: :json
      index.zero? ? assert_response(:success) : assert_response(:conflict)
    end
  end

  test "historical amount only order must be reviewed before receiving and is not claimed matched" do
    order = @property.purchase_orders.create!(company: @company, supplier: @supplier, po_number: "LEGACY-SUPPLY", order_date: Date.current, grand_total: 1000, status: "SUBMITTED")
    approve(order); assert_response :unprocessable_content
    assert_equal 1000, order.reload.grand_total
    patch_order(order, quantity: 10); assert_response :success
    approve(order); assert_response :success
    get "/api/v1/procurement/orders/#{order.id}", headers: @headers; assert_response :success
    assert_empty response.parsed_body.dig("data", "receipts")
    assert_equal 0, response.parsed_body.dig("data", "items").sole["receivedQuantity"]
  end

  test "fractional partial receipts allocate rounding without exceeding the order line value" do
    order = book(items: [{itemId: @item.id, quantity: "1.50", unitPrice: "0.01"}])
    approve(order); assert_response :success
    3.times { receive(order, "0.50"); assert_response :success }
    assert_equal BigDecimal("0.02"), StockMovement.where(purchase_order_item: order.purchase_order_items.sole).sum(:total_cost)
    assert_equal BigDecimal("100.02"), @stock.reload.inventory_value
    assert_equal "RECEIVED", order.reload.status
  end

  private
  def password = "Supply-Test-2026!"
  def login(user)
    post "/api/v1/auth/login", params: {email:user.email,password:}, as: :json
    {"Authorization"=>"Bearer #{response.parsed_body.dig('data','token')}","X-Property-Code"=>@property.code}
  end
  def movement(**changes)
    {itemId:@item.id,storeId:@main.id,quantity:1,department:"Kitchen use",operation:"ISSUE",idempotencyKey:SecureRandom.uuid}.merge(changes)
  end
  def issue(params)
    post "/api/v1/inventory/items", params:, headers:@headers, as: :json
  end
  def order_payload
    {supplierId:@supplier.id,items:[{itemId:@item.id,quantity:10,unitPrice:10}],idempotencyKey:SecureRandom.uuid}
  end
  def post_order(params)
    post "/api/v1/procurement/orders", params:,headers:@headers,as: :json
  end
  def book(**changes)
    post_order(order_payload.merge(changes));assert_response :success
    PurchaseOrder.find(response.parsed_body.dig("data","id"))
  end
  def approve(order)
    post "/api/v1/procurement/orders/#{order.id}/approve",params:{version:order.reload.lock_version},headers:@headers,as: :json
  end
  def patch_order(order, quantity:, **changes)
    patch "/api/v1/procurement/orders/#{order.id}",params:order_payload.merge(version:order.reload.lock_version,items:[{itemId:@item.id,quantity:,unitPrice:10}]).merge(changes),headers:@headers,as: :json
  end
  def receipt_payload(order, qty)
    {storeId:@main.id,deliveryReference:"DELIVERY-#{SecureRandom.hex(4)}",items:[{lineId:order.purchase_order_items.first.id,quantity:qty}],idempotencyKey:SecureRandom.uuid}
  end
  def post_receipt(order, params)
    post "/api/v1/procurement/orders/#{order.id}/receive",params:,headers:@headers,as: :json
  end
  def receive(order, qty)
    post_receipt(order,receipt_payload(order,qty))
  end
end
