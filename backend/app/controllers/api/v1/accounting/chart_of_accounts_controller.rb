module Api
  module V1
    module Accounting
      class ChartOfAccountsController < BackendController
        def index
          render json: { success: true, accounts: default_property.company.accounts.order(:account_code).as_json }
        end

        def create
          account = default_property.company.accounts.create!(
            account_code: params.require(:accountCode),
            name: params.require(:name),
            category: params.require(:category),
            description: params[:description]
          )
          audit!("ACCOUNTING", "CREATE", "Account", account.id, new_values: { account_code: account.account_code })
          render json: { success: true, message: "Account created successfully", data: account.as_json }
        end
      end
    end
  end
end
