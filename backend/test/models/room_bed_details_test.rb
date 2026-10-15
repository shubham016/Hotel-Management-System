require "test_helper"

class RoomBedDetailsTest < ActiveSupport::TestCase
  setup do
    company = Company.create!(name: "Bed Details Test", slug: "bed-details-test")
    @property = company.properties.create!(name: "Bed Details", code: "BED-DETAILS")
    @type = @property.room_types.create!(name: "Suite", code: "SUITE", slug: "suite", base_price: 5000, bed_category: "Not specified", bed_count: 1, setup_managed: true)
    @room = @property.rooms.create!(room_type: @type, room_number: "301", floor: 3, setup_managed: true)
  end

  test "legacy rooms retain category defaults and complete physical details override them" do
    assert_equal "1 bed", @room.bed_label
    @room.update!(bed_category: "King — custom size", bed_count: 1, bed_length_inches: 78, bed_width_inches: 78)
    assert_equal "1 King — custom size bed (6.5 × 6.5 ft)", @room.reload.bed_label
    assert_equal @room.bed_label, @type.bed_label
    assert_equal 5000, @type.reload.base_price
    assert_equal 78, @room.bed_details[:bedWidthInches]
  end

  test "mixed categories describe variation without promising the wrong bed" do
    @room.update!(bed_category: "Queen", bed_count: 2, bed_length_inches: 78, bed_width_inches: 60)
    @property.rooms.create!(room_type: @type, room_number: "302", floor: 3, setup_managed: true, bed_category: "Single — wide", bed_count: 3, bed_length_inches: 78, bed_width_inches: 42)
    assert_includes @type.bed_label, "Beds vary by room"
    assert_equal "2–3", @type.bed_count_label
    assert_equal "2 Queen beds (6.5 × 5 ft)", @room.bed_label
  end

  test "partial zero negative and fractional bed details fail validation" do
    @room.assign_attributes(bed_category: "Queen")
    assert_not @room.valid?
    @room.assign_attributes(bed_count: 1, bed_length_inches: 78, bed_width_inches: 60)
    assert @room.valid?
    [0, -1, 1.5].each do |invalid|
      @room.bed_count = invalid
      assert_not @room.valid?
    end
    @room.bed_count = 1
    @room.bed_width_inches = 0
    assert_not @room.valid?
  end
end
