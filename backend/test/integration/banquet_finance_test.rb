require "test_helper"

class BanquetFinanceTest < ActionDispatch::IntegrationTest
  setup do
    @company = Company.create!(name: "Banquet Finance", slug: "banquet-finance")
    @property = @company.properties.create!(name: "Banquet Hotel", code: "BNQ-TEST", business_date: Date.current)
    Access::StaffRoles.install!(@company)
    @user = @company.users.create!(role: @company.roles.find_by!(name: "OWNER"), email: "banquet-finance@example.test", first_name: "Banquet", last_name: "Owner", password: password)
    UserProperty.create!(user: @user, property: @property)
    @cash = @company.accounts.create!(account_code: "1001", name: "Cash / Bank", category: "ASSET")
    @hall = @property.banquet_halls.create!(name: "Finance Hall", code: "FINANCE", theater_capacity: 100, base_rent: 5000)
    @tax = @company.tax_configurations.create!(code: "VAT", name: "VAT", rate: 13, effective_from: Date.new(2020, 1, 1))
    post "/api/v1/auth/login", params: { email: @user.email, password: }, as: :json
    @headers = { "Authorization" => "Bearer #{response.parsed_body.dig('data', 'token')}", "X-Property-Code" => @property.code }
  end

  test "booking quotes VAT and retries creation without duplicating booking or guest" do
    payload = event_payload
    assert_difference "BanquetBooking.count", 1 do
      2.times { post_event(payload); assert_response :success }
    end
    booking = @property.banquet_bookings.sole
    assert_equal 6780, booking.grand_total
    assert_equal 780, booking.tax_amount
    assert_equal 5000, booking.hall_net
    assert_no_difference "BanquetBooking.count" do
      post_event(payload.merge(eventName: "Different")); assert_response :conflict
    end
    post_event(event_payload.merge(advancePaid: 100))
    assert_response :unprocessable_content
    assert_equal 0, booking.banquet_transactions.count
  end

  test "advance posts a deposit not revenue and appears once in cashier receipts" do
    booking = book
    payload = payment(1000)
    assert_difference ["BanquetTransaction.count", "JournalEntry.count"], 1 do
      2.times { operation(booking, "receipt", payload); assert_response :success }
    end
    assert_equal 1000, booking.reload.advance_paid
    assert_equal 5780, booking.balance_due
    entry = booking.banquet_transactions.sole.journal_entry
    assert_equal 1000, entry.journal_lines.find_by!(account: @cash).debit
    assert_equal 1000, line(entry, "2203").credit
    assert entry.journal_lines.none? { |l| l.account.category == "REVENUE" }
    assert_equal @property.operating_date, entry.posting_date
    review = BusinessDays::Review.call(@property)
    assert_equal "1000.0", review[:cashNet]
    assert_equal 1, review[:receiptCount]
    assert_equal 1, review[:banquetReceiptIds].size
    operation(booking, "receipt", payload.merge(amount: 999))
    assert_response :conflict
    assert_balanced
  end

  test "settlement applies the deposit collects only the balance and recognizes itemized revenue once" do
    booking = book
    operation(booking, "receipt", payment(1000)); assert_response :success
    payload = payment(5780).merge(version: booking.reload.lock_version)
    assert_difference "JournalEntry.count", 2 do
      operation(booking, "settle", payload); assert_response :success
    end
    assert_equal "COMPLETED", booking.reload.status
    assert_equal 6780, booking.advance_paid
    assert_equal 0, booking.balance_due
    settlement = booking.banquet_transactions.find_by!(kind: "SETTLEMENT").journal_entry
    assert_equal 6780, line(settlement, "2203").debit
    assert_equal 5000, line(settlement, "4004").credit
    assert_equal 1000, line(settlement, "4002").credit
    assert_equal 780, line(settlement, "2100").credit
    assert_no_difference ["JournalEntry.count", "BanquetTransaction.count"] do
      operation(booking, "settle", payload); assert_response :success
    end
    review = BusinessDays::Review.call(@property)
    assert_equal 6780, BigDecimal(review[:cashNet])
    assert_equal 6000, BigDecimal(review[:revenue])
    assert_equal 780, BigDecimal(review[:vat])
    assert_not review[:blockers].any? { |b| b.include?("banquet") }
    assert_balanced
  end

  test "cancellation frees the hall retains an explicit charge and refunds only the remainder" do
    booking = book
    operation(booking, "receipt", payment(1000)); assert_response :success
    payload = { cancellationFee: 113, reason: "Organizer cancelled", version: booking.reload.lock_version, idempotencyKey: SecureRandom.uuid }
    operation(booking, "cancel", payload); assert_response :success
    assert_equal "CANCELLED", booking.reload.status
    assert_equal 887, booking.refund_due
    fee = booking.banquet_transactions.find_by!(kind: "CANCELLATION").journal_entry
    assert_equal 100, line(fee, "4003").credit
    assert_equal 13, line(fee, "2100").credit
    operation(booking, "cancel", payload); assert_response :success
    post_event(event_payload); assert_response :success
    operation(booking, "refund", payment(888).merge(reason: "Refund payout")); assert_response :unprocessable_content
    refund = payment(500).merge(reason: "First refund payout")
    2.times { operation(booking, "refund", refund); assert_response :success }
    assert_equal 387, booking.reload.refund_due
    operation(booking, "refund", payment(387).merge(reason: "Remaining payout")); assert_response :success
    assert_equal 0, booking.reload.refund_due
    assert_equal 113, booking.advance_paid
    review = BusinessDays::Review.call(@property)
    assert_equal 113, BigDecimal(review[:cashNet])
    assert_equal 2, review[:refundCount]
    deposit = @company.accounts.find_by!(account_code: "2203")
    assert_equal 0, deposit.journal_lines.sum(:credit) - deposit.journal_lines.sum(:debit)
    assert_balanced
  end

  test "confirmed event advance can be partially refunded before editing its price" do
    booking = book
    operation(booking, "receipt", payment(2000)); assert_response :success
    patch_event(booking, hallRent: 100, cateringTotal: 0); assert_response :unprocessable_content
    operation(booking, "refund", payment(1900).merge(reason: "Reduced event size")); assert_response :success
    patch_event(booking, hallRent: 100, cateringTotal: 0); assert_response :success
    assert_equal 113, booking.reload.grand_total
    assert_equal 100, booking.advance_paid
    assert_equal 13, booking.balance_due
  end

  test "edits check hall conflicts and stale versions while preserving receipts and quoted taxes" do
    booking = book
    tomorrow = book(startDate: (Date.current + 1).iso8601)
    operation(booking, "receipt", payment(1000)); assert_response :success
    patch_event(booking, startDate: tomorrow.start_date_time.to_date.iso8601); assert_response :conflict
    old_version = booking.reload.lock_version
    @tax.update!(rate: 20)
    patch_event(booking, eventName: "Changed event", specialRequests: "New layout"); assert_response :success
    assert_equal 6780, booking.reload.grand_total
    assert_equal 780, booking.tax_amount
    assert_equal 1000, booking.advance_paid
    patch_event(booking, eventName: "Stale overwrite", version: old_version); assert_response :conflict
    assert_equal "Changed event", booking.reload.event_name
    patch_event(booking, hallRent: 6000); assert_response :success
    assert_equal 8400, booking.reload.grand_total
  end

  test "inclusive VAT is extracted and rounded with a balanced final journal" do
    @tax.update!(inclusive: true)
    booking = book(hallRent: "113.00", cateringTotal: "56.50")
    assert_equal 169.5, booking.grand_total.to_f
    assert_equal 19.5, booking.tax_amount.to_f
    assert_equal 100, booking.hall_net
    assert_equal 50, booking.catering_net
    operation(booking, "settle", payment(169.5).merge(version: booking.lock_version)); assert_response :success
    assert_balanced
  end

  test "future and completed events reject inappropriate financial mutations" do
    future = book(startDate: (Date.current + 1).iso8601)
    operation(future, "settle", payment(6780).merge(version: future.lock_version)); assert_response :conflict
    booking = book
    operation(booking, "settle", payment(6780).merge(version: booking.lock_version)); assert_response :success
    ["receipt", "refund", "cancel", "settle"].each do |action|
      assert_no_difference ["BanquetTransaction.count", "JournalEntry.count"] do
        operation(booking, action, payment(100).merge(reason: "No mutation", cancellationFee: 0, version: booking.reload.lock_version))
        assert_response :conflict
      end
    end
    patch_event(booking, eventName: "Cannot change"); assert_response :conflict
  end

  test "closed cashier rejects new transactions but permits an identical receipt retry" do
    booking = book
    payload = payment(1000)
    operation(booking, "receipt", payload); assert_response :success
    BusinessDays::Close.call(property: @property, params: { action: "CLOSE_CASHIER", businessDate: Date.current.iso8601, openingCash: 0, countedCash: 1000 }, user: @user)
    operation(booking, "receipt", payload); assert_response :success
    %w[receipt refund cancel settle].each do |action|
      assert_no_difference ["JournalEntry.count", "BanquetTransaction.count"] do
        operation(booking, action, payment(1).merge(reason: "Closed cashier", cancellationFee: 0, version: booking.reload.lock_version))
        assert_response :conflict
        assert_equal "CASHIER_CLOSED", response.parsed_body["code"]
      end
    end
    review = BusinessDays::Review.call(@property)
    assert review[:blockers].any? { |b| b.include?("banquet event") }
  end

  test "payment validation rejects invalid tenders excessive amounts duplicate transfers and foreign accounts" do
    booking = book
    [0, -1, "NaN", "1.001", 6781].each do |amount|
      operation(booking, "receipt", payment(amount)); assert_response :unprocessable_content
    end
    operation(booking, "receipt", payment(100).merge(paymentMethod: "BANK_TRANSFER")); assert_response :unprocessable_content
    operation(booking, "receipt", payment(100).merge(paymentMethod: "KHALTI")); assert_response :unprocessable_content
    bank = payment(100).merge(paymentMethod: "BANK_TRANSFER", transactionRef: "BANK-ONE")
    operation(booking, "receipt", bank); assert_response :success
    operation(booking, "receipt", bank.merge(idempotencyKey: SecureRandom.uuid)); assert_response :conflict
    receivable = @company.accounts.create!(account_code: "1200", name: "Accounts Receivable", category: "ASSET")
    operation(booking, "receipt", payment(100).merge(accountId: receivable.id)); assert_response :unprocessable_content
    foreign = Company.create!(name: "Other", slug: "bnq-foreign").accounts.create!(account_code: "1001", name: "Cash", category: "ASSET")
    operation(booking, "receipt", payment(100).merge(accountId: foreign.id)); assert_response :not_found
    assert_equal 100, booking.reload.advance_paid
  end

  test "settlement rolls back balance collection when ledger configuration is invalid" do
    booking = book
    @company.accounts.create!(account_code: "4004", name: "Wrong account", category: "ASSET")
    assert_no_difference ["JournalEntry.count", "BanquetTransaction.count"] do
      operation(booking, "settle", payment(6780).merge(version: booking.lock_version)); assert_response :conflict
    end
    assert_equal 0, booking.reload.advance_paid
    assert_equal "CONFIRMED", booking.status
  end

  test "legacy advance is never silently posted and can be explicitly posted after review" do
    booking = book
    booking.update_columns(legacy_advance: 1000, advance_paid: 1000)
    operation(booking, "receipt", payment(100)); assert_response :conflict
    assert_equal "LEGACY_ADVANCE", response.parsed_body["code"]
    params = payment(1000).merge(reconciliationMode: "POST_NEW", reason: "Original receipt reviewed", confirmedUnposted: false)
    operation(booking, "reconcile", params); assert_response :unprocessable_content
    assert_difference "JournalEntry.count", 1 do
      operation(booking, "reconcile", params.merge(confirmedUnposted: true)); assert_response :success
    end
    assert_equal 0, booking.reload.legacy_advance
    assert_equal 1000, booking.advance_paid
    assert_equal 1000, BigDecimal(BusinessDays::Review.call(@property)[:cashNet])
  end

  test "legacy receipt linking preserves the posted journal and cannot link it twice" do
    booking = book
    booking.update_columns(legacy_advance: 1000, advance_paid: 1000)
    deposits = @company.accounts.create!(account_code: "2203", name: "Banquet Deposits", category: "LIABILITY")
    journal = @company.journal_entries.create!(property: @property, voucher_number: "PRIOR-BNQ-RECEIPT", posting_date: Date.current, total_debit: 1000, total_credit: 1000, status: "POSTED", source_module: "MANUAL_GL")
    journal.journal_lines.create!(account: @cash, debit: 1000, credit: 0)
    journal.journal_lines.create!(account: deposits, debit: 0, credit: 1000)
    assert_no_difference "JournalEntry.count" do
      operation(booking, "reconcile", payment(1000).merge(reconciliationMode: "LINK", voucherNumber: journal.voucher_number, reason: "Matched original voucher")); assert_response :success
    end
    assert_equal 0, booking.reload.legacy_advance
    assert_equal journal.id, booking.banquet_transactions.sole.journal_entry_id
    assert_raises(ActiveRecord::ReadOnlyRecord) { booking.banquet_transactions.sole.update!(amount: 2) }
    assert_raises(ActiveRecord::ReadOnlyRecord) { journal.update!(total_debit: 2) }
    other = book(startDate: (Date.current + 1).iso8601)
    other.update_columns(legacy_advance: 1000, advance_paid: 1000)
    operation(other, "reconcile", payment(1000).merge(reconciliationMode: "LINK", voucherNumber: journal.voucher_number, reason: "Cannot reuse")); assert_response :conflict
  end

  test "department and read only staff cannot mutate bookings or finances across property boundaries" do
    booking = book
    role = @company.roles.create!(name: "EVENT_READER", permissions: { "BOOKINGS" => %w[read create] })
    reader = @company.users.create!(role:, email: "event-reader@example.test", first_name: "Event", last_name: "Reader", password: password)
    UserProperty.create!(user: reader, property: @property)
    post "/api/v1/auth/login", params: { email: reader.email, password: }, as: :json
    headers = @headers.merge("Authorization" => "Bearer #{response.parsed_body.dig('data', 'token')}")
    %w[receipt refund settle cancel reconcile].each do |action|
      post "/api/v1/banquet/bookings/#{booking.id}/#{action}", params: payment(100), headers:, as: :json
      assert_response :forbidden
    end
    patch "/api/v1/banquet/bookings/#{booking.id}", params: event_payload, headers:, as: :json; assert_response :forbidden
    other = @company.properties.create!(name: "Private", code: "PRIVATE-BNQ")
    get "/api/v1/banquet/bookings", headers: @headers.merge("X-Property-Code" => other.code); assert_response :forbidden
    own_headers = @headers.merge("X-Property-Code" => other.code)
    UserProperty.create!(user: @user, property: other)
    get "/api/v1/banquet/bookings/#{booking.id}", headers: own_headers; assert_response :not_found
    post "/api/v1/banquet/bookings/#{booking.id}/receipt", params: payment(100), headers: own_headers, as: :json; assert_response :not_found
  end

  test "zero charge event can be completed without a cash receipt or journal" do
    booking = book(hallRent: 0, cateringTotal: 0)
    assert_no_difference "JournalEntry.count" do
      operation(booking, "settle", { version: booking.lock_version, idempotencyKey: SecureRandom.uuid }); assert_response :success
    end
    assert_equal "COMPLETED", booking.reload.status
  end

  test "duplicate bank refund reference cannot disburse a second time" do
    booking = book
    operation(booking, "receipt", payment(1000)); assert_response :success
    refund = payment(100).merge(paymentMethod: "BANK_TRANSFER", transactionRef: "REFUND-TRANSFER-ONE", reason: "Bank refund paid")
    operation(booking, "refund", refund); assert_response :success
    assert_no_difference ["JournalEntry.count", "BanquetTransaction.count"] do
      operation(booking, "refund", refund.merge(idempotencyKey: SecureRandom.uuid)); assert_response :conflict
    end
    assert_equal 900, booking.reload.advance_paid
  end

  test "cancelled legacy event can reconcile and refund its preserved advance" do
    booking = book
    booking.update_columns(status: "CANCELLED", legacy_advance: 1000, advance_paid: 1000)
    operation(booking, "reconcile", payment(1000).merge(reconciliationMode: "POST_NEW", confirmedUnposted: true, reason: "Earlier receipt not posted")); assert_response :success
    operation(booking, "refund", payment(1000).merge(reason: "Cancelled event payout")); assert_response :success
    assert_equal 0, booking.reload.refund_due
    assert_equal 0, booking.advance_paid
  end

  private

  def password = "Banquet-Finance-Test-2026!"
  def event_payload
    { hallCode: @hall.code, eventName: "Finance Event", guestName: "Event Organizer", phone: "9800098765", startDate: Date.current.iso8601,
      expectedPax: 50, hallRent: 5000, cateringTotal: 1000, idempotencyKey: SecureRandom.uuid }
  end
  def post_event(payload)
    post "/api/v1/banquet/bookings", params: payload, headers: @headers, as: :json
  end
  def book(**changes)
    post_event(event_payload.merge(changes)); assert_response :success
    BanquetBooking.find(response.parsed_body.dig("data", "id"))
  end
  def patch_event(booking, **changes)
    patch "/api/v1/banquet/bookings/#{booking.id}", params: event_payload.merge(version: booking.reload.lock_version).merge(changes), headers: @headers, as: :json
  end
  def payment(amount)
    { amount:, paymentMethod: "CASH", accountId: @cash.id, idempotencyKey: SecureRandom.uuid }
  end
  def operation(booking, action, params)
    post "/api/v1/banquet/bookings/#{booking.id}/#{action}", params:, headers: @headers, as: :json
  end
  def line(entry, code)
    entry.journal_lines.joins(:account).find_by!(accounts: { account_code: code })
  end
  def assert_balanced
    @property.journal_entries.each do |entry|
      assert_equal entry.total_debit, entry.journal_lines.sum(:debit)
      assert_equal entry.total_credit, entry.journal_lines.sum(:credit)
      assert_equal entry.total_debit, entry.total_credit
    end
  end
end
