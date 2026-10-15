module Calendars
  # Same month-length table as the frontend converter; calendar dates never use
  # timestamp/timezone arithmetic or a fixed year offset.
  class BikramSambat
    DATA = JSON.parse(File.read(Rails.root.join("config/nepali_calendar.json"))).freeze
    MIN_YEAR = DATA.fetch("min_year")
    MAX_YEAR = DATA.fetch("max_year")
    EPOCH = Date.iso8601(DATA.fetch("epoch_ad"))
    MONTHS = DATA.fetch("months_en").freeze
    LENGTHS = DATA.fetch("month_lengths").map(&:freeze).freeze
    YEAR_OFFSETS = LENGTHS.each_with_object([0]) { |months, offsets| offsets << offsets.last + months.sum }.freeze

    def self.days_in_month(year, month)
      raise ArgumentError, "BS year must be between #{MIN_YEAR} and #{MAX_YEAR}" unless year.is_a?(Integer) && year.between?(MIN_YEAR, MAX_YEAR)
      raise ArgumentError, "BS month must be between 1 and 12" unless month.is_a?(Integer) && month.between?(1, 12)
      LENGTHS[year - MIN_YEAR][month - 1]
    end

    def self.bs_to_ad(year, month, day)
      length = days_in_month(year, month)
      raise ArgumentError, "Invalid BS day for this month" unless day.is_a?(Integer) && day.between?(1, length)
      EPOCH + YEAR_OFFSETS[year - MIN_YEAR] + LENGTHS[year - MIN_YEAR].first(month - 1).sum + day - 1
    end

    def self.ad_to_bs(date)
      date = Date.iso8601(date) if date.is_a?(String)
      raise ArgumentError, "A valid AD date is required" unless date.is_a?(Date)
      offset = (date - EPOCH).to_i
      raise ArgumentError, "Date is outside the supported BS calendar" unless offset.between?(0, YEAR_OFFSETS.last - 1)
      index = YEAR_OFFSETS.bsearch_index { |start| start > offset } - 1
      remaining = offset - YEAR_OFFSETS[index]
      month = 1
      LENGTHS[index].each do |length|
        break if remaining < length
        remaining -= length
        month += 1
      end
      { year: MIN_YEAR + index, month: month, day: remaining + 1 }
    end

    def self.iso(date)
      bs = ad_to_bs(date)
      format("%04d-%02d-%02d", bs[:year], bs[:month], bs[:day])
    end

    def self.month(value)
      raise ArgumentError, "Use a BS payroll month in YYYY-MM format" unless value.to_s.match?(/\A\d{4}-\d{2}\z/)
      year, month = value.split("-").map(&:to_i)
      start_date = bs_to_ad(year, month, 1)
      { system: "BS", period: value, label: "#{MONTHS[month - 1]} #{year} BS", start_ad: start_date.iso8601,
        end_ad: (start_date + days_in_month(year, month) - 1).iso8601 }
    end
  end
end
