class PrefixDemoRoomNumbers < ActiveRecord::Migration[8.1]
  def up
    Room.where(setup_managed: false).find_each do |room|
      next if room.room_number.start_with?("DEMO-")

      room.update_columns(room_number: "DEMO-#{room.room_number}")
    end
  end

  def down
    Room.where("room_number LIKE ?", "DEMO-%").find_each do |room|
      room.update_columns(room_number: room.room_number.delete_prefix("DEMO-"))
    end
  end
end
