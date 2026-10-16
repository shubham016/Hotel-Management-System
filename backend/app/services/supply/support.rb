module Supply
  module Support
    MAX = BigDecimal("999999999999.99")
    def decimal(value, positive: false)
      number = BigDecimal(value.to_s, exception: false)
      invalid!("Enter a valid #{positive ? 'positive ' : ''}amount or quantity with at most two decimals") unless number&.finite? && number >= 0 && number <= MAX && number == number.round(2) && (!positive || number.positive?)
      number
    end
    def key(params)
      value = params.require(:idempotencyKey).to_s
      invalid!("Invalid retry identifier") unless value.match?(/\A[0-9a-f-]{36}\z/i)
      value
    end
    def digest(params, fields)
      Digest::SHA256.hexdigest(fields.sort.to_h { |field| [field, params[field]] }.to_json)
    end
    def invalid!(message, code: "INVALID_SUPPLY_REQUEST", status: :unprocessable_content)
      raise ApiError.new(message, status:, code:)
    end
    def audit(property, action, record, values)
      AuditLog.create!(company: property.company, property:, user: Current.user, module_name: "SUPPLY", action:,
        entity_type: record.class.name, entity_id: record.id, new_values: values, request_id: Current.request_id, ip_address: Current.ip_address)
    end
    def number(property, type)
      DocumentNumbers::NextNumber.call(company: property.company, property:, document_type: type)
    end
    def balance(item, store)
      item.stock_balances.create_or_find_by!(store:).tap(&:lock!)
    end
    def version!(record, params)
      invalid!("This order changed. Refresh before continuing.", code: "STALE_ORDER", status: :conflict) unless Integer(params[:version].to_s, exception: false) == record.lock_version
    end
  end
end
