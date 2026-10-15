require "test_helper"

class BikramSambatTest < ActiveSupport::TestCase
  Calendar = Calendars::BikramSambat

  test "2083 dates match the Government of Nepal published holiday dates" do
    # Source: https://eg.nepalembassy.gov.np/pages/holidays/
    { "2026-04-14" => [2083, 1, 1], "2026-05-26" => [2083, 2, 12], "2026-06-17" => [2083, 3, 3],
      "2026-07-23" => [2083, 4, 7], "2026-08-26" => [2083, 5, 10], "2026-10-06" => [2083, 6, 20],
      "2026-10-11" => [2083, 6, 25], "2026-10-20" => [2083, 7, 3], "2026-10-21" => [2083, 7, 4],
      "2026-11-08" => [2083, 7, 22], "2026-11-11" => [2083, 7, 25], "2026-11-15" => [2083, 7, 29],
      "2027-03-21" => [2083, 12, 7] }.each do |ad, (year, month, day)|
      assert_equal({ year: year, month: month, day: day }, Calendar.ad_to_bs(ad))
      assert_equal ad, Calendar.bs_to_ad(year, month, day).iso8601
    end
  end

  test "payroll periods follow full BS months and cross Gregorian months accurately" do
    assert_equal({ system: "BS", period: "2083-06", label: "Ashwin 2083 BS", start_ad: "2026-09-17", end_ad: "2026-10-17" }, Calendar.month("2083-06"))
    assert_equal "2026-04-14", Calendar.month("2083-01")[:start_ad]
    assert_equal "2027-04-13", Calendar.month("2083-12")[:end_ad]
    assert_equal "2027-04-14", Calendar.month("2084-01")[:start_ad]
    assert_equal "2083-06-23", Calendar.iso(Date.new(2026, 10, 9))
  end

  test "all supported month boundaries and Gregorian leap day round trip" do
    (Calendar::MIN_YEAR..Calendar::MAX_YEAR).each do |year|
      (1..12).each do |month|
        first = Calendar.bs_to_ad(year, month, 1)
        last_day = Calendar.days_in_month(year, month)
        last = Calendar.bs_to_ad(year, month, last_day)
        assert_equal({ year: year, month: month, day: 1 }, Calendar.ad_to_bs(first))
        assert_equal({ year: year, month: month, day: last_day }, Calendar.ad_to_bs(last))
        assert_equal last_day, (last - first).to_i + 1
      end
    end
    leap_day = Date.new(2024, 2, 29)
    bs = Calendar.ad_to_bs(leap_day)
    assert_equal leap_day, Calendar.bs_to_ad(bs[:year], bs[:month], bs[:day])
  end

  test "invalid unsupported and overflowing dates are rejected" do
    %w[2083-00 2083-13 2083-6 1974-01 2101-01 invalid].each { |value| assert_raises(ArgumentError) { Calendar.month(value) } }
    assert_raises(ArgumentError) { Calendar.bs_to_ad(2083, 6, 32) }
    assert_raises(ArgumentError) { Calendar.bs_to_ad(2083, 6, 0) }
    assert_raises(ArgumentError) { Calendar.ad_to_bs("2026-02-30") }
    assert_raises(ArgumentError) { Calendar.ad_to_bs(Calendar::EPOCH - 1) }
    assert_raises(ArgumentError) { Calendar.ad_to_bs(Calendar::EPOCH + Calendar::YEAR_OFFSETS.last) }
  end
end
