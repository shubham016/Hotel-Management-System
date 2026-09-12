class PrefixDemoRoomTypeCodes < ActiveRecord::Migration[8.1]
  def up
    RoomType.where(setup_managed: false).find_each do |room_type|
      next if room_type.code.start_with?("DEMO-")

      room_type.update_columns(
        code: "DEMO-#{room_type.code}",
        slug: "demo-#{room_type.slug}"
      )
    end
  end

  def down
    RoomType.where("code LIKE ?", "DEMO-%").find_each do |room_type|
      room_type.update_columns(
        code: room_type.code.delete_prefix("DEMO-"),
        slug: room_type.slug.delete_prefix("demo-")
      )
    end
  end
end
