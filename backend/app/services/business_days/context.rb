module BusinessDays
  class Context
    def self.with(property)
      ActiveRecord::Base.transaction do
        key = ActiveRecord::Base.connection.quote("business-day:#{property.id}")
        ActiveRecord::Base.connection.execute("SELECT pg_advisory_xact_lock(hashtext(#{key}))")
        property.reload
        yield
      end
    end

    def self.ensure_cashier_open!(property)
      if property.cashier_closings.where(business_date: property.operating_date, status: "CLOSED").exists?
        raise ApiError.new("Cashier is closed. Close the business day or reopen the cashier before recording payments.", status: :conflict, code: "CASHIER_CLOSED")
      end
    end
  end
end
