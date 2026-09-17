class GrantOperationalBookingPermissions < ActiveRecord::Migration[8.1]
  class MigrationRole < ActiveRecord::Base
    self.table_name = "roles"
  end

  ROLE_NAMES = %w[OWNER MANAGER FRONT_DESK_STAFF].freeze

  def up
    MigrationRole.where(name: ROLE_NAMES).find_each do |role|
      permissions = role.permissions.deep_dup
      permissions["RESERVATIONS"] = (Array(permissions["RESERVATIONS"]) | [ "create" ])
      permissions["PMS_FRONTDESK"] = (Array(permissions["PMS_FRONTDESK"]) | [ "create" ])
      role.update_columns(permissions:, updated_at: Time.current)
    end
  end

  def down
    MigrationRole.where(name: ROLE_NAMES).find_each do |role|
      permissions = role.permissions.deep_dup
      permissions["RESERVATIONS"] = Array(permissions["RESERVATIONS"]) - [ "create" ]
      permissions["PMS_FRONTDESK"] = Array(permissions["PMS_FRONTDESK"]) - [ "create" ]
      role.update_columns(permissions:, updated_at: Time.current)
    end
  end
end
