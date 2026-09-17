class AddBedCategoryToRoomTypes < ActiveRecord::Migration[8.1]
  def change
    add_column :room_types, :bed_category, :string, null: false, default: "Not specified"
  end
end
