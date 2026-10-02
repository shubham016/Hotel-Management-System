module Pricing
  class RoomQuote
    Result = Data.define(
      :nights,
      :rooms_count,
      :nightly_rate,
      :room_total,
      :add_on_total,
      :sub_total,
      :vat_amount,
      :grand_total,
      :add_on_lines,
      :tax_lines
    )

    def self.call(property:, room_type:, rate_plan:, check_in_date:, check_out_date:, rooms_count:, adults_count:, children_count: 0, add_on_codes:, nightly_rate: nil, add_on_prices: {})
      new(
        property:,
        room_type:,
        rate_plan:,
        check_in_date:,
        check_out_date:,
        rooms_count:,
        adults_count:,
        children_count:,
        add_on_codes:,
        nightly_rate:,
        add_on_prices:
      ).call
    end

    def initialize(property:, room_type:, rate_plan:, check_in_date:, check_out_date:, rooms_count:, adults_count:, children_count:, add_on_codes:, nightly_rate: nil, add_on_prices: {})
      @property = property
      @room_type = room_type
      @rate_plan = rate_plan
      @check_in_date = check_in_date
      @check_out_date = check_out_date
      @rooms_count = rooms_count
      @adults_count = adults_count
      @children_count = children_count
      @add_on_codes = Array(add_on_codes).map { |code| code.to_s.upcase }.uniq
      @nightly_rate = nightly_rate
      @add_on_prices = add_on_prices
    end

    def call
      nights = (@check_out_date - @check_in_date).to_i
      nightly_rate = @nightly_rate || @room_type.base_price + (@rate_plan&.price_modifier || 0)
      room_total = nightly_rate * nights * @rooms_count
      add_on_lines = calculate_add_ons(nights)
      add_on_total = add_on_lines.sum { |line| line[:total] }
      sub_total = room_total + add_on_total
      taxable_total = room_total + add_on_lines.select { |line| line[:taxable] }.sum { |line| line[:total] }
      tax_lines = calculate_taxes(taxable_total)
      vat_amount = tax_lines.sum { |line| line[:amount] }

      Result.new(
        nights:,
        rooms_count: @rooms_count,
        nightly_rate:,
        room_total:,
        add_on_total:,
        sub_total:,
        vat_amount:,
        grand_total: sub_total + vat_amount,
        add_on_lines:,
        tax_lines:
      )
    end

    private

    def calculate_add_ons(nights)
      @property.service_offerings.where(active: true, code: @add_on_codes).order(:code).map do |offering|
        quantity = case offering.pricing_unit
        when "PER_NIGHT" then nights
        when "PER_GUEST" then @adults_count + @children_count
        when "PER_GUEST_PER_NIGHT" then nights * (@adults_count + @children_count)
        else 1
        end

        unit_price = @add_on_prices.fetch(offering.id, offering.unit_price)
        {
          id: offering.id,
          code: offering.code,
          name: offering.name,
          quantity:,
          unit_price:,
          total: unit_price * quantity,
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
