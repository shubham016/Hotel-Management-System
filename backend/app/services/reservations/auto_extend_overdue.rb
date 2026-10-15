module Reservations
  class AutoExtendOverdue
    # Overnight billing is separate from the property's checkout deadline.
    # Before 02:06, departures from yesterday can still be resolved by staff.
    def self.call(property: nil, now: Time.current)
      now = now.in_time_zone
      cutoff = now.to_date - (now >= now.change(hour: 2, min: 6, sec: 0) ? 1 : 2).days
      scope = Reservation.joins(:property).where(status: "CHECKED_IN", properties: { active: true }).where("check_out_date <= ?", cutoff)
      scope = scope.where(property:) if property
      result = { extended: 0, conflicts: 0, posted: 0.to_d }
      scope.find_each do |reservation|
        begin
          BusinessDays::Context.with(reservation.property) do
            # Use the same inventory lock as booking and manual extension.
            reservation.reservation_rooms.order(:room_type_id).pluck(:room_type_id).uniq.each do |type_id|
              key = ActiveRecord::Base.connection.quote("reservation:#{reservation.property_id}:#{type_id}")
              ActiveRecord::Base.connection.execute("SELECT pg_advisory_xact_lock(hashtext(#{key}))")
            end
            # Checkout locks the folio first. Follow that order and recheck state.
            folio = reservation.folio
            folio.lock!
            reservation.lock!
            next unless reservation.status == "CHECKED_IN" && folio.status.in?(%w[OPEN SETTLED]) && reservation.check_out_date <= cutoff

            nights = (cutoff + 1.day - reservation.check_out_date).to_i
            before = folio.grand_total
            Lifecycle.extend_stay(reservation:, params: { additionalNights: nights, reason: "Automatic overnight extension: guest has not checked out", automatic: true })
            result[:posted] += folio.reload.grand_total - before
            result[:extended] += 1
            notify(reservation, cutoff, conflict: false)
          end
        rescue ApiError => error
          # Never overwrite an incoming booking or silently create an overlap.
          # The overdue occupancy hold remains until staff resolve the conflict.
          notify(reservation.reload, cutoff, conflict: true, detail: error.message)
          result[:conflicts] += 1
        end
      end
      result
    end

    def self.notify(reservation, date, conflict:, detail: nil)
      property = reservation.property
      recipients = property.company.users.active_scope.joins(:role).includes(:role).left_joins(:user_properties)
        .where("roles.name = 'SUPER_ADMIN' OR user_properties.property_id = ?", property.id).distinct
      recipients.each do |user|
        next unless user.role.name == "SUPER_ADMIN" || user.role.allows?("RESERVATIONS", "read") || user.role.allows?("PMS_FRONTDESK", "read")

        url = "/admin/pms/frontdesk?folio=#{reservation.folio.folio_number}&overstay=#{date}&result=#{conflict ? 'conflict' : 'extended'}"
        user.notifications.find_or_create_by!(action_url: url) do |notification|
          notification.title = conflict ? "Overstay needs attention" : "Stay automatically extended"
          notification.message = conflict ? "#{reservation.confirmation_number}: #{detail} Room remains occupied. Resolve the extension or incoming room assignment." : "#{reservation.guest.full_name}'s stay now ends #{reservation.check_out_date}. Night count and folio charges have been updated."
          notification.channel = "IN_APP"
        end
      end
    end
    private_class_method :notify
  end
end
