module Api
  module V1
    module Accounting
      class ReportsController < BackendController
        def index
          accounts = default_property.company.accounts.includes(:journal_lines).order(:account_code).map { |account| account_balance(account) }
          revenues = accounts.select { |account| account[:category] == "REVENUE" }
          cogs = accounts.select { |account| account[:category] == "COST_OF_SALES" }
          expenses = accounts.select { |account| account[:category] == "EXPENSE" }
          assets = accounts.select { |account| account[:category] == "ASSET" }
          liabilities = accounts.select { |account| account[:category] == "LIABILITY" }
          equity = accounts.select { |account| account[:category] == "EQUITY" }

          total_revenue = revenues.sum { |account| account[:netBalance] }
          total_cogs = cogs.sum { |account| account[:netBalance] }
          total_expenses = expenses.sum { |account| account[:netBalance] }
          total_assets = assets.sum { |account| account[:netBalance] }
          total_liabilities = liabilities.sum { |account| account[:netBalance] }
          total_equity = equity.sum { |account| account[:netBalance] }
          gross_profit = total_revenue - total_cogs
          net_profit = gross_profit - total_expenses

          render json: {
            success: true,
            fiscalYear: Date.current.year.to_s,
            today: { adFormatted: Date.current.iso8601, bsFormatted: Date.current.iso8601 },
            pnl: {
              totalRevenue: total_revenue,
              totalCOGS: total_cogs,
              grossProfit: gross_profit,
              totalExpenses: total_expenses,
              netProfit: net_profit,
              netMargin: total_revenue.positive? ? ((net_profit / total_revenue) * 100).round(1).to_s : "0"
            },
            balanceSheet: {
              totalAssets: total_assets,
              totalLiabilities: total_liabilities,
              totalEquity: total_equity,
              isBalanced: (total_assets - (total_liabilities + total_equity)).abs < 1000
            },
            trialBalance: accounts
          }
        end

        private

        def account_balance(account)
          total_debit = account.journal_lines.sum(&:debit)
          total_credit = account.journal_lines.sum(&:credit)
          normal_debit = account.category.in?(%w[ASSET EXPENSE COST_OF_SALES])
          net = normal_debit ? total_debit - total_credit : total_credit - total_debit
          {
            id: account.id,
            code: account.account_code,
            name: account.name,
            category: account.category,
            totalDebit: total_debit.to_f,
            totalCredit: total_credit.to_f,
            netBalance: [ net.to_f, 0 ].max
          }
        end
      end
    end
  end
end
