class ApplicationMailer < ActionMailer::Base
  default from: -> { ENV["MAILER_FROM"].presence || "no-reply@hotelnewera.com" }
  layout "mailer"
end
