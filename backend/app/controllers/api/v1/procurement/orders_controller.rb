module Api
  module V1
    module Procurement
      class OrdersController < BackendController
        def index
          company = default_property.company
          orders = company.purchase_orders.includes(:supplier, :purchase_order_items).order(order_date: :desc)
          render json: { success: true, purchaseOrders: orders.as_json(include: %i[supplier purchase_order_items]), suppliers: company.suppliers.order(:name).as_json }
        end

        def create
          property = default_property
          po = property.purchase_orders.create!(
            company: property.company,
            supplier_id: params[:supplierId],
            po_number: DocumentNumbers::NextNumber.call(company: property.company, property:, document_type: "PURCHASE_ORDER"),
            order_date: Date.current,
            sub_total: params[:totalAmount].presence || 0,
            grand_total: params[:totalAmount].presence || 0,
            status: "SUBMITTED",
            notes: params[:notes].presence || "Local Butwal/Rupandehi Supplier Procurement Order"
          )
          Array(params[:items]).each do |item|
            po.purchase_order_items.create!(description: item[:description] || item[:name] || "Purchase item", quantity: item[:quantity] || 1, unit_price: item[:unitPrice] || 0, line_total: item[:lineTotal] || 0)
          end
          audit!("PROCUREMENT", "CREATE", "PurchaseOrder", po.id, new_values: { po_number: po.po_number })
          render json: { success: true, message: "Purchase Order ##{po.po_number} created and submitted!", data: po.as_json }
        end
      end
    end
  end
end
