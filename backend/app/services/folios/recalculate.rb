module Folios
  class Recalculate
    def self.call(folio)
      new(folio).call
    end

    def initialize(folio)
      @folio = folio
    end

    def call
      @folio.reload
      items = @folio.folio_items.where(voided: false)
      sub_total = items.sum(:sub_total)
      combined_tax = items.sum(:tax_amount)
      service_charge = items.sum { |item| tax_amount(item, "SERVICE_CHARGE") }
      vat_amount = combined_tax - service_charge
      total_paid = @folio.payments.sum(:amount)
      grand_total = sub_total + service_charge + vat_amount
      balance_due = [ grand_total - total_paid, 0 ].max
      status = if @folio.status.in?(%w[CLOSED VOID])
        @folio.status
      else
        balance_due.zero? ? "SETTLED" : "OPEN"
      end

      @folio.update!(sub_total:, service_charge:, tax_amount: vat_amount, grand_total:, total_paid:, balance_due:, status:)
      @folio
    end

    private

    def tax_amount(item, code)
      taxes = item.calculation_snapshot.to_h["taxes"] || item.calculation_snapshot.to_h[:taxes]
      return 0.to_d unless taxes

      Array(taxes).sum do |tax|
        tax = tax.with_indifferent_access
        tax[:code] == code ? BigDecimal(tax[:amount].to_s) : 0.to_d
      end
    end
  end
end
