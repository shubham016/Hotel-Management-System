module Api
  module V1
    module Pms
      class FoliosController < BackendController
        def create
          folio = default_property.folios.includes(:reservation, :guest, :payments, :folio_items).find(params.require(:folioId))
          case params.require(:operation)
          when "ADD_CHARGE" then add_charge(folio)
          when "RECORD_PAYMENT" then record_payment(folio)
          when "SETTLE_AND_CHECKOUT" then checkout(folio)
          else raise ApiError.new("Invalid action specified", status: :bad_request, code: "INVALID_ACTION")
          end
        end

        private

        def add_charge(folio)
          quantity = BigDecimal(params[:quantity].presence || "1")
          unit_price = BigDecimal(params.require(:amount).to_s)
          sub_total = quantity * unit_price
          service_charge = ActiveModel::Type::Boolean.new.cast(params.fetch(:calculateTaxes, true)) ? (sub_total * BigDecimal("0.10")).round(2) : 0
          vat = ActiveModel::Type::Boolean.new.cast(params.fetch(:calculateTaxes, true)) ? ((sub_total + service_charge) * BigDecimal("0.13")).round(2) : 0
          total = sub_total + service_charge + vat

          Folio.transaction do
            folio.folio_items.create!(
              source_module: params[:sourceModule].presence || "RESTAURANT",
              description: params.require(:description),
              quantity:,
              unit_price:,
              sub_total:,
              tax_amount: service_charge + vat,
              total_amount: total
            )
            update_totals!(folio)
            audit!("GUEST_FOLIO", "UPDATE", "Folio", folio.id, new_values: { charge: params[:description], amount: total.to_s })
          end
          render json: { success: true, message: "Charge added successfully", data: totals(folio.reload) }
        end

        def record_payment(folio)
          payment = nil
          Folio.transaction do
            payment = create_payment!(folio, BigDecimal(params.require(:amount).to_s), params[:paymentMethod].presence || "FONEPAY", params[:notes], params[:transactionRef])
            update_totals!(folio)
            audit!("GUEST_FOLIO", "CREATE", "Payment", payment.id, new_values: { amount: payment.amount.to_s, folio_id: folio.id })
          end
          render json: { success: true, message: "Payment recorded successfully", receiptNumber: payment.receipt_number, data: totals(folio.reload) }
        end

        def checkout(folio)
          Folio.transaction { close_folio!(folio, params[:settlementMethod].presence || "CASH") }
          render json: { success: true, message: "Folio settled and checked out successfully" }
        end

        def close_folio!(folio, method)
          update_totals!(folio)
          create_payment!(folio, folio.balance_due, method, "Checkout balance settlement") if folio.balance_due.positive?
          update_totals!(folio)
          folio.update!(status: "CLOSED", closed_at: Time.current, balance_due: 0)
          folio.reservation.update!(status: "CHECKED_OUT", checked_out_at: Time.current)
          folio.reservation.reservation_rooms.includes(:room).each { |rr| rr.room&.update!(status: "VACANT_DIRTY") }
          folio.guest.increment!(:lifetime_spend, folio.grand_total)
          audit!("FRONT_DESK", "CHECKOUT", "Folio", folio.id, new_values: { status: "CLOSED" })
        end

        def create_payment!(folio, amount, method, notes = nil, reference = nil)
          folio.payments.create!(
            receipt_number: DocumentNumbers::NextNumber.call(company: Current.company, property: default_property, document_type: "PAYMENT"),
            payment_method: method,
            amount:,
            transaction_reference: reference.presence,
            notes: notes.presence || "Payment recorded",
            paid_at: Time.current
          )
        end

        def update_totals!(folio)
          folio.reload
          sub_total = folio.folio_items.where(voided: false).sum(:sub_total)
          tax_amount = folio.folio_items.where(voided: false).sum(:tax_amount)
          total_paid = folio.payments.sum(:amount)
          grand_total = sub_total + tax_amount
          folio.update!(
            sub_total:,
            tax_amount:,
            grand_total:,
            total_paid:,
            balance_due: [ grand_total - total_paid, 0 ].max,
            status: [ grand_total - total_paid, 0 ].max.zero? && folio.status == "OPEN" ? "SETTLED" : folio.status
          )
        end

        def totals(folio)
          {
            id: folio.id,
            folioNumber: folio.folio_number,
            status: folio.status,
            subTotal: folio.sub_total.to_f,
            serviceCharge: folio.service_charge.to_f,
            vatAmount: folio.tax_amount.to_f,
            grandTotal: folio.grand_total.to_f,
            totalPaid: folio.total_paid.to_f,
            balanceDue: folio.balance_due.to_f
          }
        end
      end
    end
  end
end
