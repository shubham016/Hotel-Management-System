class AddSetupManagedToHotelInventory < ActiveRecord::Migration[8.1]
  def change
    add_column :room_types, :setup_managed, :boolean, null: false, default: false
    add_column :rooms, :setup_managed, :boolean, null: false, default: false
    add_index :room_types, %i[property_id setup_managed]
    add_index :rooms, %i[property_id setup_managed]
  end
end
