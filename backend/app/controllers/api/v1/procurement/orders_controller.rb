module Api
  module V1
    module Procurement
      class OrdersController < BackendController
        def index
          property = default_property
          orders = property.purchase_orders.includes(:supplier, purchase_order_items: :inventory_item, purchase_receipts: [:store, :user, { stock_movements: [:inventory_item, :source_store, :destination_store, :user] }]).order(order_date: :desc, created_at: :desc)
          render json: { success: true, businessDate: property.operating_date, openingReviewRequired: property.supply_opening_review_required,
            vatRate: property.company.tax_configurations.where(active:true,code:"VAT").for_date(property.operating_date).first&.rate.to_f,
            vatRates:property.company.tax_configurations.where(active:true,code:"VAT").order(:effective_from).map { |t| {rate:t.rate.to_f,from:t.effective_from,until:t.effective_until} },
            accounts: property.company.accounts.where(active:true).order(:account_code).select(&:cash_or_bank?).map { |a| {id:a.id,code:a.account_code,name:a.name} },
            purchaseOrders: orders.map { |po| ::Supply::Portal.order(po) }, suppliers: property.company.suppliers.order(:name).as_json(only: %i[id name phone email address]),
            stores: property.stores.order(:name).as_json(only: %i[id name code]), catalog: property.company.inventory_items.order(:name).map { |i| { id: i.id, sku: i.item_code, name: i.name, unit: i.unit_of_measure, cost: i.standard_cost.to_f } } }
        end

        def show
          render json: { success: true, data: ::Supply::Portal.order(default_property.purchase_orders.find(params[:id])) }
        end

        def create
          order = ::Supply::SaveOrder.call(property: default_property, params:)
          render json: { success: true, data: ::Supply::Portal.order(order) }
        end

        def update
          order = default_property.purchase_orders.find(params[:id])
          order = ::Supply::SaveOrder.call(property: default_property, params:, order:)
          render json: { success: true, data: ::Supply::Portal.order(order) }
        end

        %w[approve cancel].each do |operation|
          define_method(operation) do
            order = default_property.purchase_orders.find(params[:id])
            order = ::Supply::OrderAction.call(order:, params:, operation:)
            render json: { success: true, data: ::Supply::Portal.order(order) }
          end
        end

        def receive
          order = default_property.purchase_orders.find(params[:id])
          receipt = ::Supply::ReceiveOrder.call(order:, params:)
          render json: { success: true, receiptNumber: receipt.receipt_number, data: ::Supply::Portal.order(order.reload) }
        end

        def reconcile_receipt
          order = default_property.purchase_orders.find(params[:id])
          receipt = order.purchase_receipts.find(params.require(:receiptId))
          posting = ::Supply::Ledger.new(default_property).legacy_receipt(receipt,params)
          render json:{success:true,voucherNumber:posting.journal_entry&.voucher_number}
        end

        def supplier
          company = default_property.company
          name = params.require(:name).to_s.strip
          raise ApiError.new("Enter a supplier name", status: :unprocessable_content, code: "INVALID_SUPPLIER") if name.blank?
          email = params[:email].presence
          raise ApiError.new("Enter a valid email address", status: :unprocessable_content, code: "INVALID_SUPPLIER") if email && !email.match?(URI::MailTo::EMAIL_REGEXP)
          record = company.with_lock do
            raise ApiError.new("A supplier with this name already exists", status: :conflict, code: "DUPLICATE_SUPPLIER") if company.suppliers.where("lower(name) = ?", name.downcase).exists?
            company.suppliers.create!(name:, phone: params[:phone], email:, address: params[:address])
          end
          audit!("PROCUREMENT", "CREATE", "Supplier", record.id, new_values: { name: record.name })
          render json: { success: true, data: record.as_json }
        end
      end
    end
  end
end
