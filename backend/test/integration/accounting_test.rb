require "test_helper"

class AccountingTest < ActionDispatch::IntegrationTest
  setup do
    @company = Company.create!(name: "Accounting verification", slug: "accounting-verification")
    @property = @company.properties.create!(name: "Accounting Hotel", code: "ACCOUNTING-TEST", business_date: Date.current)
    Access::StaffRoles.install!(@company)
    @owner = actor("OWNER", "owner")
    @cash = account("1001", "ASSET", "Cash")
    @revenue = account("4001", "REVENUE", "Room Revenue")
    @expense = account("6001", "EXPENSE", "Salaries")
    @other = Company.create!(name: "Other company", slug: "accounting-other")
    @foreign_account = @other.accounts.create!(account_code: "1001", category: "ASSET", name: "Other cash")
  end

  test "account creation and journal posting reconcile across reports and account codes" do
    post "/api/v1/accounting/chart-of-accounts", params: { accountCode: "2001", name: "Payable", category: "LIABILITY" }, headers: headers, as: :json
    assert_response :success
    assert_equal @company.id, Account.find(response.parsed_body.dig("data", "id")).company_id
    assert_no_difference ["Account.count", "AuditLog.count"] do
      post "/api/v1/accounting/chart-of-accounts", params: { accountCode: "2001", name: "Duplicate", category: "LIABILITY" }, headers: headers, as: :json
    end
    assert_response :unprocessable_content
    get "/api/v1/accounting/chart-of-accounts", headers: headers
    assert_response :success
    refute_includes response.parsed_body["accounts"].pluck("id"), @foreign_account.id
    post_journal(125.25)
    assert_response :success
    journal = JournalEntry.find(response.parsed_body.dig("data", "id"))
    assert_equal @property.id, journal.property_id
    assert_equal Calendars::BikramSambat.iso(@property.operating_date), journal.nepali_date
    assert_equal journal.total_debit, journal.journal_lines.sum(:debit)
    assert_equal journal.total_credit, journal.journal_lines.sum(:credit)
    assert_equal 2, journal.journal_lines.count
    get "/api/v1/accounting/journals", headers: headers
    assert_equal "1001", response.parsed_body["vouchers"].first["entries"].first.dig("account", "account_code")
    data = reports
    assert_equal 125.25, data.dig("pnl", "totalRevenue")
    assert_equal 125.25, data.dig("balanceSheet", "currentEarnings")
    assert data.dig("balanceSheet", "isBalanced")
    assert data.dig("trialBalanceTotals", "isBalanced")
    assert_equal 125.25, data.dig("trialBalanceTotals", "debit")
    assert_raises(ActiveRecord::ReadOnlyRecord) { journal.journal_lines.first.update!(memo: "Changed") }
    assert_raises(ActiveRecord::ReadOnlyRecord) { journal.journal_lines.first.destroy! }
  end

  test "invalid journal lines cannot write financial records or audit evidence" do
    payloads = [
      [{ accountId: @foreign_account.id, debitAmount: "100" }, { accountId: @revenue.id, creditAmount: "100" }],
      [{ accountId: @cash.id, debitAmount: "-100" }, { accountId: @revenue.id, creditAmount: "-100" }],
      [{ accountId: @cash.id, debitAmount: "NaN" }, { accountId: @revenue.id, creditAmount: "100" }],
      [{ accountId: @cash.id, debitAmount: "100.001" }, { accountId: @revenue.id, creditAmount: "100.001" }],
      [{ accountId: @cash.id, debitAmount: "100", creditAmount: "20" }, { accountId: @revenue.id, creditAmount: "80" }],
      [{ accountId: @cash.id, debitAmount: "100" }, { accountId: @revenue.id, creditAmount: "99.99" }],
      [{ accountId: @cash.id, debitAmount: "100", creditAmount: "100" }],
      [{ accountId: @cash.id, debitAmount: "999999999999.99" }, { accountId: @cash.id, debitAmount: "0.01" }, { accountId: @revenue.id, creditAmount: "999999999999.99" }, { accountId: @revenue.id, creditAmount: "0.01" }],
      ["invalid", "invalid"], []
    ]
    payloads.each do |entries|
      assert_no_difference ["JournalEntry.count", "JournalLine.count", "AuditLog.count", "DocumentSequence.count"] do
        post "/api/v1/accounting/journals", params: { narration: "Invalid test", entries: entries }, headers: headers, as: :json
      end
      assert_includes [400, 422], response.status, response.body
    end
    @cash.update!(active: false)
    post_journal(100)
    assert_response :unprocessable_content
  end

  test "reports preserve negative balances and exclude drafts future dates and other companies" do
    post_journal(100)
    assert_response :success
    JournalEntry.transaction do
      journal = @company.journal_entries.create!(property: @property, voucher_number: "NEGATIVE", posting_date: Date.current, total_debit: 150, total_credit: 150)
      journal.journal_lines.create!(account: @expense, debit: 150)
      journal.journal_lines.create!(account: @cash, credit: 150)
    end
    [["DRAFT", Date.current], ["POSTED", Date.current + 1]].each_with_index do |(status, date), index|
      journal = @company.journal_entries.create!(voucher_number: "EXCLUDED-#{index}", posting_date: date, status: status, total_debit: 1000, total_credit: 1000)
      journal.journal_lines.create!(account: @cash, debit: 1000)
      journal.journal_lines.create!(account: @revenue, credit: 1000)
    end
    journal = @other.journal_entries.create!(voucher_number: "OTHER", posting_date: Date.current, total_debit: 2000, total_credit: 2000)
    journal.journal_lines.create!(account: @foreign_account, debit: 2000)
    data = reports
    assert_equal(-50, data.dig("pnl", "netProfit"))
    assert_equal(-50, data.dig("balanceSheet", "totalAssets"))
    assert data.dig("balanceSheet", "isBalanced")
    cash = data["trialBalance"].find { |row| row["id"] == @cash.id }
    assert_equal(-50, cash["netBalance"])
    assert_equal 50, cash["creditBalance"]
    assert_equal 0, cash["debitBalance"]
    assert_equal 150, data.dig("trialBalanceTotals", "debit")
    assert data.dig("trialBalanceTotals", "isBalanced")
    refute_includes data["trialBalance"].pluck("id"), @foreign_account.id
  end

  test "accounting access requires authorization and property membership" do
    front_desk = actor("FRONT_DESK_STAFF", "desk")
    assert_no_difference ["JournalEntry.count", "Account.count", "AuditLog.count"] do
      post "/api/v1/accounting/journals", params: { narration: "Unauthorized", entries: [] }, headers: headers(front_desk), as: :json
      assert_response :forbidden
      post "/api/v1/accounting/chart-of-accounts", params: { accountCode: "9999", name: "Unauthorized", category: "ASSET" }, headers: headers(front_desk), as: :json
      assert_response :forbidden
    end
    %w[journals chart-of-accounts reports].each do |path|
      get "/api/v1/accounting/#{path}", headers: headers(front_desk)
      assert_response :forbidden
      get "/api/v1/accounting/#{path}"
      assert_response :unauthorized
    end
    property = @other.properties.create!(name: "Other Hotel", code: "OTHER-ACCOUNTING")
    get "/api/v1/accounting/reports", headers: headers.merge("X-Property-Code" => property.code)
    assert_response :not_found
  end

  private

  def account(code, category, name)
    @company.accounts.create!(account_code: code, category: category, name: name)
  end

  def actor(role, email)
    user = @company.users.create!(role: @company.roles.find_by!(name: role), email: "accounting-#{email}@example.test", first_name: "Accounting", last_name: "Test", password: "Accounting-Test-2026!")
    user.user_properties.create!(property: @property)
    user
  end

  def headers(user = @owner)
    { "Authorization" => "Bearer #{Authentication::Token.encode(user)}", "X-Property-Code" => @property.code }
  end

  def post_journal(amount)
    post "/api/v1/accounting/journals", params: { narration: "Accounting verification", entries: [{ accountId: @cash.id, debitAmount: amount.to_s }, { accountId: @revenue.id, creditAmount: amount.to_s }] }, headers: headers, as: :json
  end

  def reports
    get "/api/v1/accounting/reports", headers: headers
    assert_response :success
    response.parsed_body
  end
end
