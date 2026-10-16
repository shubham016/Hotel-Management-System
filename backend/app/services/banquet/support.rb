module Banquet
  module Support
    MAX_AMOUNT = BigDecimal("999999999999.99")
    def money(value, positive: false)
      number = BigDecimal(value.to_s, exception: false)
      invalid!("Enter a valid amount with at most two decimals") unless number&.finite? && number >= 0 && number <= MAX_AMOUNT && number == number.round(2) && (!positive || number.positive?)
      number
    end

    def retry_key(params)
      key = params.require(:idempotencyKey).to_s
      invalid!("Invalid retry identifier") unless key.match?(/\A[0-9a-f-]{36}\z/i)
      key
    end

    def digest(params, fields)
      Digest::SHA256.hexdigest(fields.sort.to_h { |key| [key, params[key]] }.to_json)
    end

    def invalid!(message, code: "INVALID_EVENT", status: :unprocessable_content)
      raise ApiError.new(message, status:, code:)
    end

    def audit(booking, action, values)
      AuditLog.create!(company: booking.property.company, property: booking.property, user: Current.user,
        module_name: "BANQUET", action:, entity_type: "BanquetBooking", entity_id: booking.id,
        new_values: values, request_id: Current.request_id, ip_address: Current.ip_address)
    end
  end
end
