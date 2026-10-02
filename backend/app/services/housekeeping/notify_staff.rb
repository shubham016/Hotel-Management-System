module Housekeeping
  class NotifyStaff
    def self.call(room:, task:)
      recipients = room.property.company.users.active_scope.joins(:role).includes(:role)
        .left_joins(:user_properties)
        .where("roles.name = 'SUPER_ADMIN' OR user_properties.property_id = ?", room.property_id).distinct
      recipients.each do |user|
        next unless user.role.name == "SUPER_ADMIN" || user.role.allows?("TASKS", "read") || user.role.allows?("HOUSEKEEPING", "view")

        user.notifications.find_or_create_by!(action_url: "/admin/housekeeping?task=#{task.id}") do |notification|
          notification.title = task.task_type == "CLEANING" ? "Room needs cleaning" : "Room needs inspection"
          notification.message = "Room ##{room.room_number} at #{room.property.name} needs #{task.task_type.downcase}. Update the housekeeping queue when finished."
          notification.channel = "IN_APP"
        end
      end
    end
  end
end
