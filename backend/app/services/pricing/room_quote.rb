module Pricing
  class RoomQuote
    Result = Data.define(
      :nights,
      :rooms_count,
      :nightly_rate,
      :room_total,
      :add_on_total,
      :sub_total,
      :service_charge,
      :vat_amount,
      :grand_total,
      :add_on_lines,
      :tax_lines
    )

    def self.call(property:, room_type:, rate_plan:, check_in_date:, check_out_date:, rooms_count:, adults_count:, add_on_codes:)
      new(
        property:,
        room_type:,
        rate_plan:,
        check_in_date:,
        check_out_date:,
        rooms_count:,
        adults_count:,
        add_on_codes:
      ).call
    end

    def initialize(property:, room_type:, rate_plan:, check_in_date:, check_out_date:, rooms_count:, adults_count:, add_on_codes:)
      @property = property
      @room_type = room_type
      @rate_plan = rate_plan
      @check_in_date = check_in_date
      @check_out_date = check_out_date
      @rooms_count = rooms_count
      @adults_count = adults_count
      @add_on_codes = Array(add_on_codes).map { |code| code.to_s.upcase }.uniq
    end

    def call
      nights = (@check_out_date - @check_in_date).to_i
      nightly_rate = @room_type.base_price + (@rate_plan&.price_modifier || 0)
      room_total = nightly_rate * nights * @rooms_count
      add_on_lines = calculate_add_ons(nights)
      add_on_total = add_on_lines.sum { |line| line[:total] }
      sub_total = room_total + add_on_total
      tax_lines = calculate_taxes(sub_total)
      service_charge = tax_lines.filter { |line| line[:code] == "SERVICE_CHARGE" }.sum { |line| line[:amount] }
      vat_amount = tax_lines.reject { |line| line[:code] == "SERVICE_CHARGE" }.sum { |line| line[:amount] }

      Result.new(
        nights:,
        rooms_count: @rooms_count,
        nightly_rate:,
        room_total:,
        add_on_total:,
        sub_total:,
        service_charge:,
        vat_amount:,
        grand_total: sub_total + service_charge + vat_amount,
        add_on_lines:,
        tax_lines:
      )
    end

    private

    def calculate_add_ons(nights)
      @property.service_offerings.where(active: true, code: @add_on_codes).order(:code).map do |offering|
        quantity = case offering.pricing_unit
        when "PER_NIGHT" then nights
        when "PER_GUEST_PER_NIGHT" then nights * @adults_count
        else 1
        end

        {
          id: offering.id,
          code: offering.code,
          name: offering.name,
          quantity:,
          unit_price: offering.unit_price,
          total: offering.unit_price * quantity,
          taxable: offering.taxable
        }
      end
    end

    def calculate_taxes(taxable_total)
      running_total = taxable_total

      @property.company.tax_configurations.for_rooms.for_date(@check_in_date).map do |tax|
        amount = tax.inclusive ? 0.to_d : (running_total * tax.rate / 100).round(2)
        running_total += amount
        { code: tax.code, name: tax.name, rate: tax.rate, amount:, inclusive: tax.inclusive }
      end
    end
  end
end
