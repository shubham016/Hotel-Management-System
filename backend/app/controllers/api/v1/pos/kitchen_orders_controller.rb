module Api
  module V1
    module Pos
      class KitchenOrdersController < BackendController
        def index
          orders = default_property.kitchen_orders.unsettled.includes(:user, restaurant_table: :restaurant).order(:created_at)
          orders = orders.where.not(status: "SERVED") if Current.user.role.name == "KITCHEN"
          render json: { success: true, orders: orders.map(&:portal_json) }
        end

        def create
          property = default_property
          table = RestaurantTable.joins(:restaurant).where(restaurants: { property_id: property.id, active: true }).find(params.require(:tableId))
          key = params.require(:idempotencyKey).to_s
          raise ApiError.new("Invalid order retry key", status: :bad_request, code: "INVALID_KEY") unless key.match?(/\A[\w-]{8,100}\z/)
          order = KitchenOrder.transaction do
            table.lock!
            existing = property.kitchen_orders.find_by(idempotency_key: key)
            if existing && existing.restaurant_table_id != table.id
              raise ApiError.new("This retry key belongs to another table", status: :conflict, code: "ORDER_CONFLICT")
            end
            if existing
              existing
            else
              requested = Array(params.require(:items))
              raise ApiError.new("Add at least one menu item", status: :unprocessable_content, code: "EMPTY_ORDER") if requested.empty? || requested.size > 100
              menu = table.restaurant.menu_items.active.where(id: requested.map { |item| item[:menuItemId] }).index_by(&:id)
              items = requested.map do |item|
                product = menu[item[:menuItemId]]
                quantity = Integer(item[:quantity].to_s, exception: false)
                unless product && quantity && quantity.between?(1, 100)
                  raise ApiError.new("Select valid menu items and quantities between 1 and 100", status: :unprocessable_content, code: "INVALID_ITEMS")
                end
                { menuItemId: product.id, name: product.name, quantity:, unitPrice: product.price.to_s }
              end
              ticket = property.kitchen_orders.create!(restaurant_table: table, user: Current.user,
                ticket_number: DocumentNumbers::NextNumber.call(company: property.company, property:, document_type: "KOT"),
                idempotency_key: key, items:, notes: params[:notes].to_s.strip.first(500).presence)
              table.update!(status: "OCCUPIED")
              audit!("KITCHEN_ORDERS", "CREATE", "KitchenOrder", ticket.id, new_values: { ticket_number: ticket.ticket_number })
              ticket
            end
          end
          render json: { success: true, order: order.portal_json }, status: :created
        end

        def update
          order = default_property.kitchen_orders.includes(:user, restaurant_table: :restaurant).find(params[:id])
          status = params.require(:status).to_s
          KitchenOrder.transaction do
            order.lock!
            raise ApiError.new("This order has already been settled", status: :conflict, code: "ORDER_SETTLED") if order.settled_at
            if status == "SERVED" && Current.user.role.name == "KITCHEN"
              raise ApiError.new("Restaurant staff mark orders served", status: :forbidden, code: "FORBIDDEN")
            end
            allowed = { "PLACED" => %w[PREPARING READY], "PREPARING" => %w[READY], "READY" => %w[SERVED], "SERVED" => [] }
            unless order.status == status || allowed.fetch(order.status).include?(status)
              raise ApiError.new("Invalid order status transition", status: :conflict, code: "INVALID_STATUS")
            end
            order.status = status
            order.ready_at ||= Time.current if status == "READY"
            order.served_at ||= Time.current if status == "SERVED"
            order.save!
            audit!("KITCHEN_ORDERS", "UPDATE", "KitchenOrder", order.id, new_values: { status: })
          end
          render json: { success: true, order: order.portal_json }
        end
      end
    end
  end
end
