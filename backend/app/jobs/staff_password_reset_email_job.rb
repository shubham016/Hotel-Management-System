class StaffPasswordResetEmailJob < ApplicationJob
  discard_on ActiveRecord::RecordNotFound

  def perform(user_id, requested_at)
    user = User.find(user_id)
    request_time = Time.iso8601(requested_at)
    return unless user.active? && user.password_reset_requested_at == request_time

    unless Rails.env.test? || ENV["SMTP_ADDRESS"].present? && ENV["MAILER_FROM"].present?
      User.where(id: user.id, password_reset_requested_at: request_time).update_all(password_reset_email_status: "NOT_CONFIGURED")
      return
    end

    Access::PasswordResetRequests.administrators_for(user).each do |administrator|
      StaffAccessMailer.password_reset_requested(user:, administrator:).deliver_now
    end
    User.where(id: user.id, password_reset_requested_at: request_time).update_all(password_reset_email_status: "SENT")
  rescue StandardError => error
    User.where(id: user_id, password_reset_requested_at: request_time).update_all(password_reset_email_status: "FAILED") if request_time
    Rails.logger.error("Staff password reset email failed user_id=#{user_id} error_class=#{error.class.name}")
    raise
  end
end
