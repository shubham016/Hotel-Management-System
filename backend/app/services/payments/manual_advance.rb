module Payments
  class ManualAdvance
    def self.call(reservation:, params:)
      amount = BigDecimal(params[:amount].to_s, exception: false)
      method = params[:paymentMethod].to_s
      reference = params[:transactionRef].to_s.strip
      key = params[:idempotencyKey].to_s
      unless amount&.finite? && amount.positive? && amount == amount.round(2) && method.in?(%w[CASH BANK_TRANSFER]) && key.match?(/\A[0-9a-f-]{36}\z/i)
        raise ApiError.new("Enter a valid cash/bank advance amount and payment identifier", status: :unprocessable_content, code: "INVALID_PAYMENT")
      end
      if method == "BANK_TRANSFER" && reference.blank?
        raise ApiError.new("Bank transfer reference is required", status: :unprocessable_content, code: "INVALID_PAYMENT")
      end
      Folio.transaction do
        folio = reservation.folio
        folio.lock!
        reservation.lock!
        existing = folio.payments.find_by(idempotency_key: key)
        if existing
          unless existing.amount == amount && existing.payment_method == method && existing.transaction_reference.to_s == reference
            raise ApiError.new("This payment identifier was already used for another amount", status: :conflict, code: "PAYMENT_CONFLICT")
          end
          return existing
        end
        unless reservation.status.in?(%w[INQUIRY CONFIRMED]) && folio.status.in?(%w[OPEN SETTLED])
          raise ApiError.new("Only bookings awaiting check-in can receive an advance", status: :conflict, code: "PAYMENT_NOT_ALLOWED")
        end
        raise ApiError.new("Verify the gateway payment before recording an advance", status: :conflict, code: "PAYMENT_IN_PROGRESS") if folio.payment_requests.where(status: "INITIATED").exists?
        raise ApiError.new("Advance cannot exceed the remaining balance", status: :unprocessable_content, code: "PAYMENT_EXCEEDS_BALANCE") if amount > folio.balance_due
        if method == "BANK_TRANSFER" && folio.payments.where(payment_method: method, transaction_reference: reference).exists?
          raise ApiError.new("This bank transfer has already been recorded", status: :conflict, code: "PAYMENT_CONFLICT")
        end
        folio.payment_requests.where(status: "PENDING").update_all(status: "FAILED", updated_at: Time.current)
        payment = folio.payments.create!(receipt_number: DocumentNumbers::NextNumber.call(company: folio.property.company, property: folio.property, document_type: "PAYMENT"), payment_method: method, amount:, transaction_reference: reference, idempotency_key: key, paid_at: Time.current, notes: "Booking advance received before check-in")
        Folios::Recalculate.call(folio)
        reservation.update!(advance_paid: reservation.advance_paid + amount)
        AuditLog.create!(company: folio.property.company, property: folio.property, user: Current.user, module_name: "PAYMENTS", action: "ADVANCE", entity_type: "Payment", entity_id: payment.id, new_values: { reservation_id: reservation.id, amount: amount.to_s, method:, reference: }, request_id: Current.request_id, ip_address: Current.ip_address)
        payment
      end
    rescue ActiveRecord::RecordNotUnique
      raise ApiError.new("This payment identifier was already used", status: :conflict, code: "PAYMENT_CONFLICT")
    end
  end
end
