module Access
  class StaffRoles
    LABELS = {
      "OWNER" => "Owner", "ADMIN" => "All-rounder / Admin",
      "FRONT_DESK_STAFF" => "Front Desk", "HOUSEKEEPING" => "Housekeeping / Cleaning",
      "RESTAURANT" => "Restaurant", "KITCHEN" => "Kitchen Cook / Helper"
    }.freeze
    COMMON = { "SESSIONS" => %w[read], "NOTIFICATIONS" => %w[read update] }.freeze
    PERMISSIONS = {
      "OWNER" => {}, "ADMIN" => {},
      "FRONT_DESK_STAFF" => COMMON.merge(
        "DASHBOARD" => %w[read], "ROOMS" => %w[read update],
        "RESERVATIONS" => %w[read create update cancel advance assign_room check_in extend_stay transfer_room],
        "PMS_FRONTDESK" => %w[read create check_in extend_stay transfer_room],
        "FOLIOS" => %w[create], "CHECKOUT" => %w[create], "GUESTS" => %w[read create],
        "AVAILABILITY" => %w[read]
      ),
      "HOUSEKEEPING" => COMMON.merge("TASKS" => %w[read create]),
      "RESTAURANT" => COMMON.merge("TABLES" => %w[read], "MENU_ITEMS" => %w[read], "BILLING" => %w[create], "KITCHEN_ORDERS" => %w[read create update]),
      "KITCHEN" => COMMON.merge("KITCHEN_ORDERS" => %w[read update])
    }.freeze

    def self.install!(company)
      PERMISSIONS.each do |name, permissions|
        company.roles.find_or_initialize_by(name:).update!(system: true, permissions:)
      end
    end
  end
end
