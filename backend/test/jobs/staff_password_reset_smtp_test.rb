require "test_helper"
require "socket"
require "thread"

class StaffPasswordResetSmtpTest < ActiveSupport::TestCase
  test "reset notification reaches an administrator over SMTP and records successful delivery" do
    company = Company.create!(name: "SMTP Test", slug: "smtp-test")
    property = company.properties.create!(name: "SMTP Test Hotel", code: "SMTP-TEST")
    Access::StaffRoles.install!(company)
    owner = company.users.create!(role: company.roles.find_by!(name: "OWNER"), email: "smtp-owner@example.test", first_name: "SMTP", last_name: "Owner", password: "SMTP-Owner-Test-2026!")
    staff = company.users.create!(role: company.roles.find_by!(name: "FRONT_DESK_STAFF"), email: "smtp-staff@example.test", first_name: "SMTP", last_name: "Staff", password: "SMTP-Staff-Test-2026!")
    [owner, staff].each { |user| user.user_properties.create!(property: property) }
    requested = Time.current.change(usec: 0)
    staff.update!(password_reset_requested_at: requested, password_reset_email_status: "QUEUED")
    server = TCPServer.new("127.0.0.1", 0)
    messages = Queue.new
    worker = Thread.new do
      socket = server.accept
      socket.write("220 local-test SMTP ready\r\n")
      data = false
      message = +""
      while (line = socket.gets)
        if data
          if line == ".\r\n"
            messages << message
            data = false
            socket.write("250 Message accepted\r\n")
          else
            message << line
          end
        elsif line.start_with?("EHLO", "HELO", "MAIL FROM", "RCPT TO", "RSET")
          socket.write("250 OK\r\n")
        elsif line.start_with?("DATA")
          data = true
          socket.write("354 End with a dot\r\n")
        elsif line.start_with?("QUIT")
          socket.write("221 Bye\r\n")
          break
        end
      end
      socket.close
    end
    previous_method = ActionMailer::Base.delivery_method
    previous_settings = ActionMailer::Base.smtp_settings
    previous_sender = ENV["MAILER_FROM"]
    ENV["MAILER_FROM"] = "hotel@example.test"
    ActionMailer::Base.delivery_method = :smtp
    ActionMailer::Base.smtp_settings = { address: "127.0.0.1", port: server.addr[1], domain: "example.test", enable_starttls_auto: false, open_timeout: 2, read_timeout: 2 }
    StaffPasswordResetEmailJob.perform_now(staff.id, requested.iso8601(6))
    message = messages.pop(true)
    assert_includes message, owner.email
    assert_includes message, staff.email
    assert_includes message, "/admin/staff-access?user=#{staff.id}"
    assert_equal "SENT", staff.reload.password_reset_email_status
    assert staff.authenticate("SMTP-Staff-Test-2026!")
  ensure
    ActionMailer::Base.delivery_method = previous_method if previous_method
    ActionMailer::Base.smtp_settings = previous_settings if previous_settings
    previous_sender ? ENV["MAILER_FROM"] = previous_sender : ENV.delete("MAILER_FROM")
    server&.close
    worker&.join(2)
    worker&.kill if worker&.alive?
  end
end
