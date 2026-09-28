module Reservations
  class NotifyFrontDesk
    def self.call(reservation:)
      return unless reservation.source == "ONLINE"

      property = reservation.property
      recipients = property.company.users.active_scope.joins(:role).includes(:role)
        .left_joins(:user_properties)
        .where("roles.name = 'SUPER_ADMIN' OR user_properties.property_id = ?", property.id)
        .distinct
      action_url = "/admin/pms/reservations?reservation=#{reservation.id}"
      room_type_name = reservation.reservation_rooms.first.room_type.name
      message = "#{reservation.guest.full_name} booked #{room_type_name} at #{property.name} for #{reservation.check_in_date.iso8601}. Confirmation: #{reservation.confirmation_number}. Review and confirm the booking."

      recipients.each do |user|
        next unless user.role.name == "SUPER_ADMIN" || user.role.allows?("RESERVATIONS", "read")

        user.notifications.find_or_create_by!(action_url:) do |notification|
          notification.title = "New online booking"
          notification.message = message
          notification.channel = "IN_APP"
        end
      end
    end
  end
end
