module Api
  module V1
    module Accounting
      class ReportsController < BackendController
        def index
          company = default_property.company
          date = default_property.operating_date
          journals = company.journal_entries.where(status: "POSTED").where("posting_date <= ?", date)
          totals = JournalLine.where(journal_entry: journals).group(:account_id).pluck(:account_id, Arel.sql("SUM(debit)"), Arel.sql("SUM(credit)")).to_h { |id, debit, credit| [id, [debit, credit]] }
          accounts = company.accounts.order(:account_code).map do |account|
            debit, credit = totals.fetch(account.id, [0.to_d, 0.to_d])
            normal_debit = account.category.in?(%w[ASSET EXPENSE COST_OF_SALES])
            { id: account.id, code: account.account_code, name: account.name, category: account.category,
              totalDebit: debit, totalCredit: credit, debitBalance: [debit - credit, 0].max, creditBalance: [credit - debit, 0].max,
              netBalance: normal_debit ? debit - credit : credit - debit }
          end
          sum = ->(category) { accounts.select { |account| account[:category] == category }.sum { |account| account[:netBalance] } }
          revenue, cogs, expenses, assets, liabilities, equity = %w[REVENUE COST_OF_SALES EXPENSE ASSET LIABILITY EQUITY].map { |category| sum.call(category) }
          profit = revenue - cogs - expenses
          debit_total = accounts.sum { |account| account[:debitBalance] }
          credit_total = accounts.sum { |account| account[:creditBalance] }
          payroll_tax_ids = PayrollConfiguration.joins(:property).where(properties: { company_id: company.id }).pluck(:tds_account_id).compact
          tax_account_ids = accounts.select { |account| payroll_tax_ids.include?(account[:id]) || account[:name].match?(/\b(?:VAT|TDS|tax)\b/i) }.pluck(:id)
          render json: { success: true, company: company.as_json(only: %i[name currency_code]),
            asOf: date.iso8601, scope: "Company-wide", periodLabel: "All postings through #{date.iso8601}",
            today: { adFormatted: Date.current.iso8601, bsFormatted: Calendars::BikramSambat.iso(Date.current) },
            pnl: { totalRevenue: revenue.to_f, totalCOGS: cogs.to_f, grossProfit: (revenue - cogs).to_f,
              totalExpenses: expenses.to_f, netProfit: profit.to_f, netMargin: revenue.positive? ? (profit / revenue * 100).round(1).to_s : "0" },
            balanceSheet: { totalAssets: assets.to_f, totalLiabilities: liabilities.to_f, totalEquity: equity.to_f,
              currentEarnings: profit.to_f, totalLiabilitiesAndEquity: (liabilities + equity + profit).to_f,
              difference: (assets - liabilities - equity - profit).to_f, isBalanced: assets == liabilities + equity + profit },
            trialBalance: accounts.map { |account| account.transform_values { |value| value.is_a?(BigDecimal) ? value.to_f : value } },
            taxAccountIds: tax_account_ids,
            trialBalanceTotals: { debit: debit_total.to_f, credit: credit_total.to_f, isBalanced: debit_total == credit_total } }
        end
      end
    end
  end
end
