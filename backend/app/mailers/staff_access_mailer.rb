class StaffAccessMailer < ApplicationMailer
  def password_reset_requested(user:, administrator:)
    portal_url = "#{ENV.fetch('FRONTEND_PUBLIC_URL', 'http://localhost:3000').delete_suffix('/')}/admin/staff-access?user=#{user.id}"
    mail(to: administrator.email, subject: "Hotel New Era: password reset requested for #{user.full_name}") do |format|
      format.text { render plain: <<~TEXT }
        Hello #{administrator.full_name},

        #{user.full_name} (#{user.email}) has requested a staff portal password reset.
        Property: #{user.properties.pluck(:name).join(', ')}

        Verify the employee's identity before resetting their password.
        Open Staff Portal Access: #{portal_url}
        Enter a replacement password of at least 12 characters and save access.
        Share the replacement password privately with this employee.

        The employee can sign in and select My Profile to choose their own password.
        Existing sign-in sessions are revoked when the password is reset.

        If the employee did not request this, leave their password unchanged.
      TEXT
    end
  end
end
