module Payments
  class CancellationRefunds
    def self.create!(folio)
      paid = folio.payments.sum(:amount)
      return unless paid.positive?

      deduction = (paid * BigDecimal("0.10")).round(2)
      refund = folio.create_cancellation_refund!(paid_amount: paid, deduction_amount: deduction, refund_amount: paid - deduction)
      post_journal!(refund, "CANCELLATION", [ ["1001", "Cash / Bank", "ASSET", paid, 0], ["2102", "Cancellation Refunds Payable", "LIABILITY", 0, refund.refund_amount], ["4003", "Cancellation Revenue", "REVENUE", 0, deduction] ])
      refund
    end

    def self.pay!(reservation:, params:)
      Folio.transaction do
        folio = reservation.folio
        folio.lock!
        reservation.lock!
        refund = folio.cancellation_refund
        raise ApiError.new("No cancellation refund is due", status: :conflict, code: "REFUND_NOT_DUE") unless reservation.status == "CANCELLED" && refund
        refund.lock!
        return reservation.reload if refund.status == "PAID"
        unless folio.payments.sum(:amount) == refund.paid_amount
          raise ApiError.new("Additional payments require refund review before payout", status: :conflict, code: "REFUND_REVIEW_REQUIRED")
        end

        method = params[:refundMethod].to_s
        reference = params[:refundReference].to_s.strip
        unless method.in?(CancellationRefund::PAYOUT_METHODS) && reference.present?
          raise ApiError.new("A refund method and payout reference or cash receipt are required", status: :unprocessable_content, code: "INVALID_REFUND")
        end
        refund.update!(status: "PAID", payment_method: method, transaction_reference: reference, paid_at: Time.current)
        post_journal!(refund, "REFUND", [ ["2102", "Cancellation Refunds Payable", "LIABILITY", refund.refund_amount, 0], ["1001", "Cash / Bank", "ASSET", 0, refund.refund_amount] ])
        folio.update!(total_paid: folio.payments.sum(:amount) - refund.refund_amount, balance_due: 0)
        AuditLog.create!(company: folio.property.company, property: folio.property, user: Current.user, module_name: "PAYMENTS", action: "REFUND", entity_type: "CancellationRefund", entity_id: refund.id,
          new_values: { amount: refund.refund_amount.to_s, deduction: refund.deduction_amount.to_s, method:, reference: }, request_id: Current.request_id, ip_address: Current.ip_address)
      end
      reservation.reload
    end

    def self.post_journal!(refund, kind, lines)
      property = refund.folio.property
      company = property.company
      amount = lines.sum { |line| BigDecimal(line[3].to_s) }
      narration = "#{kind.titleize} - #{refund.folio.folio_number}"
      voucher = company.journal_entries.create!(property:, voucher_number: DocumentNumbers::NextNumber.call(company:, property:, document_type: "JOURNAL"), voucher_type: "JOURNAL", posting_date: property.operating_date, nepali_date: Date.current.iso8601,
        narration:, total_debit: amount, total_credit: amount, status: "POSTED", source_module: "PMS_CANCELLATION", source_reference: "PMS_#{kind}:#{refund.id}")
      lines.each do |code, name, category, debit, credit|
        next if debit.zero? && credit.zero?
        account = company.accounts.find_or_create_by!(account_code: code) { |record| record.assign_attributes(name:, category:, active: true) }
        voucher.journal_lines.create!(account:, memo: narration, debit:, credit:)
      end
    end
  end
end
