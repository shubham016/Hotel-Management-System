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
      bed_category: "Single",
      bed_count: 0,
      max_adults: 2,
      max_children: 0,
      max_occupancy: 2
    )

    assert_not room_type.valid?
    assert_includes room_type.errors[:bed_count], "must be greater than 0"
  end

  test "saved capacity follows adult and child limits and booking respects each limit" do
    room_type = @property.room_types.create!(
      name: "Family", code: "FAMILY", slug: "family", base_price: 1_000,
      bed_category: "Queen", max_adults: 3, max_children: 2, max_occupancy: 3
    )

    assert_equal 5, room_type.reload.max_occupancy
    assert room_type.accommodates?(adults_count: 3, children_count: 2)
    assert_not room_type.accommodates?(adults_count: 4, children_count: 0)
    assert_not room_type.accommodates?(adults_count: 1, children_count: 3)
    assert room_type.accommodates?(adults_count: 6, children_count: 4, rooms_count: 2)

    room_type.update!(max_children: 1)
    assert_equal 4, room_type.reload.max_occupancy
    assert_not room_type.accommodates?(adults_count: 3, children_count: 2)
  end
end
