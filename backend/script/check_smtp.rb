# Check configuration, TLS, and authentication without sending an email.
require "net/smtp"

missing = %w[SMTP_ADDRESS MAILER_FROM].select { |key| ENV[key].blank? }
missing << "SMTP_PASSWORD" if ENV["SMTP_USERNAME"].present? && ENV["SMTP_PASSWORD"].blank?
if missing.any?
  puts({ success: false, code: "SMTP_NOT_CONFIGURED", missing: missing }.to_json)
  exit 1
end

begin
  port = Integer(ENV.fetch("SMTP_PORT", "587"))
  raise ArgumentError unless port.between?(1, 65_535)
  ssl = ENV.fetch("SMTP_SSL", "false") == "true"
  starttls = ENV.fetch("SMTP_STARTTLS", "true") == "true"
  if ssl && starttls
    puts({ success: false, code: "SMTP_TLS_CONFLICT", message: "Choose SSL or STARTTLS" }.to_json)
    exit 1
  end
  smtp = Net::SMTP.new(ENV.fetch("SMTP_ADDRESS"), port)
  smtp.open_timeout = 5
  smtp.read_timeout = 5
  ssl ? smtp.enable_tls : starttls ? smtp.enable_starttls_auto : smtp.disable_starttls
  username = ENV["SMTP_USERNAME"].presence
  smtp.start(helo: ENV.fetch("SMTP_DOMAIN", "hotelnewera.com"), user: username,
    secret: username ? ENV["SMTP_PASSWORD"] : nil,
    authtype: username ? ENV.fetch("SMTP_AUTHENTICATION", "plain").to_sym : nil) {}
  puts({ success: true, authenticated: username.present?, message: "SMTP connection verified; no email sent" }.to_json)
rescue StandardError => error
  puts({ success: false, code: "SMTP_CHECK_FAILED", error_type: error.class.name }.to_json)
  exit 1
end
