require "test_helper"

class PayrollTest < ActionDispatch::IntegrationTest
  setup do
    travel_to Time.zone.local(2026, 11, 1, 12)
    @company = Company.create!(name: "Payroll Test Hotel", slug: "payroll-test-hotel")
    @property = @company.properties.create!(name: "Payroll Test Property", code: "PAYROLL-TEST")
    Access::StaffRoles.install!(@company)
    @owner = user("OWNER", "payroll-owner")
    @staff = @property.staff_members.create!(name: "Test Employee", department: "Kitchen", monthly_salary: 30000)
    @accounts = { expense: account("EXPENSE", "5000"), payable: account("LIABILITY", "2200"), deductions: account("LIABILITY", "2201"), advances: account("ASSET", "1200"), cash: account("ASSET", "1000"), tds: account("LIABILITY", "2202") }
    @accounts[:cash].update!(name: "Cash / Bank")
    @mapping = @accounts.except(:cash).transform_keys { |kind| "#{kind}_account_id" }.transform_values(&:id)
    put "#{base}/configuration", params: @mapping, headers: headers, as: :json
    assert_response :success
  end

  teardown { travel_back }

  test "all-rounder admin can review approve and release monthly salary" do
    entry = create_entry
    admin = user("ADMIN", "payroll-admin")
    get base, params: { period: "2083-06" }, headers: headers(admin)
    assert_response :success
    assert_equal [entry.id], response.parsed_body["entries"].pluck("id")
    post "#{base}/#{entry.id}/pay", params: payment, headers: headers(admin), as: :json
    assert_response :unprocessable_content
    assert_equal "DRAFT", entry.reload.status
    post "#{base}/#{entry.id}/approve", headers: headers(admin), as: :json
    assert_response :success
    assert_equal "APPROVED", entry.reload.status
    assert_equal admin.id, AuditLog.find_by!(entity_id: entry.id, action: "APPROVE").user_id
    post "#{base}/#{entry.id}/pay", params: payment, headers: headers(admin), as: :json
    assert_response :success
    assert_equal "PAID", entry.reload.status
    assert_equal 29700, entry.payment_journal.total_debit
  end

  test "advances persist during an open month and recover through balanced payroll journals" do
    entry = create_entry
    travel_to Time.zone.local(2026, 10, 13, 12)
    payload = payment.merge(amount: "5000", request_key: SecureRandom.uuid)
    assert_difference ["PayrollAdvance.count", "JournalEntry.count", "AuditLog.count"], 1 do
      post "#{base}/#{entry.id}/advance", params: payload, headers: headers(user("ADMIN", "advance-admin")), as: :json
      assert_response :success
    end
    assert_equal 5000, entry.reload.advance_amount
    assert_equal 24700, entry.net_pay
    advance = entry.payroll_advances.first!
    assert_equal 5000, balance(@accounts[:advances])
    assert_equal(-5000, balance(@accounts[:cash]))
    assert_equal Date.current, advance.paid_on
    assert_equal 5000, advance.journal_entry.total_debit
    assert_no_difference ["PayrollAdvance.count", "JournalEntry.count", "AuditLog.count"] do
      post "#{base}/#{entry.id}/advance", params: payload, headers: headers, as: :json
      assert_response :success
    end
    post "#{base}/#{entry.id}/advance", params: payment.merge(amount: "2000", request_key: SecureRandom.uuid, payment_method: "BANK_TRANSFER", payment_reference: "ADVANCE-2"), headers: headers, as: :json
    assert_response :success
    assert_equal 7000, entry.reload.advance_amount
    assert_equal 22700, entry.net_pay
    get base, params: { period: "2083-06" }, headers: headers
    assert_response :success
    assert_equal 2, response.parsed_body["entries"].first["advances"].length
    assert_equal 2000, entry.payroll_advances.find_by!(payment_reference: "ADVANCE-2").amount
    travel_to Time.zone.local(2026, 11, 1, 12)
    approve(entry)
    assert_no_difference ["PayrollAdvance.count", "JournalEntry.count", "AuditLog.count"] do
      post "#{base}/#{entry.id}/advance", params: payload, headers: headers, as: :json
      assert_response :success
      post "#{base}/#{entry.id}/advance", params: payment.merge(amount: "1", request_key: SecureRandom.uuid), headers: headers, as: :json
      assert_response :unprocessable_content
    end
    post "#{base}/#{entry.id}/pay", params: payment, headers: headers, as: :json
    assert_response :success
    assert_equal "PAID", entry.reload.status
    assert_equal 22700, entry.payment_journal.total_debit
    assert_equal 0, balance(@accounts[:advances])
    assert_equal 0, balance(@accounts[:payable])
    assert_equal(-29700, balance(@accounts[:cash]))
    assert_equal(-300, balance(@accounts[:tds]))
    @company.journal_entries.each do |journal|
      assert_equal journal.total_debit, journal.journal_lines.sum(:debit)
      assert_equal journal.total_credit, journal.journal_lines.sum(:credit)
      assert_equal journal.total_debit, journal.total_credit
    end
  end

  test "invalid advances reject without financial writes and cannot overdraw salary" do
    entry = create_entry
    receivable = account("ASSET", "1100")
    payload = payment.merge(amount: "5000", request_key: SecureRandom.uuid)
    invalid = [ { amount: "0" }, { amount: "-1" }, { amount: "1.001" }, { amount: "29700.01" },
      { request_key: "bad" }, { paid_on: (Date.current + 1).iso8601 }, { paid_on: (entry.period - 1).iso8601 },
      { payment_method: "BANK_TRANSFER", payment_reference: "" }, { payment_account_id: receivable.id },
      { bs_paid_on: "2083-01-01" } ]
    invalid.each do |change|
      assert_no_difference ["PayrollAdvance.count", "JournalEntry.count", "JournalLine.count", "AuditLog.count"] do
        post "#{base}/#{entry.id}/advance", params: payload.merge(change), headers: headers, as: :json
        assert_response :unprocessable_content
      end
      assert_equal 0, entry.reload.advance_amount
      assert_equal 29700, entry.net_pay
    end
    post "#{base}/#{entry.id}/advance", params: payload, headers: headers, as: :json
    assert_response :success
    assert_no_difference ["PayrollAdvance.count", "JournalEntry.count", "AuditLog.count"] do
      post "#{base}/#{entry.id}/advance", params: payload.merge(amount: "25000", request_key: SecureRandom.uuid), headers: headers, as: :json
      assert_response :unprocessable_content
      patch "#{base}/#{entry.id}", params: { base_salary: "1000", monthly_allowance: "0", tds_rate: "1" }, headers: headers, as: :json
      assert_response :unprocessable_content
    end
    assert_equal 24700, entry.reload.net_pay
    @property.payroll_configuration.destroy!
    assert_no_difference ["PayrollAdvance.count", "JournalEntry.count"] do
      post "#{base}/#{entry.id}/advance", params: payload.merge(request_key: SecureRandom.uuid), headers: headers, as: :json
      assert_response :unprocessable_content
    end
  end

  test "full advance can be settled without a duplicate cash payment" do
    entry = create_entry
    post "#{base}/#{entry.id}/advance", params: payment.merge(amount: "29700", request_key: SecureRandom.uuid), headers: headers, as: :json
    assert_response :success
    assert_equal 0, entry.reload.net_pay
    approve(entry)
    assert_no_difference "JournalEntry.count" do
      post "#{base}/#{entry.id}/pay", params: payment, headers: headers, as: :json
      assert_response :success
    end
    assert_equal "PAID", entry.reload.status
    assert_nil entry.payment_journal
    assert_equal 0, balance(@accounts[:advances])
    assert_equal 0, balance(@accounts[:payable])
    assert_equal(-29700, balance(@accounts[:cash]))
    assert_no_difference ["PayrollAdvance.count", "JournalEntry.count", "AuditLog.count"] do
      post "#{base}/#{entry.id}/advance", params: payment.merge(amount: "1", request_key: SecureRandom.uuid), headers: headers, as: :json
      assert_response :unprocessable_content
    end
  end

  test "month must end before approval and salary release including earlier approved drafts" do
    entry = create_entry
    [Time.zone.local(2026, 10, 13, 12), Time.zone.local(2026, 10, 17, 12)].each do |date|
      travel_to date
      assert_no_difference "JournalEntry.count" do
        post "#{base}/#{entry.id}/approve", headers: headers, as: :json
      end
      assert_response :unprocessable_content
      assert_equal "DRAFT", entry.reload.status
    end
    travel_to Time.zone.local(2026, 10, 18, 12)
    approve(entry)
    travel_to Time.zone.local(2026, 10, 17, 12)
    assert_no_difference "JournalEntry.count" do
      post "#{base}/#{entry.id}/pay", params: payment, headers: headers, as: :json
    end
    assert_response :unprocessable_content
    assert_equal "APPROVED", entry.reload.status
    travel_to Time.zone.local(2026, 10, 18, 12)
    post "#{base}/#{entry.id}/pay", params: payment, headers: headers, as: :json
    assert_response :success
    assert_equal "PAID", entry.reload.status
  end

  test "salary setup snapshot and monthly duplicate protection" do
    patch "#{base}/staff/#{@staff.id}", params: { monthly_salary: "32000.50" }, headers: headers, as: :json
    assert_response :success
    assert_equal BigDecimal("32000.50"), @staff.reload.monthly_salary
    entry = create_entry
    assert_equal @staff.basic_salary, entry.base_salary
    patch "#{base}/staff/#{@staff.id}", params: { monthly_salary: "35000" }, headers: headers, as: :json
    assert_response :success
    assert_equal BigDecimal("19200.30"), entry.reload.base_salary
    assert_no_difference "PayrollEntry.count" do
      post base, params: { staff_member_id: @staff.id, calendar: "BS", period: "2083-06" }, headers: headers, as: :json
    end
    assert_response :unprocessable_content
    post base, params: { staff_member_id: @staff.id, calendar: "BS", period: "2083-07" }, headers: headers, as: :json
    assert_response :created
    get base, params: { period: "2083-06" }, headers: headers
    assert_response :success
    assert_equal [entry.id], response.parsed_body["entries"].pluck("id")
    assert_equal @property.name, response.parsed_body["property"]
    assert_equal "BS", entry.period_calendar
    assert_equal Date.new(2026, 9, 17), entry.period
    assert_equal "Ashwin 2083 BS", response.parsed_body.dig("payroll_period", "label")
    assert_equal "2026-10-17", response.parsed_body.dig("payroll_period", "end_ad")
  end

  test "approval payment balanced ledger persistence and idempotency" do
    entry = create_entry
    # Historical adjustments remain payable without exposing new adjustment inputs.
    entry.update!(base_salary: 30000, monthly_allowance: 0, earnings: 2000, deductions: 1000)
    assert_equal 0, entry.reload.advance_amount
    assert_equal 30680, entry.net_pay
    approve(entry)
    assert_equal "APPROVED", entry.reload.status
    assert_equal 32000, entry.approval_journal.total_debit
    assert_no_difference "JournalEntry.count" do
      approve(entry)
    end
    edit(entry, earnings: "4000", expected: :unprocessable_content)
    assert_equal 2000, entry.reload.earnings
    post "#{base}/#{entry.id}/pay", params: payment.merge(payment_method: "BANK_TRANSFER", payment_reference: "TEST-BANK-1"), headers: headers, as: :json
    assert_response :success
    assert_equal "PAID", entry.reload.status
    assert_equal Date.current, entry.paid_on
    assert_equal "TEST-BANK-1", entry.payment_reference
    assert_no_difference "JournalEntry.count" do
      post "#{base}/#{entry.id}/pay", params: payment, headers: headers, as: :json
    end
    assert_response :success
    @company.journal_entries.each do |journal|
      assert_equal "PAYROLL", journal.source_module
      assert_equal journal.total_debit, journal.journal_lines.sum(:debit)
      assert_equal journal.total_credit, journal.journal_lines.sum(:credit)
      assert_equal journal.total_debit, journal.total_credit
    end
    assert_equal 0, balance(@accounts[:advances])
    assert_equal 0, balance(@accounts[:payable])
    assert_equal(-30680, balance(@accounts[:cash]))
    assert_equal(-320, balance(@accounts[:tds]))
    assert_equal 32000, balance(@accounts[:expense])
    assert_equal(-1000, balance(@accounts[:deductions]))
    get base, params: { period: "2083-06" }, headers: headers
    assert_response :success
    row = response.parsed_body["entries"].first
    assert_equal "PAID", row["status"]
    assert_empty row["advances"]
    assert_equal entry.approval_journal.voucher_number, row["approval_voucher"]
    assert_equal entry.payment_journal.voucher_number, row["payment_voucher"]
    assert_equal Calendars::BikramSambat.iso(Date.current), row["paid_on_bs"]
    assert_equal "Ashwin 2083 BS", row["period_label"]
    assert_equal Calendars::BikramSambat.iso(Date.current), entry.payment_journal.nepali_date
    assert_includes entry.approval_journal.narration, "Ashwin 2083 BS"
    assert_equal 1, AuditLog.where(entity_id: entry.id, action: "PAY").count
    get "/api/v1/accounting/reports", headers: headers
    assert_response :success
    assert_equal 32000, response.parsed_body.dig("pnl", "totalExpenses")
  end

  test "financial validation and zero net settlement" do
    entry = create_entry
    patch "#{base}/#{entry.id}", params: { monthly_allowance: "0", base_salary: "900000000000", earnings: "900000000000", deductions: "900000000000", tds_rate: "1" }, headers: headers, as: :json
    assert_response :unprocessable_content
    assert_equal 18000, entry.reload.base_salary
    post "#{base}/#{entry.id}/pay", params: payment, headers: headers, as: :json
    assert_response :unprocessable_content
    ["-1", "1.001", "NaN", "1000000000000"].each do |invalid|
      patch "#{base}/staff/#{@staff.id}", params: { monthly_salary: invalid }, headers: headers, as: :json
      assert_response :unprocessable_content
    end
    edit(entry, deductions: "29700.01", expected: :unprocessable_content)
    assert_equal 0, entry.reload.deductions
    entry.update!(base_salary: 30000, monthly_allowance: 0, deductions: 29700)
    approve(entry)
    assert_equal 0, entry.reload.net_pay
    assert_no_difference "JournalEntry.count" do
      post "#{base}/#{entry.id}/pay", params: payment, headers: headers, as: :json
    end
    assert_response :success
    assert_equal "PAID", entry.reload.status
    assert_nil entry.payment_journal
  end

  test "payment date reference account and configuration restrictions" do
    entry = create_entry
    approve(entry)
    receivable = account("ASSET", "1100")
    receivable.update!(name: "Accounts Receivable")
    [payment.merge(paid_on: "invalid"), payment.merge(paid_on: Date.tomorrow.iso8601), payment.merge(paid_on: Date.yesterday.iso8601),
     payment.merge(payment_method: "CARD"), payment.merge(payment_method: "BANK_TRANSFER", payment_reference: ""),
     payment.merge(payment_account_id: @accounts[:advances].id), payment.merge(payment_account_id: receivable.id)].each do |payload|
      assert_no_difference "JournalEntry.count" do
        post "#{base}/#{entry.id}/pay", params: payload, headers: headers, as: :json
      end
      assert_response :unprocessable_content
      assert_equal "APPROVED", entry.reload.status
    end
    new_expense = account("EXPENSE", "5001")
    put "#{base}/configuration", params: @mapping.merge("expense_account_id" => new_expense.id), headers: headers, as: :json
    assert_response :unprocessable_content
    post "#{base}/#{entry.id}/pay", params: payment, headers: headers, as: :json
    assert_response :success
    put "#{base}/configuration", params: @mapping.merge("expense_account_id" => new_expense.id), headers: headers, as: :json
    assert_response :success
    put "#{base}/configuration", params: @mapping.merge("expense_account_id" => @accounts[:cash].id), headers: headers, as: :json
    assert_response :unprocessable_content
  end

  test "payment options distinguish cash and bank from other asset accounts" do
    bank = account("ASSET", "1002")
    bank.update!(name: "Nepal Bank")
    receivable = account("ASSET", "1100")
    receivable.update!(name: "Accounts Receivable")
    get base, params: { period: "2083-06" }, headers: headers
    assert_response :success
    options = response.parsed_body.fetch("accounts").index_by { |item| item.fetch("id") }
    assert_equal true, options.fetch(@accounts[:cash].id).fetch("cash_or_bank")
    assert_equal true, options.fetch(bank.id).fetch("cash_or_bank")
    assert_equal false, options.fetch(receivable.id).fetch("cash_or_bank")
    assert_equal false, options.fetch(@accounts[:advances].id).fetch("cash_or_bank")
    entry = create_entry
    approve(entry)
    post "#{base}/#{entry.id}/pay", params: payment.merge(payment_method: "BANK_TRANSFER", payment_reference: "test-transfer", payment_account_id: bank.id), headers: headers, as: :json
    assert_response :success
    assert_equal "PAID", entry.reload.status
    assert_equal entry.net_pay, entry.payment_journal.journal_lines.find_by!(account: bank).credit
  end

  test "payroll roles and property company isolation across every write" do
    entry = create_entry
    [user("FRONT_DESK_STAFF", "payroll-frontdesk"), user("KITCHEN", "payroll-kitchen")].each do |actor|
      get base, params: { period: "2083-06" }, headers: headers(actor)
      assert_response :forbidden
      patch "#{base}/staff/#{@staff.id}", params: { monthly_salary: "1" }, headers: headers(actor), as: :json
      assert_response :forbidden
      %w[approve pay advance].each do |action|
        post "#{base}/#{entry.id}/#{action}", params: payment, headers: headers(actor), as: :json
        assert_response :forbidden
      end
    end
    other = @company.properties.create!(name: "Other Property", code: "PAYROLL-OTHER")
    foreign_staff = other.staff_members.create!(name: "Foreign", department: "Kitchen", monthly_salary: 100)
    post base, params: { staff_member_id: foreign_staff.id, calendar: "BS", period: "2083-06" }, headers: headers, as: :json
    assert_response :not_found
    patch "#{base}/staff/#{foreign_staff.id}", params: { monthly_salary: "1" }, headers: headers, as: :json
    assert_response :not_found
    get base, params: { period: "2083-06" }, headers: headers.merge("X-Property-Code" => other.code)
    assert_response :forbidden
    @owner.user_properties.create!(property: other)
    %w[approve advance pay].each do |action|
      post "#{base}/#{entry.id}/#{action}", params: payment, headers: headers.merge("X-Property-Code" => other.code), as: :json
      assert_response :not_found
    end
    foreign_company = Company.create!(name: "Foreign Company", slug: "foreign-payroll")
    foreign_account = foreign_company.accounts.create!(account_code: "1", name: "Foreign liability", category: "LIABILITY")
    put "#{base}/configuration", params: @mapping.merge("payable_account_id" => foreign_account.id), headers: headers, as: :json
    assert_response :unprocessable_content
    approve(entry)
    post "#{base}/#{entry.id}/pay", params: payment.merge(payment_account_id: foreign_account.id), headers: headers, as: :json
    assert_response :not_found
  end

  test "missing setup inactive staff and invalid months fail safely" do
    @property.payroll_configuration.destroy!
    entry = create_entry
    assert_no_difference "JournalEntry.count" do
      post "#{base}/#{entry.id}/approve", headers: headers, as: :json
    end
    assert_response :unprocessable_content
    assert_equal "DRAFT", entry.reload.status
    %w[2083-13 2083-1 1974-01 2101-01 bad].each do |month|
      get base, params: { period: month }, headers: headers
      assert_response :unprocessable_content
    end
    @staff.update!(monthly_salary: nil)
    post base, params: { staff_member_id: @staff.id, calendar: "BS", period: "2083-07" }, headers: headers, as: :json
    assert_response :unprocessable_content
    @staff.update!(active: false)
    post base, params: { staff_member_id: @staff.id, calendar: "BS", period: "2083-07" }, headers: headers, as: :json
    assert_response :not_found
  end

  test "ledger failure rolls back salary approval and document number" do
    entry = create_entry
    # A database trigger models a failure after the voucher was inserted.
    connection = ActiveRecord::Base.connection
    connection.execute("CREATE FUNCTION payroll_test_fail_line() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'isolated payroll test failure'; END; $$ LANGUAGE plpgsql")
    connection.execute("CREATE TRIGGER payroll_test_fail_line BEFORE INSERT ON journal_lines FOR EACH ROW EXECUTE FUNCTION payroll_test_fail_line()")
    assert_no_difference ["JournalEntry.count", "JournalLine.count", "DocumentSequence.count"] do
      assert_raises(ActiveRecord::StatementInvalid) do
        PayrollEntry.transaction(requires_new: true) { post "#{base}/#{entry.id}/approve", headers: headers, as: :json }
      end
    end
    assert_equal "DRAFT", entry.reload.status
    assert_nil entry.approval_journal_id
  ensure
    connection&.execute("DROP TRIGGER IF EXISTS payroll_test_fail_line ON journal_lines")
    connection&.execute("DROP FUNCTION IF EXISTS payroll_test_fail_line()")
  end

  test "earlier AD payroll retains its original month and is separate from new BS payroll" do
    legacy = @property.payroll_entries.create!(staff_member: @staff, period: Date.new(2026, 10, 1), period_calendar: "AD",
      employee_name: @staff.name, department: @staff.department, base_salary: 30000, net_pay: 30000)
    entry = create_entry
    get base, params: { period: "2083-06", calendar: "BS" }, headers: headers
    assert_response :success
    assert_equal [entry.id], response.parsed_body["entries"].pluck("id")
    assert_equal ["2026-10"], response.parsed_body["legacy_ad_periods"]
    get base, params: { period: "2026-10", calendar: "AD" }, headers: headers
    assert_response :success
    assert_equal [legacy.id], response.parsed_body["entries"].pluck("id")
    assert_equal "October 2026 AD", response.parsed_body["entries"].first["period_label"]
    assert_equal Date.new(2026, 10, 1), legacy.reload.period
    post base, params: { staff_member_id: @staff.id, period: "2026-11", calendar: "AD" }, headers: headers, as: :json
    assert_response :unprocessable_content
    post base, params: { staff_member_id: @staff.id, period: "2026-11" }, headers: headers, as: :json
    assert_response :bad_request
  end

  test "BS payment dates must match real Gregorian dates and persisted period starts must be valid" do
    entry = create_entry
    approve(entry)
    assert_no_difference "JournalEntry.count" do
      post "#{base}/#{entry.id}/pay", params: payment.merge(bs_paid_on: "2083-01-01"), headers: headers, as: :json
    end
    assert_response :unprocessable_content
    post "#{base}/#{entry.id}/pay", params: payment.merge(bs_paid_on: Calendars::BikramSambat.iso(Date.current)), headers: headers, as: :json
    assert_response :success
    assert_equal Calendars::BikramSambat.iso(Date.current), response.parsed_body["entry"]["paid_on_bs"]
    entry.period = Date.new(2026, 9, 18)
    assert_not entry.valid?
    assert_includes entry.errors[:period], "must be the first day of a BS month"
  end

  test "archived paid AD payroll is hidden while its salary and payment ledger history remains" do
    entry = @property.payroll_entries.create!(staff_member: @staff, period: Date.new(2026, 10, 1), period_calendar: "AD",
      employee_name: @staff.name, department: @staff.department, base_salary: 30000, net_pay: 30000, tds_rate: 0, tds_reason: "Historical zero-tax sample")
    entry.archived_at = Time.current
    assert_not entry.valid?
    entry.archived_at = nil
    approve(entry)
    post "#{base}/#{entry.id}/pay", params: payment, headers: headers, as: :json
    assert_response :success
    entry.reload
    journal_ids = [entry.approval_journal_id, entry.payment_journal_id]
    ledger_before = journal_ids.map { |id| JournalEntry.find(id).attributes }
    cash_before = balance(@accounts[:cash])
    get base, params: { period: "2083-06", calendar: "BS" }, headers: headers
    assert_equal ["2026-10"], response.parsed_body["legacy_ad_periods"]
    assert_no_difference ["PayrollEntry.count", "JournalEntry.count", "JournalLine.count"] do
      entry.update!(archived_at: Time.current)
    end
    get base, params: { period: "2083-06", calendar: "BS" }, headers: headers
    assert_response :success
    assert_empty response.parsed_body["legacy_ad_periods"]
    get base, params: { period: "2026-10", calendar: "AD" }, headers: headers
    assert_response :success
    assert_empty response.parsed_body["entries"]
    assert_equal ledger_before, journal_ids.map { |id| JournalEntry.find(id).attributes }
    assert_equal cash_before, balance(@accounts[:cash])
    assert_equal "PAID", entry.reload.status
    post "#{base}/#{entry.id}/pay", params: payment, headers: headers, as: :json
    assert_response :not_found
    get "/api/v1/accounting/reports", headers: headers
    assert_response :success
    assert_equal 30000, response.parsed_body.dig("pnl", "totalExpenses")
  end

  test "new payroll defaults to one percent gross salary TDS and ignores client totals" do
    entry = create_entry
    assert_equal 1, entry.tds_rate
    assert_equal 300, entry.tds_amount
    assert_equal 29700, entry.net_pay
    payload = { monthly_allowance: "0", base_salary: "30000", tds_rate: "1", tds_amount: "0", net_pay: "31000" }
    patch "#{base}/#{entry.id}", params: payload, headers: headers, as: :json
    assert_response :success
    assert_equal 300, entry.reload.tds_amount
    assert_equal 29700, entry.net_pay
    approve(entry)
    assert_equal(-300, balance(@accounts[:tds]))
    assert_equal 0, balance(@accounts[:deductions])
    assert_equal 300, response.parsed_body.dig("entry", "tds_amount").to_d
    assert_no_difference "JournalEntry.count" do
      approve(entry)
    end
    assert_equal(-300, balance(@accounts[:tds]))
    payload[:tds_rate] = "0"
    payload[:tds_reason] = "Cannot change posted payroll"
    patch "#{base}/#{entry.id}", params: payload, headers: headers, as: :json
    assert_response :unprocessable_content
    assert_equal 1, entry.reload.tds_rate
  end

  test "TDS rounds half a paisa up and supports rates without requiring a reason" do
    entry = create_entry
    payload = { monthly_allowance: "0", base_salary: "0.50", earnings: "0", deductions: "0", tds_rate: "1" }
    patch "#{base}/#{entry.id}", params: payload, headers: headers, as: :json
    assert_response :success
    assert_equal BigDecimal("0.01"), entry.reload.tds_amount
    assert_equal BigDecimal("0.49"), entry.net_pay
    payload.merge!(base_salary: "30000", tds_rate: "0", tds_reason: "")
    patch "#{base}/#{entry.id}", params: payload, headers: headers, as: :json
    assert_response :success
    assert_equal 0, entry.reload.tds_rate
    payload[:tds_reason] = "Reviewed qualifying SSF contribution exemption"
    patch "#{base}/#{entry.id}", params: payload, headers: headers, as: :json
    assert_response :success
    assert_equal 0, entry.reload.tds_amount
    assert_equal 30000, entry.net_pay
    assert_not entry.tds_review_required?
    payload.merge!(tds_rate: "1.25", tds_reason: "Accountant-reviewed effective monthly withholding")
    patch "#{base}/#{entry.id}", params: payload, headers: headers, as: :json
    assert_response :success
    assert_equal 375, entry.reload.tds_amount
    assert_equal 29625, entry.net_pay
    approve(entry)
    assert_equal(-375, balance(@accounts[:tds]))
  end

  test "invalid TDS rates and deductions exceeding net salary do not change the draft" do
    entry = create_entry
    payload = { monthly_allowance: "0", base_salary: "30000", earnings: "0", deductions: "0", tds_rate: "1" }
    %w[-1 101 1.001 NaN].each do |rate|
      patch "#{base}/#{entry.id}", params: payload.merge(tds_rate: rate, tds_reason: "Invalid rate"), headers: headers, as: :json
      assert_response :unprocessable_content
      assert_equal 300, entry.reload.tds_amount
      assert_equal 29700, entry.net_pay
    end
    patch "#{base}/#{entry.id}", params: payload.merge(deductions: "29700.01"), headers: headers, as: :json
    assert_response :unprocessable_content
    assert_equal 0, entry.reload.deductions
    assert_equal 29700, entry.net_pay
    put "#{base}/configuration", params: @mapping.merge("tds_account_id" => SecureRandom.uuid), headers: headers, as: :json
    assert_response :unprocessable_content
    @property.payroll_configuration.update!(tds_account: nil)
    assert_no_difference "JournalEntry.count" do
      post "#{base}/#{entry.id}/approve", headers: headers, as: :json
    end
    assert_response :unprocessable_content
    assert_equal "DRAFT", entry.reload.status
  end

  test "salary size and fiscal year do not require TDS reasons" do
    @staff.update!(monthly_salary: 100000)
    entry = create_entry
    assert_not entry.tds_review_required?
    payload = { monthly_allowance: "0", base_salary: "100000", tds_rate: "3" }
    patch "#{base}/#{entry.id}", params: payload, headers: headers, as: :json
    assert_response :success
    assert_equal 3000, entry.reload.tds_amount
    assert_equal 97000, entry.net_pay
    assert_not entry.tds_review_required?
    approve(entry)
    post base, params: { staff_member_id: @staff.id, calendar: "BS", period: "2084-04" }, headers: headers, as: :json
    assert_response :created
    future = PayrollEntry.find(response.parsed_body.dig("entry", "id"))
    assert_not future.tds_review_required?
    assert_equal 2084, future.tds_fiscal_year
  end

  test "earlier unreviewed drafts require TDS setup without silently changing old figures" do
    legacy = @property.payroll_entries.create!(staff_member: @staff, period: Date.new(2026, 10, 1), period_calendar: "AD",
      employee_name: @staff.name, department: @staff.department, base_salary: 30000, net_pay: 30000)
    assert_nil legacy.tds_rate
    assert_equal 0, legacy.tds_amount
    assert_equal 30000, legacy.net_pay
    post "#{base}/#{legacy.id}/approve", headers: headers, as: :json
    assert_response :unprocessable_content
    assert_equal 30000, legacy.reload.net_pay
    edit(legacy)
    assert_equal 300, legacy.reload.tds_amount
    assert_equal 29700, legacy.net_pay
    assert_not legacy.tds_review_required?
  end

  test "gross salary sets a sixty forty split and snapshots it through approval and payment" do
    patch "#{base}/staff/#{@staff.id}", params: { monthly_salary: "20000", basic_salary: "1", monthly_allowance: "1" }, headers: headers, as: :json
    assert_response :success
    assert_equal 20000, @staff.reload.monthly_salary
    assert_equal 12000, @staff.basic_salary
    assert_equal 8000, @staff.monthly_allowance
    get base, params: { period: "2083-06" }, headers: headers
    member = response.parsed_body.fetch("staff").find { |item| item["id"] == @staff.id }
    assert_equal 12000, member.fetch("basic_salary").to_d
    assert_equal 8000, member.fetch("monthly_allowance").to_d
    entry = create_entry
    assert_equal 12000, entry.base_salary
    assert_equal 8000, entry.monthly_allowance
    assert_equal 20000, entry.gross_salary
    assert_equal 200, entry.tds_amount
    assert_equal 19800, entry.net_pay
    patch "#{base}/staff/#{@staff.id}", params: { monthly_salary: "25000" }, headers: headers, as: :json
    assert_response :success
    assert_equal 12000, entry.reload.base_salary
    assert_equal 8000, entry.monthly_allowance
    approve(entry)
    entry.reload
    assert_equal 20000, entry.approval_journal.journal_lines.find_by!(account: @accounts[:expense]).debit
    assert_equal 200, entry.approval_journal.journal_lines.find_by!(account: @accounts[:tds]).credit
    assert_equal 19800, entry.approval_journal.journal_lines.find_by!(account: @accounts[:payable]).credit
    post "#{base}/#{entry.id}/pay", params: payment, headers: headers, as: :json
    assert_response :success
    assert_equal "PAID", entry.reload.status
    assert_equal 19800, entry.payment_journal.total_credit
    assert_equal 20000, response.parsed_body.dig("entry", "gross_salary").to_d
    assert_equal 8000, response.parsed_body.dig("entry", "monthly_allowance").to_d
    assert_equal 0, balance(@accounts[:payable])
  end

  test "salary split rounding preserves gross to the paisa" do
    [ ["20000.01", "12000.01", "8000.00"], ["0.01", "0.01", "0.00"], ["0.50", "0.30", "0.20"] ].each do |gross, basic, allowance|
      @staff.update!(monthly_salary: gross)
      assert_equal basic.to_d, @staff.basic_salary
      assert_equal allowance.to_d, @staff.monthly_allowance
      assert_equal gross.to_d, @staff.basic_salary + @staff.monthly_allowance
    end
  end

  test "draft allowances participate in gross withholding and safe validation" do
    @staff.update!(monthly_salary: 20000)
    entry = create_entry
    payload = { base_salary: "12000", monthly_allowance: "8000", tds_rate: "1" }
    patch "#{base}/#{entry.id}", params: payload.merge(net_pay: "99999", gross_salary: "1", tds_amount: "1"), headers: headers, as: :json
    assert_response :success
    assert_equal 20000, entry.reload.gross_salary
    assert_equal 200, entry.tds_amount
    assert_equal 19800, entry.net_pay
    %w[-1 1.001 NaN 1000000000000].each do |invalid|
      assert_no_difference [ "JournalEntry.count", "AuditLog.count" ] do
        patch "#{base}/#{entry.id}", params: payload.merge(monthly_allowance: invalid), headers: headers, as: :json
      end
      assert_response :unprocessable_content
      assert_equal 8000, entry.reload.monthly_allowance
      assert_equal 19800, entry.net_pay
    end
    assert_raises(ActiveRecord::StatementInvalid) do
      PayrollEntry.transaction(requires_new: true) { entry.update_column(:monthly_allowance, 9000) }
    end
    assert_equal 8000, entry.reload.monthly_allowance
  end

  test "new payroll edits need no removed adjustment fields and reject nonzero adjustments" do
    entry = create_entry
    payload = { base_salary: "18000", monthly_allowance: "12000", tds_rate: "1", notes: "Monthly salary" }
    patch "#{base}/#{entry.id}", params: payload, headers: headers, as: :json
    assert_response :success
    assert_equal 30000, entry.reload.gross_salary
    assert_equal 300, entry.tds_amount
    assert_equal 29700, entry.net_pay
    %i[earnings deductions].each do |field|
      assert_no_difference [ "AuditLog.count", "JournalEntry.count" ] do
        patch "#{base}/#{entry.id}", params: payload.merge(field => "100"), headers: headers, as: :json
      end
      assert_response :unprocessable_content
      assert_equal 0, entry.reload.public_send(field)
      assert_equal 29700, entry.net_pay
      assert_no_difference "PayrollEntry.count" do
        post base, params: { staff_member_id: @staff.id, calendar: "BS", period: "2083-07", field => "100" }, headers: headers, as: :json
      end
      assert_response :unprocessable_content
    end
    entry.update!(earnings: 100, deductions: 50)
    patch "#{base}/#{entry.id}", params: payload, headers: headers, as: :json
    assert_response :success
    assert_equal 100, entry.reload.earnings
    assert_equal 50, entry.deductions
    assert_equal BigDecimal("29749"), entry.net_pay
  end

  test "notes and TDS reasons are optional without clearing historical reasons" do
    entry = create_entry
    payload = { base_salary: "18000", monthly_allowance: "12000", tds_rate: "1" }
    [ {}, { notes: "" } ].each do |optional|
      patch "#{base}/#{entry.id}", params: payload.merge(optional), headers: headers, as: :json
      assert_response :success
      assert_equal "", entry.reload.notes
      assert_nil entry.tds_reason
      assert_equal 300, entry.tds_amount
      assert_equal 29700, entry.net_pay
    end
    entry.update!(tds_reason: "Historical review")
    patch "#{base}/#{entry.id}", params: payload, headers: headers, as: :json
    assert_response :success
    assert_equal "Historical review", entry.reload.tds_reason
    approve(entry)
    assert_equal "APPROVED", entry.reload.status
  end

  private


  def base = "/api/v1/accounting/payroll"
  def headers(actor = @owner) = { "Authorization" => "Bearer #{Authentication::Token.encode(actor)}", "X-Property-Code" => @property.code }
  def user(role, email)
    actor = @company.users.create!(role: @company.roles.find_by!(name: role), email: "#{email}@example.com", first_name: "Payroll", last_name: "Tester", password: "Strong-Payroll-Test-2026!")
    actor.user_properties.create!(property: @property)
    actor
  end
  def account(category, code) = @company.accounts.create!(name: "Test #{code}", category: category, account_code: code)
  def balance(account) = account.journal_lines.sum(:debit) - account.journal_lines.sum(:credit)
  def payment = { paid_on: Date.current.iso8601, payment_method: "CASH", payment_account_id: @accounts[:cash].id }
  def create_entry
    post base, params: { staff_member_id: @staff.id, calendar: "BS", period: "2083-06" }, headers: headers, as: :json
    assert_response :created
    PayrollEntry.find(response.parsed_body.dig("entry", "id"))
  end
  def edit(entry, earnings: "0", deductions: "0", expected: :success)
    patch "#{base}/#{entry.id}", params: { monthly_allowance: "0", base_salary: "30000", earnings: earnings, deductions: deductions, tds_rate: "1", notes: "Isolated test" }, headers: headers, as: :json
    assert_response expected
  end
  def approve(entry)
    post "#{base}/#{entry.id}/approve", headers: headers, as: :json
    assert_response :success
  end
end
