class GrantFrontDeskCheckinPermission < ActiveRecord::Migration[8.0]
  ROLE_NAMES = %w[OWNER MANAGER FRONT_DESK_STAFF].freeze

  def up
    Role.where(name: ROLE_NAMES).find_each do |role|
      permissions = role.permissions || {}
      permissions["PMS_FRONTDESK"] = Array(permissions["PMS_FRONTDESK"]) | [ "check_in" ]
      role.update_columns(permissions:, updated_at: Time.current)
    end
  end

  def down
    Role.where(name: ROLE_NAMES).find_each do |role|
      permissions = role.permissions || {}
      permissions["PMS_FRONTDESK"] = Array(permissions["PMS_FRONTDESK"]) - [ "check_in" ]
      role.update_columns(permissions:, updated_at: Time.current)
    end
  end
end
