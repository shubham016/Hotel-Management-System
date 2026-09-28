module Api
  module V1
    module Pos
      class BillingController < BackendController
        def create
          property = default_property
          restaurant = property.restaurants.find_by!(outlet_code: params[:outletCode].to_s)
          idempotency_key = params[:idempotencyKey].presence || SecureRandom.uuid

          lines = priced_lines(restaurant)
          raise ApiError.new("At least one order item is required", status: :bad_request, code: "EMPTY_ORDER") if lines.empty?

          sub = lines.sum { |line| line[:total] }
          taxes = calculate_taxes(property.company, sub)
          tax = taxes.sum { |t| t[:amount] }
          grand = sub + tax

          if ActiveModel::Type::Boolean.new.cast(params[:postToRoom]) && params[:roomNumber].present?
            return post_to_room(property, lines, taxes, sub, tax, grand, idempotency_key)
          end

          existing = property.company.journal_entries.find_by(source_module: "POS_RESTAURANT", source_reference: idempotency_key)
          if existing
            return render json: { success: true, message: "Order for Table #{params[:tableNumber]} already settled. Receipt Printed & GL posted!", voucherNumber: existing.voucher_number }
          end

          voucher = ActiveRecord::Base.transaction do
            v = create_journal!(property, property.company, grand, sub, tax, "POS Direct Settlement - Table #{params[:tableNumber]}", idempotency_key)
            audit!("POS", "CREATE", "RestaurantTable", SecureRandom.uuid, new_values: { table: params[:tableNumber], total: grand.to_s })
            v
          end
          render json: { success: true, message: "Order for Table #{params[:tableNumber]} settled via #{params[:paymentMethod].presence || 'FONEPAY'} (Rs. #{grand.to_f}). Receipt Printed & GL posted!", voucherNumber: voucher.voucher_number }
        end

        private

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

        def calculate_taxes(company, base)
          running = base
          company.tax_configurations.where(active: true).for_date(Date.current).order(:calculation_order).map do |t|
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
                lines: lines.map { |l| { menuItemId: l[:item].id, name: l[:item].name, unitPrice: l[:item].price.to_f, quantity: l[:quantity].to_f, total: l[:total].to_f } },
                taxes: taxes.map { |t| { code: t[:tax].code, rate: t[:tax].rate.to_f, amount: t[:amount].to_f } }
              }
            )
            folio.update!(sub_total: folio.sub_total + sub, tax_amount: folio.tax_amount + tax, grand_total: folio.grand_total + grand, balance_due: folio.balance_due + grand)
            audit!("POS", "UPDATE", "Folio", folio.id, new_values: { total: grand.to_s })
          end
          render json: { success: true, message: "Bill of Rs. #{grand.to_f} successfully posted to Room ##{room.room_number} (#{reservation.guest.full_name})!", folioNumber: folio.folio_number }
        end

        def create_journal!(property, company, grand, sub, tax, narration, idempotency_key)
          cash = company.accounts.find_or_create_by!(account_code: "1001") { |a| a.name = "Cash / Bank"; a.category = "ASSET" }
          revenue = company.accounts.find_or_create_by!(account_code: "4002") { |a| a.name = "F&B Revenue"; a.category = "REVENUE" }
          voucher = company.journal_entries.create!(
            voucher_number: DocumentNumbers::NextNumber.call(company:, property:, document_type: "JOURNAL"),
            voucher_type: "SALES",
            posting_date: Date.current,
            narration:,
            total_debit: grand,
            total_credit: grand,
            status: "POSTED",
            source_module: "POS_RESTAURANT",
            source_reference: idempotency_key
          )
          voucher.journal_lines.create!(account: cash, memo: narration, debit: grand, credit: 0)
          voucher.journal_lines.create!(account: revenue, memo: narration, debit: 0, credit: sub + tax)
          voucher
        end
      end
    end
  end
end
