class AddStaffPortals < ActiveRecord::Migration[8.0]
  def up
    add_reference :users, :staff_member, type: :uuid, foreign_key: true, index: { unique: true }
    Company.find_each { |company| Access::StaffRoles.install!(company) }
  end

  def down
    remove_reference :users, :staff_member, foreign_key: true
  end
end
