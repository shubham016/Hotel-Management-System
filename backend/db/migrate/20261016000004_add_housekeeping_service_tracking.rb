class AddHousekeepingServiceTracking < ActiveRecord::Migration[8.1]
  def change
    add_column :housekeeping_tasks, :service_date, :date
    add_reference :housekeeping_tasks, :assigned_staff_member, type: :uuid, foreign_key: { to_table: :staff_members }
    add_reference :housekeeping_tasks, :completed_by, type: :uuid, foreign_key: { to_table: :users }
    add_index :housekeeping_tasks, [:room_id, :service_date], unique: true, where: "task_type = 'STAYOVER'", name: "index_daily_stayover_service"
  end
end
