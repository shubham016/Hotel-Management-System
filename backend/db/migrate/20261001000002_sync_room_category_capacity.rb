class SyncRoomCategoryCapacity < ActiveRecord::Migration[8.0]
  def up
    execute <<~SQL
      UPDATE room_types
      SET max_occupancy = max_adults + max_children,
          updated_at = CURRENT_TIMESTAMP
      WHERE max_occupancy IS DISTINCT FROM max_adults + max_children
    SQL
  end

  def down
    # Corrected totals are retained; previous inconsistent totals cannot be reconstructed.
  end
end
