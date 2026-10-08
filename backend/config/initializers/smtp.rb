if ENV["SMTP_ADDRESS"].present?
  Rails.application.config.action_mailer.delivery_method = :smtp unless Rails.env.test?
  Rails.application.config.action_mailer.raise_delivery_errors = true
  Rails.application.config.action_mailer.smtp_settings = {
    address: ENV.fetch("SMTP_ADDRESS"),
    port: ENV.fetch("SMTP_PORT", "587").to_i,
    domain: ENV.fetch("SMTP_DOMAIN", "hotelnewera.com"),
    user_name: ENV["SMTP_USERNAME"],
    password: ENV["SMTP_PASSWORD"],
    authentication: ENV["SMTP_USERNAME"].present? ? ENV.fetch("SMTP_AUTHENTICATION", "plain").to_sym : nil,
    enable_starttls_auto: ENV.fetch("SMTP_STARTTLS", "true") == "true",
    ssl: ENV.fetch("SMTP_SSL", "false") == "true",
    open_timeout: 5,
    read_timeout: 5
  }.compact
end
