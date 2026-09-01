module Api
  module V1
    module Pos
      class BillingController < BackendController
        def create
          property = default_property
          grand = BigDecimal(params[:grandTotal].presence || "0")
          sub = BigDecimal(params[:subTotal].presence || grand.to_s)
          tax = BigDecimal(params[:vatAmount].presence || "0") + BigDecimal(params[:serviceCharge].presence || "0")

          if ActiveModel::Type::Boolean.new.cast(params[:postToRoom]) && params[:roomNumber].present?
            return post_to_room(property, sub, tax, grand)
          end

          voucher = create_journal!(property.company, grand, sub, tax, "POS Direct Settlement - Table #{params[:tableNumber]}")
          audit!("POS", "CREATE", "RestaurantTable", SecureRandom.uuid, new_values: { table: params[:tableNumber], total: grand.to_s })
          render json: { success: true, message: "Order for Table #{params[:tableNumber]} settled via #{params[:paymentMethod].presence || 'FONEPAY'} (Rs. #{grand.to_f}). Receipt Printed & GL posted!", voucherNumber: voucher.voucher_number }
        end

        private

        def post_to_room(property, sub, tax, grand)
          room = property.rooms.includes(reservation_rooms: { reservation: :folio }).find_by!(room_number: params[:roomNumber])
          reservation = room.reservation_rooms.map(&:reservation).find { |res| res.status == "CHECKED_IN" }
          folio = reservation&.folio
          raise ApiError.new("No active in-house open folio found for Room ##{params[:roomNumber]}", status: :bad_request, code: "FOLIO_NOT_FOUND") unless folio&.status == "OPEN"

          folio.folio_items.create!(
            source_module: "RESTAURANT",
            description: "#{params[:outletName].presence || 'Dhiki Restaurant'} (Table #{params[:tableNumber]})",
            quantity: 1,
            unit_price: sub,
            sub_total: sub,
            tax_amount: tax,
            total_amount: grand
          )
          folio.update!(sub_total: folio.sub_total + sub, tax_amount: folio.tax_amount + tax, grand_total: folio.grand_total + grand, balance_due: folio.balance_due + grand)
          audit!("POS", "UPDATE", "Folio", folio.id, new_values: { total: grand.to_s })
          render json: { success: true, message: "Bill of Rs. #{grand.to_f} successfully posted to Room ##{room.room_number} (#{reservation.guest.full_name})!", folioNumber: folio.folio_number }
        end

        def create_journal!(company, grand, sub, tax, narration)
          cash = company.accounts.find_or_create_by!(account_code: "1001") { |a| a.name = "Cash / Bank"; a.category = "ASSET" }
          revenue = company.accounts.find_or_create_by!(account_code: "4002") { |a| a.name = "F&B Revenue"; a.category = "REVENUE" }
          voucher = company.journal_entries.create!(
            voucher_number: DocumentNumbers::NextNumber.call(company:, property: default_property, document_type: "JOURNAL"),
            voucher_type: "SALES",
            posting_date: Date.current,
            narration:,
            total_debit: grand,
            total_credit: grand,
            status: "POSTED",
            source_module: "POS_RESTAURANT"
          )
          voucher.journal_lines.create!(account: cash, memo: narration, debit: grand, credit: 0)
          voucher.journal_lines.create!(account: revenue, memo: narration, debit: 0, credit: sub + tax)
          voucher
        end
      end
    end
  end
end
