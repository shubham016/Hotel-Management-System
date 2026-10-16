module Api
  module V1
    module Procurement
      class InvoicesController < BackendController
        def create
          order = default_property.purchase_orders.find(params.require(:orderId))
          invoice = ::Supply::Invoices.new(order).save(params)
          render json:{success:true,data: ::Supply::Portal.invoice(invoice)}
        end
        def update
          invoice = find_invoice
          invoice = ::Supply::Invoices.new(invoice.purchase_order).save(params,invoice:)
          render json:{success:true,data: ::Supply::Portal.invoice(invoice)}
        end
        def post
          invoice = find_invoice
          invoice = ::Supply::Invoices.new(invoice.purchase_order).post(invoice,params)
          render json:{success:true,data: ::Supply::Portal.invoice(invoice)}
        end
        def void
          invoice = find_invoice
          invoice = ::Supply::Invoices.new(invoice.purchase_order).void(invoice,params)
          render json:{success:true,data: ::Supply::Portal.invoice(invoice)}
        end
        def pay
          invoice = find_invoice
          invoice = ::Supply::Invoices.new(invoice.purchase_order).pay(invoice,params)
          render json:{success:true,data: ::Supply::Portal.invoice(invoice)}
        end
        private
        def authorize_request!
          authorize!("ORDERS", action_name == "pay" ? "pay" : "invoice")
        end
        def find_invoice
          SupplierInvoice.where(property:default_property).find(params[:id])
        end
      end
    end
  end
end
