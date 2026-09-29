class AddLaundryInstructionsToProperties < ActiveRecord::Migration[8.1]
  def change
    add_column :properties, :laundry_collection_instructions, :text
    add_column :properties, :laundry_return_instructions, :text
  end
end
