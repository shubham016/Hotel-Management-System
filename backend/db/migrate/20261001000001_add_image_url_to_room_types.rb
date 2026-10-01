class AddImageUrlToRoomTypes < ActiveRecord::Migration[8.0]
  def change
    add_column :room_types, :image_url, :text
  end
end
