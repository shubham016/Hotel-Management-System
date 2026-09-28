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
          description = params.require(:description).to_s.strip
          raise ApiError.new("Charge amount and quantity must be greater than zero", status: :unprocessable_content, code: "INVALID_CHARGE") unless quantity.positive? && unit_price.positive?
          raise ApiError.new("Charge description is required", status: :unprocessable_content, code: "INVALID_CHARGE") if description.blank?
          sub_total = quantity * unit_price
          calculate_taxes = ActiveModel::Type::Boolean.new.cast(params.fetch(:calculateTaxes, true))
          service_charge = calculate_taxes ? (sub_total * BigDecimal("0.10")).round(2) : 0.to_d
          vat = calculate_taxes ? ((sub_total + service_charge) * BigDecimal("0.13")).round(2) : 0.to_d
          total = sub_total + service_charge + vat

          Folio.transaction do
            folio.lock!
            ensure_active_folio!(folio)
            folio.folio_items.create!(
              source_module: params[:sourceModule].presence || "RESTAURANT",
              description:,
              quantity:,
              unit_price:,
              sub_total:,
              tax_amount: service_charge + vat,
              total_amount: total,
              calculation_snapshot: {
                taxes: [
                  { code: "SERVICE_CHARGE", rate: 10, amount: service_charge },
                  { code: "VAT", rate: 13, amount: vat }
                ]
              }
            )
            update_totals!(folio)
            audit!("GUEST_FOLIO", "UPDATE", "Folio", folio.id, new_values: { charge: params[:description], amount: total.to_s })
          end
          render json: { success: true, message: "Charge added successfully", data: totals(folio.reload) }
        end

        def record_payment(folio)
          amount = BigDecimal(params.require(:amount).to_s)
          method = params[:paymentMethod].presence || "CASH"
          raise ApiError.new("Payment amount must be greater than zero", status: :unprocessable_content, code: "INVALID_PAYMENT") unless amount.positive?
          raise ApiError.new("This method requires gateway verification", status: :unprocessable_content, code: "GATEWAY_VERIFICATION_REQUIRED") if method.in?(%w[ESEWA KHALTI FONEPAY])

          payment = nil
          Folio.transaction do
            folio.lock!
            ensure_active_folio!(folio)
            ensure_no_gateway_payment!(folio)
            raise ApiError.new("Payment cannot exceed the outstanding balance", status: :unprocessable_content, code: "PAYMENT_EXCEEDS_BALANCE") if amount > folio.balance_due

            payment = create_payment!(folio, amount, method, params[:notes], params[:transactionRef])
            update_totals!(folio)
            audit!("GUEST_FOLIO", "CREATE", "Payment", payment.id, new_values: { amount: payment.amount.to_s, folio_id: folio.id })
          end
          render json: { success: true, message: "Payment recorded successfully", receiptNumber: payment.receipt_number, data: totals(folio.reload) }
        end

        def checkout(folio)
          method = params[:settlementMethod].presence || "CASH"
          raise ApiError.new("This method requires gateway verification", status: :unprocessable_content, code: "GATEWAY_VERIFICATION_REQUIRED") if method.in?(%w[ESEWA KHALTI FONEPAY])

          voucher = nil
          Folio.transaction do
            folio.lock!
            ensure_active_folio!(folio)
            ensure_no_gateway_payment!(folio)
            close_folio!(folio, method)
            voucher = create_checkout_journal!(folio.reload)
          end
          render json: { success: true, message: "Folio settled, checked out, and posted to the General Ledger", data: { folioNumber: folio.folio_number, journalVoucher: voucher.voucher_number } }
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
          Folios::Recalculate.call(folio)
        end

        def ensure_active_folio!(folio)
          return if folio.reservation.status == "CHECKED_IN" && folio.status.in?(%w[OPEN SETTLED])

          raise ApiError.new("Only an active checked-in guest folio can be changed", status: :conflict, code: "FOLIO_NOT_ACTIVE")
        end

        def ensure_no_gateway_payment!(folio)
          return unless folio.payment_requests.where(status: "INITIATED").exists?

          raise ApiError.new("A gateway payment is in progress. Verify its result before recording another payment or checking out.", status: :conflict, code: "PAYMENT_IN_PROGRESS")
        end

        def create_checkout_journal!(folio)
          company = default_property.company
          narration = "Guest checkout - #{folio.folio_number} - #{folio.guest.full_name}"
          source_reference = "PMS_CHECKOUT:#{folio.id}"
          existing = company.journal_entries.find_by(source_reference:)
          return existing if existing

          cash = ledger_account!(company, "1001", "Cash / Bank", "ASSET")
          room_revenue = ledger_account!(company, "4001", "Room Revenue", "REVENUE")
          food_revenue = ledger_account!(company, "4002", "F&B Revenue", "REVENUE")
          service_payable = ledger_account!(company, "2101", "Service Charge Payable", "LIABILITY")
          vat_payable = ledger_account!(company, "2100", "VAT Payable", "LIABILITY")
          food_modules = %w[RESTAURANT TERRACE_BAR MINIBAR]
          active_items = folio.folio_items.where(voided: false)
          food_total = active_items.where(source_module: food_modules).sum(:sub_total)
          room_total = folio.sub_total - food_total

          voucher = company.journal_entries.create!(
            voucher_number: DocumentNumbers::NextNumber.call(company:, property: default_property, document_type: "JOURNAL"),
            voucher_type: "SALES",
            posting_date: Date.current,
            nepali_date: Date.current.iso8601,
            narration:,
            total_debit: folio.grand_total,
            total_credit: folio.grand_total,
            status: "POSTED",
            source_module: "PMS_CHECKOUT",
            source_reference:
          )
          voucher.journal_lines.create!(account: cash, memo: narration, debit: folio.grand_total, credit: 0)
          voucher.journal_lines.create!(account: room_revenue, memo: narration, debit: 0, credit: room_total) if room_total.positive?
          voucher.journal_lines.create!(account: food_revenue, memo: narration, debit: 0, credit: food_total) if food_total.positive?
          voucher.journal_lines.create!(account: service_payable, memo: narration, debit: 0, credit: folio.service_charge) if folio.service_charge.positive?
          voucher.journal_lines.create!(account: vat_payable, memo: narration, debit: 0, credit: folio.tax_amount) if folio.tax_amount.positive?
          voucher
        end

        def ledger_account!(company, code, name, category)
          company.accounts.find_or_create_by!(account_code: code) { |account| account.assign_attributes(name:, category:, active: true) }
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
