module Banquet
  class Quote
    def self.tax(company, date)
      taxes = company.tax_configurations.where(active: true, code: "VAT").for_date(date).to_a
      raise ApiError.new("Review overlapping VAT rates in Settings", status: :conflict, code: "TAX_CONFIGURATION") if taxes.size > 1
      tax = taxes.first
      tax ? { "rate" => tax.rate.to_s, "inclusive" => tax.inclusive } : {}
    end

    def self.call(hall:, catering:, tax:)
      base = hall + catering
      rate = BigDecimal(tax.fetch("rate", "0")) / 100
      if tax["inclusive"] && rate.positive?
        vat = (base - base / (1 + rate)).round(2)
        hall_net = (hall / (1 + rate)).round(2)
        { hall_net:, catering_net: base - vat - hall_net, tax_amount: vat, grand_total: base, tax_snapshot: tax }
      else
        vat = (base * rate).round(2)
        { hall_net: hall, catering_net: catering, tax_amount: vat, grand_total: base + vat, tax_snapshot: tax }
      end
    end
  end
end
