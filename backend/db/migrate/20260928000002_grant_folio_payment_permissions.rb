class GrantFolioPaymentPermissions < ActiveRecord::Migration[8.0]
  ROLE_NAMES = %w[MANAGER FRONT_DESK_STAFF].freeze

  def up
    Role.where(name: ROLE_NAMES).find_each do |role|
      permissions = role.permissions.deep_dup
      permissions["FOLIOS"] = Array(permissions["FOLIOS"]) | [ "create" ]
      role.update_columns(permissions:, updated_at: Time.current)
    end
  end

  def down
    Role.where(name: ROLE_NAMES).find_each do |role|
      permissions = role.permissions.deep_dup
      permissions["FOLIOS"] = Array(permissions["FOLIOS"]) - [ "create" ]
      role.update_columns(permissions:, updated_at: Time.current)
    end
  end
end
