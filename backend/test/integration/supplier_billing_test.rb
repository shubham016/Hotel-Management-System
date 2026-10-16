require "test_helper"

class SupplierBillingTest < ActionDispatch::IntegrationTest
  setup do
    @company=Company.create!(name:"Billing Test",slug:"supplier-billing-test")
    @property=@company.properties.create!(name:"Billing Hotel",code:"BILL-TEST",business_date:Date.current)
    Access::StaffRoles.install!(@company)
    @owner=@company.users.create!(role:@company.roles.find_by!(name:"OWNER"),email:"billing@example.test",first_name:"Billing",last_name:"Owner",password:"Supplier-Test-2026!")
    UserProperty.create!(user:@owner,property:@property)
    @headers=login(@owner)
    @store=@property.stores.create!(name:"Main",code:"MAIN")
    @item=@company.inventory_items.create!(name:"Rice",item_code:"RICE",unit_of_measure:"kg",category:"FOOD",standard_cost:10)
    @supplier=@company.suppliers.create!(name:"Rice Supplier")
    @cash=@company.accounts.create!(account_code:"1001",name:"Cash in Hand",category:"ASSET")
    @bank=@company.accounts.create!(account_code:"1002",name:"Bank Account",category:"ASSET")
    @company.tax_configurations.create!(name:"VAT",code:"VAT",rate:13,effective_from:Date.new(2020,1,1))
    @order=create_order
  end

  test "receipts invoice VAT and partial payments post once without doubling stock" do
    assert_equal 100, gl("1300")
    assert_equal(-100,gl("2204"))
    payload=bill_payload(taxMode:"VAT",confirmedTaxInvoice:true,declaredTotal:113)
    assert_no_difference "JournalEntry.count" do
      2.times {create_bill(payload);assert_response :success}
    end
    bill=current_bill
    assert_equal 1, @order.supplier_invoices.count
    assert_equal 13,bill.tax_amount
    assert_difference "JournalEntry.count",1 do
      2.times {post_bill(bill);assert_response :success}
    end
    assert_equal 100,gl("1300")
    assert_equal 0,gl("2204")
    assert_equal 13,gl("1301")
    assert_equal(-113,gl("2001"))
    payload=payment(amount:50)
    assert_difference ["SupplierPayment.count","JournalEntry.count"],1 do
      2.times {pay(bill,payload);assert_response :success}
    end
    assert_equal 50,bill.reload.total_paid
    assert_equal(-63,gl("2001"))
    pay(bill,payment(amount:63,paymentMethod:"BANK_TRANSFER",accountId:@bank.id,transactionRef:"BANK-001"));assert_response :success
    assert_equal "PAID",bill.reload.status
    assert_equal 0,gl("2001")
    assert_equal(-50,gl("1001"))
    assert_equal(-63,gl("1002"))
    assert_raises(ActiveRecord::ReadOnlyRecord){bill.update!(grand_total:1)}
    assert_raises(ActiveRecord::ReadOnlyRecord){bill.supplier_payments.first.update!(amount:1)}
    review=BusinessDays::Review.call(@property)
    assert_equal "-50.0",review[:cashNet]
    assert_equal 2,review[:paymentCount]
    assert_equal bill.supplier_payments.order(:id).pluck(:id),review[:supplierPaymentIds]
    assert_equal "50.0",review[:tenders].find{|t|t[:method]=="CASH"}[:payments]
  end

  test "matching blocks changed prices declared totals and overbilling until corrected" do
    [bill_payload(items:[{movementId:movement.id,quantity:11,unitPrice:10}],declaredTotal:110),
     bill_payload(items:[{movementId:movement.id,quantity:10,unitPrice:11}],declaredTotal:110),
     bill_payload(declaredTotal:99)].each_with_index do |payload,index|
      create_bill(payload.merge(invoiceReference:"MISMATCH-#{index}"));assert_response :success
      bill=current_bill
      assert_not_empty response.parsed_body.dig("data","matchErrors")
      assert_no_difference "JournalEntry.count" do
        post_bill(bill);assert_response :conflict
      end
    end
    bill=@order.supplier_invoices.order(:created_at).last
    patch "/api/v1/procurement/invoices/#{bill.id}",params:bill_payload.merge(version:bill.lock_version),headers:@headers,as: :json
    assert_response :success
    post_bill(bill);assert_response :success
    assert_equal "POSTED",bill.reload.status
  end

  test "posted partial invoices allocate received goods and prevent another draft from consuming them" do
    create_bill(bill_payload(items:[{movementId:movement.id,quantity:6,unitPrice:10}],declaredTotal:60));assert_response :success
    first=current_bill
    create_bill(bill_payload(invoiceReference:"SECOND",items:[{movementId:movement.id,quantity:5,unitPrice:10}],declaredTotal:50));assert_response :success
    second=current_bill
    post_bill(first);assert_response :success
    post_bill(second);assert_response :conflict
    assert_equal(-40,gl("2204"))
    patch "/api/v1/procurement/invoices/#{second.id}",params:bill_payload(invoiceReference:"SECOND",version:second.reload.lock_version,items:[{movementId:movement.id,quantity:4,unitPrice:10}],declaredTotal:40),headers:@headers,as: :json
    assert_response :success
    post_bill(second);assert_response :success
    assert_equal 0,gl("2204")
    assert_equal 100,Supply::Invoices.new(@order).allocated(movement).sum(:received_cost)
  end

  test "invalid invoices reject duplicate supplier references wrong receipts dates and unconfirmed VAT" do
    create_bill(bill_payload);assert_response :success
    create_bill(bill_payload);assert_response :conflict
    [bill_payload(invoiceDate:(Date.current+1).iso8601),bill_payload(dueDate:(Date.current-1).iso8601),
     bill_payload(items:[{movementId:SecureRandom.uuid,quantity:1,unitPrice:10}]),
     bill_payload(taxMode:"VAT",confirmedTaxInvoice:false)].each do |payload|
      assert_no_difference "SupplierInvoice.count" do
        create_bill(payload.merge(invoiceReference:SecureRandom.hex(4)));assert_includes [400,422],response.status
      end
    end
    bill=@order.supplier_invoices.sole
    patch "/api/v1/procurement/invoices/#{bill.id}",params:bill_payload(version:99),headers:@headers,as: :json;assert_response :conflict
    other=create_order
    create_bill(bill_payload(orderId:other.id,items:[{movementId:other.purchase_receipts.sole.stock_movements.sole.id,quantity:10,unitPrice:10}]));assert_response :conflict
  end

  test "payments reject overpayment reused references wrong accounts methods and closed cashiers" do
    bill=posted_bill
    wrong=@company.accounts.create!(account_code:"1100",name:"Accounts Receivable",category:"ASSET")
    [payment(amount:101),payment(amount:0),payment(amount:-1),payment(accountId:wrong.id),payment(paymentMethod:"CARD"),payment(paymentMethod:"BANK_TRANSFER",transactionRef:"")].each do |payload|
      assert_no_difference ["SupplierPayment.count","JournalEntry.count"] do
        pay(bill,payload);assert_includes [400,422],response.status
      end
    end
    payload=payment(amount:20,paymentMethod:"BANK_TRANSFER",transactionRef:"TRANSFER1")
    pay(bill,payload);assert_response :success
    pay(bill,payload.merge(idempotencyKey:SecureRandom.uuid));assert_response :conflict
    pay(bill,payload.merge(amount:21));assert_response :conflict
    @property.cashier_closings.create!(closed_by:@owner,business_date:@property.operating_date,status:"CLOSED",opening_cash:100,expected_cash:100,counted_cash:100,variance:0)
    pay(bill,payload);assert_response :success
    pay(bill,payment(amount:1));assert_response :conflict
    assert_equal 20,bill.reload.total_paid
  end

  test "unpaid invoice void reverses its journal and frees quantity and reference while paid void fails" do
    bill=posted_bill
    original=bill.journal_entry
    post "/api/v1/procurement/invoices/#{bill.id}/void",params:{version:bill.reload.lock_version,reason:"Supplier issued corrected invoice"},headers:@headers,as: :json
    assert_response :success
    assert_equal "VOID",bill.reload.status
    assert_equal 0,gl("2001")
    assert_equal(-100,gl("2204"))
    assert_equal "POSTED",original.reload.status
    assert bill.reversal_journal
    replacement=posted_bill
    pay(replacement,payment(amount:1));assert_response :success
    post "/api/v1/procurement/invoices/#{replacement.id}/void",params:{version:replacement.reload.lock_version,reason:"Incorrect payment"},headers:@headers,as: :json
    assert_response :conflict
    assert_equal 1,replacement.reload.total_paid
  end

  test "opening stock review is explicit and posts only the difference with retry protection" do
    @property.update!(supply_opening_review_required:true)
    @item.stock_balances.find_by!(store:@store).update!(inventory_value:150)
    create_bill(bill_payload);assert_response :success
    post_bill(current_bill);assert_response :conflict
    payload={mode:"LINK",reason:"Review earlier balances",confirmedReview:true,idempotencyKey:SecureRandom.uuid}
    post "/api/v1/inventory/items/reconcile",params:payload,headers:@headers,as: :json;assert_response :unprocessable_content
    payload=payload.merge(mode:"ADJUST",idempotencyKey:SecureRandom.uuid)
    assert_difference "JournalEntry.count",1 do
      2.times {post "/api/v1/inventory/items/reconcile",params:payload,headers:@headers,as: :json;assert_response :success}
    end
    assert_equal 150,gl("1300")
    assert_equal(-50,gl("3000"))
    assert_not @property.reload.supply_opening_review_required
  end

  test "stock issue posts cost of sales while transfers preserve stock and journal totals" do
    post "/api/v1/inventory/items",params:{itemId:@item.id,storeId:@store.id,operation:"ISSUE",quantity:2,department:"Kitchen",idempotencyKey:SecureRandom.uuid},headers:@headers,as: :json
    assert_response :success
    assert_equal 80,gl("1300")
    assert_equal 20,gl("5001")
    assert_equal 80,@item.stock_balances.sum(:inventory_value)
    second=@property.stores.create!(name:"Kitchen",code:"KITCHEN")
    assert_no_difference "JournalEntry.count" do
      post "/api/v1/inventory/items",params:{itemId:@item.id,storeId:@store.id,destinationStoreId:second.id,operation:"TRANSFER",quantity:2,idempotencyKey:SecureRandom.uuid},headers:@headers,as: :json;assert_response :success
    end
    assert_equal 80,gl("1300")
  end

  test "account configuration failures roll back receiving invoices and payments atomically" do
    @company.accounts.find_by!(account_code:"2204").update!(active:false)
    count=PurchaseReceipt.count
    assert_no_difference ["JournalEntry.count","StockMovement.count"] do
      create_order(expect_receipt:false);assert_response :conflict
    end
    assert_equal count,PurchaseReceipt.count
    @company.accounts.find_by!(account_code:"2204").update!(active:true)
    create_bill(bill_payload);assert_response :success
    bill=current_bill
    @company.accounts.create!(account_code:"2001",name:"Wrong account",category:"ASSET")
    assert_no_difference "JournalEntry.count" do
      post_bill(bill);assert_response :conflict
    end
    assert_equal "DRAFT",bill.reload.status
    assert_equal 0,bill.supplier_invoice_lines.sum(:received_cost)
  end

  test "invoice and payment permissions are independent and invoices remain property scoped" do
    bill=posted_bill
    role=@company.roles.create!(name:"BILLING_READER",permissions:{"ORDERS"=>["read","invoice"]})
    user=@company.users.create!(role:,email:"bill-reader@example.test",first_name:"Invoice",last_name:"Staff",password:"Supplier-Test-2026!")
    UserProperty.create!(user:,property:@property)
    @headers=login(user)
    pay(bill,payment);assert_response :forbidden
    create_bill(bill_payload(invoiceReference:"DRAFT2"));assert_response :success
    role.update!(permissions:{"ORDERS"=>["read"]})
    @headers=login(user)
    create_bill(bill_payload(invoiceReference:"DRAFT3"));assert_response :forbidden
    other=@company.properties.create!(name:"Other Property",code:"BILL-OTHER")
    UserProperty.create!(user:@owner,property:other)
    @headers=login(@owner).merge("X-Property-Code"=>other.code)
    post_bill(bill);assert_response :not_found
  end

  test "cashier closes with supplier disbursement evidence and rejects later payments" do
    bill=posted_bill
    pay(bill,payment(amount:25));assert_response :success
    close={operation:"CLOSE_CASHIER",businessDate:@property.operating_date.iso8601,openingCash:100,countedCash:75}
    post "/api/v1/night-audit",params:close,headers:@headers,as: :json;assert_response :success
    cashier=@property.cashier_closings.sole
    assert_equal 75,cashier.expected_cash
    assert_equal bill.supplier_payments.pluck(:id),cashier.snapshot["supplierPaymentIds"]
    pay(bill,payment(amount:1));assert_response :conflict
    post "/api/v1/night-audit",params:{operation:"CLOSE_DAY",businessDate:@property.operating_date.iso8601},headers:@headers,as: :json
    assert_response :success
    assert_equal 1,@property.business_day_closings.sole.snapshot["paymentCount"]
  end

  test "legacy receipts require reviewed accounting and opening stock is rechecked after new posting" do
    receipt=@order.purchase_receipts.create!(store:@store,user:@owner,receipt_number:"LEGACY-RECEIPT",delivery_reference:"LEGACY",idempotency_key:SecureRandom.uuid,request_digest:"legacy",business_date:Date.current)
    line=@order.purchase_order_items.sole
    old=receipt.stock_movements.create!(property:@property,user:@owner,inventory_item:@item,purchase_order_item:line,destination_store:@store,kind:"RECEIPT",quantity:2,unit_cost:10,total_cost:20,document_number:"LEGACY-STOCK",idempotency_key:SecureRandom.uuid,request_digest:"legacy",business_date:Date.current)
    stock=@item.stock_balances.find_by!(store:@store)
    stock.update!(quantity_on_hand:12,inventory_value:120)
    create_bill(bill_payload(items:[{movementId:old.id,quantity:2,unitPrice:10}],declaredTotal:20));assert_response :success
    bill=current_bill
    post_bill(bill);assert_response :conflict
    payload={receiptId:receipt.id,mode:"POST_NEW",confirmedUnposted:false,reason:"Reviewed prior stock records",idempotencyKey:SecureRandom.uuid}
    post "/api/v1/procurement/orders/#{@order.id}/reconcile_receipt",params:payload,headers:@headers,as: :json;assert_response :unprocessable_content
    payload[:confirmedUnposted]=true
    assert_difference "JournalEntry.count",1 do
      2.times{post "/api/v1/procurement/orders/#{@order.id}/reconcile_receipt",params:payload,headers:@headers,as: :json;assert_response :success}
    end
    assert @property.reload.supply_opening_review_required
    assert_equal 120,gl("1300")
    post_bill(bill);assert_response :conflict
    post "/api/v1/inventory/items/reconcile",params:{mode:"LINK",reason:"Stock ledger matches receipts",confirmedReview:true,idempotencyKey:SecureRandom.uuid},headers:@headers,as: :json;assert_response :success
    post_bill(bill);assert_response :success
    assert_equal(-100,gl("2204"))
  end

  test "fractional invoices remain postable after voiding an allocation with rounding" do
    post "/api/v1/procurement/orders",params:{supplierId:@supplier.id,items:[{itemId:@item.id,quantity:1.5,unitPrice:0.01}],idempotencyKey:SecureRandom.uuid},headers:@headers,as: :json;assert_response :success
    @order=PurchaseOrder.find(response.parsed_body.dig("data","id"))
    post "/api/v1/procurement/orders/#{@order.id}/approve",params:{version:@order.lock_version},headers:@headers,as: :json;assert_response :success
    post "/api/v1/procurement/orders/#{@order.id}/receive",params:{storeId:@store.id,deliveryReference:"ROUNDING",items:[{lineId:@order.purchase_order_items.sole.id,quantity:1.5}],idempotencyKey:SecureRandom.uuid},headers:@headers,as: :json;assert_response :success
    bills=3.times.map do |index|
      create_bill(bill_payload(invoiceReference:"ROUND#{index}",items:[{movementId:movement.id,quantity:0.5,unitPrice:0.01}],declaredTotal:0.01));assert_response :success
      bill=current_bill;post_bill(bill);assert_response :success;bill
    end
    target=bills.find{|b|b.supplier_invoice_lines.sum(:received_cost).zero?}
    post "/api/v1/procurement/invoices/#{target.id}/void",params:{version:target.reload.lock_version,reason:"Correct supplier split"},headers:@headers,as: :json;assert_response :success
    [0.01,0.49].each_with_index do |quantity,index|
      create_bill(bill_payload(invoiceReference:"REPLACE#{index}",items:[{movementId:movement.id,quantity:,unitPrice:0.01}],declaredTotal:0));assert_response :success
      post_bill(current_bill);assert_response :success
    end
    assert_equal BigDecimal("0.02"),SupplierInvoiceLine.joins(:supplier_invoice).where(stock_movement:movement,supplier_invoices:{status:%w[POSTED PAID]}).sum(:received_cost)
  end

  private
  def login(user)
    post "/api/v1/auth/login",params:{email:user.email,password:"Supplier-Test-2026!"},as: :json
    {"Authorization"=>"Bearer #{response.parsed_body.dig('data','token')}","X-Property-Code"=>@property.code}
  end
  def create_order(expect_receipt:true)
    post "/api/v1/procurement/orders",params:{supplierId:@supplier.id,items:[{itemId:@item.id,quantity:10,unitPrice:10}],idempotencyKey:SecureRandom.uuid},headers:@headers,as: :json
    assert_response :success
    order=PurchaseOrder.find(response.parsed_body.dig("data","id"))
    post "/api/v1/procurement/orders/#{order.id}/approve",params:{version:order.lock_version},headers:@headers,as: :json;assert_response :success
    post "/api/v1/procurement/orders/#{order.id}/receive",params:{storeId:@store.id,deliveryReference:SecureRandom.hex(5),items:[{lineId:order.purchase_order_items.sole.id,quantity:10}],idempotencyKey:SecureRandom.uuid},headers:@headers,as: :json
    assert_response :success if expect_receipt
    order.reload
  end
  def movement = @order.purchase_receipts.order(:created_at).first.stock_movements.sole
  def bill_payload(**changes)
    {orderId:@order.id,invoiceReference:"SUPPLIER-001",invoiceDate:Date.current.iso8601,dueDate:Date.current.iso8601,items:[{movementId:movement.id,quantity:10,unitPrice:10}],taxMode:"NONE",declaredTotal:100,idempotencyKey:SecureRandom.uuid}.merge(changes)
  end
  def create_bill(params)
    post "/api/v1/procurement/invoices",params:,headers:@headers,as: :json
  end
  def current_bill = SupplierInvoice.find(response.parsed_body.dig("data","id"))
  def post_bill(bill)
    post "/api/v1/procurement/invoices/#{bill.id}/post",params:{version:bill.reload.lock_version},headers:@headers,as: :json
  end
  def posted_bill
    create_bill(bill_payload);assert_response :success
    bill=current_bill
    post_bill(bill);assert_response :success
    bill.reload
  end
  def payment(**changes) = {amount:10,paymentMethod:"CASH",accountId:@cash.id,idempotencyKey:SecureRandom.uuid}.merge(changes)
  def pay(bill,params)
    post "/api/v1/procurement/invoices/#{bill.id}/pay",params:,headers:@headers,as: :json
  end
  def gl(code)
    account=@company.accounts.find_by!(account_code:code)
    lines=account.journal_lines.joins(:journal_entry).where(journal_entries:{property_id:@property.id,status:"POSTED"})
    lines.sum(:debit)-lines.sum(:credit)
  end
end
