module Access
  class PasswordResetRequests
    MESSAGE = "If this is an active staff account, a password reset request has been sent to your hotel administrator."
    COOLDOWN = 5.minutes

    def self.administrators_for(user)
      user.company.users.active_scope.joins(:role, :user_properties)
        .where(roles: { name: %w[OWNER ADMIN SUPER_ADMIN] }, user_properties: { property_id: user.properties.where(active: true).select(:id) })
        .where.not(id: user.id).distinct
    end

    def self.call(email:)
      user = User.active_scope.includes(:role).find_by("lower(email) = ?", email.to_s.strip.downcase)
      return unless user&.login_enabled? && !user.role.name.in?(%w[OWNER SUPER_ADMIN])

      requested_at = nil
      user.with_lock do
        return unless user.login_enabled?
        return if user.password_reset_requested_at && user.password_reset_requested_at > COOLDOWN.ago
        recipients = administrators_for(user).to_a
        return if recipients.empty?

        requested_at = Time.current
        user.update!(password_reset_requested_at: requested_at, password_reset_email_status: "QUEUED")
        recipients.each do |administrator|
          administrator.notifications.create!(title: "Password reset requested: #{user.full_name}",
            message: "#{user.full_name} (#{user.email}) requested a password reset. Verify the employee's identity, then set a replacement password in Staff Portal Access and share it privately. They can choose their own password in My Profile.",
            channel: "IN_APP", action_url: "/admin/staff-access?user=#{user.id}")
        end
      end
      StaffPasswordResetEmailJob.perform_later(user.id, requested_at.iso8601(6))
    end
  end
end
