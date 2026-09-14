require "test_helper"

class RoomTypeTest < ActiveSupport::TestCase
  setup do
    company = Company.create!(name: "Room Type Test Group", slug: "room-type-test-group")
    @property = company.properties.create!(name: "Room Type Test Hotel", code: "ROOM-TYPE-TEST")
  end

  test "requires a positive bed count" do
    room_type = @property.room_types.build(
      name: "Invalid Bed Count",
      code: "INVALID-BEDS",
      slug: "invalid-beds",
      base_price: 1_000,
      bed_count: 0,
      max_adults: 2,
      max_children: 0,
      max_occupancy: 2
    )

    assert_not room_type.valid?
    assert_includes room_type.errors[:bed_count], "must be greater than 0"
  end
end
