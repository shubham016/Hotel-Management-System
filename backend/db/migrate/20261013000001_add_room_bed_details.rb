class AddRoomBedDetails < ActiveRecord::Migration[8.1]
  def change
    add_column :rooms, :bed_category, :string
    add_column :rooms, :bed_count, :integer
    add_column :rooms, :bed_length_inches, :integer
    add_column :rooms, :bed_width_inches, :integer
    add_check_constraint :rooms, "(bed_category IS NULL AND bed_count IS NULL AND bed_length_inches IS NULL AND bed_width_inches IS NULL) OR (bed_category IS NOT NULL AND length(trim(bed_category)) > 0 AND bed_count IS NOT NULL AND bed_count > 0 AND bed_length_inches IS NOT NULL AND bed_length_inches > 0 AND bed_width_inches IS NOT NULL AND bed_width_inches > 0)", name: "rooms_complete_bed_details"
  end
end
