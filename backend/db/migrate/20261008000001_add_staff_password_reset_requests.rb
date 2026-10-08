class AddStaffPasswordResetRequests < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :password_reset_requested_at, :datetime
    add_column :users, :password_reset_email_status, :string
  end
end
