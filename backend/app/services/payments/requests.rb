module Payments
  class Requests
    def self.create!(folio:, kind:, amount:)
      raise ApiError.new("No online payment gateway is configured yet", status: :unprocessable_content, code: "GATEWAY_UNAVAILABLE") unless Gateway.available.value?(true)

      amount = BigDecimal(amount.to_s)
      Folio.transaction do
        folio.lock!
        reservation = folio.reservation
        allowed = kind == "ADVANCE" ? reservation.status.in?(%w[INQUIRY CONFIRMED]) : reservation.status == "CHECKED_IN"
        raise ApiError.new("This booking cannot accept this payment", status: :conflict, code: "PAYMENT_NOT_ALLOWED") unless allowed && folio.status.in?(%w[OPEN SETTLED])
        raise ApiError.new("Amount must be positive and no more than the balance due", status: :unprocessable_content, code: "INVALID_PAYMENT") unless amount.positive? && amount <= folio.balance_due
        raise ApiError.new("A payment is already in progress for this folio", status: :conflict, code: "PAYMENT_IN_PROGRESS") if folio.payment_requests.where(status: "INITIATED").exists?

        folio.payment_requests.where(status: "PENDING").update_all(status: "FAILED", updated_at: Time.current)
        payment_request = folio.payment_requests.create!(kind:, amount:, public_token: SecureRandom.hex(32), expires_at: 1.hour.from_now)
        AuditLog.create!(company: folio.property.company, property: folio.property, user: Current.user, module_name: "PAYMENTS", action: "CREATE", entity_type: "PaymentRequest", entity_id: payment_request.id,
          new_values: { kind:, amount: amount.to_s, folio_id: folio.id }, request_id: Current.request_id, ip_address: Current.ip_address)
        payment_request
      end
    rescue ArgumentError
      raise ApiError.new("Invalid payment amount", status: :unprocessable_content, code: "INVALID_PAYMENT")
    end

    def self.start!(request, gateway)
      Folio.transaction do
        folio = request.folio
        folio.lock!
        request.lock!
        raise ApiError.new("Payment request expired", status: :conflict, code: "PAYMENT_EXPIRED") if request.expired?
        raise ApiError.new("Payment already completed", status: :conflict, code: "PAYMENT_COMPLETED") if request.status == "COMPLETED"
        raise ApiError.new("Failed payment requests cannot be reused", status: :conflict, code: "PAYMENT_FAILED") if request.status == "FAILED"
        raise ApiError.new("A different gateway was already selected", status: :conflict, code: "GATEWAY_LOCKED") if request.gateway.present? && request.gateway != gateway
        raise ApiError.new("A payment is already in progress", status: :conflict, code: "PAYMENT_IN_PROGRESS") if request.status == "INITIATED" && gateway == "KHALTI"
        allowed = request.kind == "ADVANCE" ? folio.reservation.status.in?(%w[INQUIRY CONFIRMED CHECKED_IN]) : folio.reservation.status == "CHECKED_IN"
        raise ApiError.new("This folio can no longer accept payment", status: :conflict, code: "PAYMENT_NOT_ALLOWED") unless allowed && folio.status.in?(%w[OPEN SETTLED]) && request.amount <= folio.balance_due

        result = Gateway.start(request, gateway)
        request.update!(gateway:, gateway_reference: result.fetch(:reference), gateway_url: result.fetch(:url), status: "INITIATED")
        AuditLog.create!(company: folio.property.company, property: folio.property, user: Current.user, module_name: "PAYMENTS", action: "INITIATE", entity_type: "PaymentRequest", entity_id: request.id,
          new_values: { gateway:, amount: request.amount.to_s }, request_id: Current.request_id, ip_address: Current.ip_address)
        result.except(:reference)
      end
    end

    def self.verify!(request)
      return request if request.status == "COMPLETED"
      raise ApiError.new("Payment has not been started", status: :conflict, code: "PAYMENT_NOT_STARTED") if request.gateway.blank?

      result = Gateway.verify(request)
      if result[:complete]
        Folio.transaction do
          folio = request.folio
          folio.lock!
          request.lock!
          return request if request.status == "COMPLETED"

          payment = folio.payments.create!(
            receipt_number: DocumentNumbers::NextNumber.call(company: folio.property.company, property: folio.property, document_type: "PAYMENT"),
            payment_method: request.gateway,
            amount: request.amount,
            transaction_reference: result[:transaction_id].presence || request.gateway_reference,
            notes: "Verified #{request.gateway} #{request.kind.downcase} payment",
            paid_at: Time.current
          )
          Folios::Recalculate.call(folio)
          if request.kind == "ADVANCE"
            reservation = folio.reservation
            reservation.update!(advance_paid: reservation.advance_paid + request.amount)
          end
          request.update!(status: "COMPLETED", gateway_transaction_id: result[:transaction_id].presence || request.gateway_reference, payment:)
          AuditLog.create!(company: folio.property.company, property: folio.property, user: Current.user, module_name: "PAYMENTS", action: "VERIFY", entity_type: "Payment", entity_id: payment.id,
            new_values: { payment_request_id: request.id, gateway: request.gateway, amount: request.amount.to_s, receipt_number: payment.receipt_number }, request_id: Current.request_id, ip_address: Current.ip_address)
        end
      elsif result[:failed]
        request.with_lock { request.update!(status: "FAILED") unless request.status == "COMPLETED" }
      end
      request.reload
    end
  end
end
