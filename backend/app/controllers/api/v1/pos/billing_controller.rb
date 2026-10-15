module Api
  module V1
    module Pos
      class BillingController < BackendController
        def create
          property = default_property
          restaurant = property.restaurants.find_by!(outlet_code: params[:outletCode].to_s)
          idempotency_key = params[:idempotencyKey].presence || SecureRandom.uuid
          @kitchen_order_ids = Array(params[:kitchenOrderIds]).map(&:to_s).uniq

          lines = @kitchen_order_ids.any? ? ticket_lines(property, restaurant) : priced_lines(restaurant)
          raise ApiError.new("At least one order item is required", status: :bad_request, code: "EMPTY_ORDER") if lines.empty?

          sub = lines.sum { |line| line[:total] }
          taxes = calculate_taxes(property.company, sub, property.operating_date)
          tax = taxes.sum { |t| t[:amount] }
          grand = sub + tax

          if ActiveModel::Type::Boolean.new.cast(params[:postToRoom])
            raise ApiError.new("Select an in-house guest room", status: :unprocessable_content, code: "ROOM_REQUIRED") if params[:roomNumber].blank?
            return post_to_room(property, lines, taxes, sub, tax, grand, idempotency_key)
          end

          existing = property.company.journal_entries.find_by(source_module: "POS_RESTAURANT", source_reference: idempotency_key)
          if existing
            return render json: { success: true, message: "Order for Table #{params[:tableNumber]} already settled. Receipt Printed & GL posted!", voucherNumber: existing.voucher_number }
          end

          voucher = ActiveRecord::Base.transaction do
            BusinessDays::Context.ensure_cashier_open!(property)
            lock_tickets!(property)
            v = create_journal!(property, property.company, grand, sub, tax, "POS Direct Settlement - Table #{params[:tableNumber]}", idempotency_key)
            settle_tickets!
            audit!("POS", "CREATE", "RestaurantTable", SecureRandom.uuid, new_values: { table: params[:tableNumber], total: grand.to_s })
            v
          end
          render json: { success: true, message: "Order for Table #{params[:tableNumber]} settled via #{params[:paymentMethod].presence || 'FONEPAY'} (Rs. #{grand.to_f}). Receipt Printed & GL posted!", voucherNumber: voucher.voucher_number }
        end

        private

        def ticket_lines(property, restaurant)
          @tickets = property.kitchen_orders.includes(:restaurant_table).where(id: @kitchen_order_ids).to_a
          unless @tickets.size == @kitchen_order_ids.size && @tickets.all? { |ticket| ticket.restaurant_table.restaurant_id == restaurant.id } && @tickets.map(&:restaurant_table_id).uniq.size == 1
            raise ApiError.new("Select orders from one table in this outlet", status: :unprocessable_content, code: "INVALID_ORDERS")
          end
          @tickets.flat_map { |ticket| ticket.items.map { |item|
            product = restaurant.menu_items.find(item.fetch("menuItemId"))
            { item: product, quantity: item.fetch("quantity").to_d, unit_price: item.fetch("unitPrice").to_d, total: (item.fetch("unitPrice").to_d * item.fetch("quantity")).round(2) }
          } }
        end

        def lock_tickets!(property)
          return if @kitchen_order_ids.empty?
          @tickets.first.restaurant_table.lock!
          @tickets.each(&:lock!)
          if @tickets.any?(&:settled_at)
            raise ApiError.new("One or more orders are already settled. Refresh the table.", status: :conflict, code: "ORDER_SETTLED")
          end
          unless @tickets.all? { |ticket| ticket.status == "SERVED" }
            raise ApiError.new("Mark all table orders served before settling", status: :conflict, code: "ORDER_NOT_SERVED")
          end
          all_ids = property.kitchen_orders.unsettled.where(restaurant_table_id: @tickets.first.restaurant_table_id).pluck(:id).sort
          if all_ids != @kitchen_order_ids.sort
            raise ApiError.new("The table orders changed. Refresh before settling.", status: :conflict, code: "ORDER_CHANGED")
          end
        end

        def settle_tickets!
          return unless @tickets
          @tickets.each { |ticket| ticket.update!(settled_at: Time.current) }
          @tickets.first.restaurant_table.update!(status: "AVAILABLE")
        end

        def priced_lines(restaurant)
          requested = Array(params[:items]).map { |i| { id: i[:menuItemId], qty: BigDecimal((i[:quantity].presence || 1).to_s) } }
          return [] if requested.empty?

          menu_items = restaurant.menu_items.active.where(id: requested.map { |r| r[:id] }).index_by(&:id)
          requested.map do |r|
            item = menu_items[r[:id]]
            raise ApiError.new("Unknown or inactive menu item", status: :unprocessable_entity, code: "INVALID_MENU_ITEM") unless item
            raise ApiError.new("Quantity must be positive", status: :unprocessable_entity, code: "INVALID_QUANTITY") unless r[:qty].positive?

            { item:, quantity: r[:qty], total: (item.price * r[:qty]).round(2) }
          end
        end

        def calculate_taxes(company, base, date)
          running = base
          company.tax_configurations.where(active: true, code: "VAT").for_date(date).order(:calculation_order).map do |t|
            amount = t.inclusive ? 0.to_d : (running * t.rate / 100).round(2)
            running += amount
            { tax: t, amount: }
          end
        end

        def post_to_room(property, lines, taxes, sub, tax, grand, idempotency_key)
          room = property.rooms.active.setup_managed.includes(reservation_rooms: { reservation: :folio }).find_by!(room_number: params[:roomNumber])
          reservation = room.reservation_rooms.map(&:reservation).find { |res| res.status == "CHECKED_IN" }
          folio = reservation&.folio
          raise ApiError.new("No active in-house open folio found for Room ##{params[:roomNumber]}", status: :bad_request, code: "FOLIO_NOT_FOUND") unless folio&.status == "OPEN"

          existing = folio.folio_items.find_by(source_module: "RESTAURANT", source_reference: idempotency_key)
          if existing
            return render json: { success: true, message: "Bill of Rs. #{existing.total_amount.to_f} already posted to Room ##{room.room_number} (#{reservation.guest.full_name})!", folioNumber: folio.folio_number }
          end

          ActiveRecord::Base.transaction do
            folio.lock!
            unless folio.status == "OPEN" && folio.reservation.reload.status == "CHECKED_IN"
              raise ApiError.new("The guest is no longer available for room charges", status: :conflict, code: "FOLIO_NOT_ACTIVE")
            end
            lock_tickets!(property)
            folio.folio_items.create!(
              source_module: "RESTAURANT",
              source_reference: idempotency_key,
              description: "#{params[:outletName].presence || 'Restaurant'} (Table #{params[:tableNumber]})",
              quantity: 1,
              unit_price: sub,
              sub_total: sub,
              tax_amount: tax,
              total_amount: grand,
              calculation_snapshot: {
                lines: lines.map { |l| { menuItemId: l[:item].id, name: l[:item].name, unitPrice: (l[:unit_price] || l[:item].price).to_f, quantity: l[:quantity].to_f, total: l[:total].to_f } },
                taxes: taxes.map { |t| { code: t[:tax].code, rate: t[:tax].rate.to_f, amount: t[:amount].to_f } }
              }
            )
            folio.update!(sub_total: folio.sub_total + sub, tax_amount: folio.tax_amount + tax, grand_total: folio.grand_total + grand, balance_due: folio.balance_due + grand)
            settle_tickets!
            audit!("POS", "UPDATE", "Folio", folio.id, new_values: { total: grand.to_s })
          end
          render json: { success: true, message: "Bill of Rs. #{grand.to_f} successfully posted to Room ##{room.room_number} (#{reservation.guest.full_name})!", folioNumber: folio.folio_number }
        end

        def create_journal!(property, company, grand, sub, tax, narration, idempotency_key)
          cash = company.accounts.find_or_create_by!(account_code: "1001") { |a| a.name = "Cash / Bank"; a.category = "ASSET" }
          revenue = company.accounts.find_or_create_by!(account_code: "4002") { |a| a.name = "F&B Revenue"; a.category = "REVENUE" }
          vat_payable = company.accounts.find_or_create_by!(account_code: "2100") { |a| a.name = "VAT Payable"; a.category = "LIABILITY" }
          voucher = company.journal_entries.create!(
            voucher_number: DocumentNumbers::NextNumber.call(company:, property:, document_type: "JOURNAL"),
            voucher_type: "SALES",
            property:,
            payment_method: params[:paymentMethod].presence || "FONEPAY",
            posting_date: property.operating_date,
            narration:,
            total_debit: grand,
            total_credit: grand,
            status: "POSTED",
            source_module: "POS_RESTAURANT",
            source_reference: idempotency_key
          )
          voucher.journal_lines.create!(account: cash, memo: narration, debit: grand, credit: 0)
          voucher.journal_lines.create!(account: revenue, memo: narration, debit: 0, credit: sub)
          voucher.journal_lines.create!(account: vat_payable, memo: narration, debit: 0, credit: tax) if tax.positive?
          voucher
        end
      end
    end
  end
end
