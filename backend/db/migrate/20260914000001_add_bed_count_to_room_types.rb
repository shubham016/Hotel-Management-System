class AddBedCountToRoomTypes < ActiveRecord::Migration[8.1]
  def change
    add_column :room_types, :bed_count, :integer, null: false, default: 1
    add_check_constraint :room_types, "bed_count > 0", name: "room_types_positive_bed_count"
  end
end
