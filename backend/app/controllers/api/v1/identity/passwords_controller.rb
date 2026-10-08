module Api
  module V1
    module Identity
      class PasswordsController < BaseController
        skip_before_action :authenticate!, only: %i[create update]
        skip_before_action :authorize_request!, only: %i[create update]

        def create
          email = params.require(:email).to_s.strip.downcase
          Access::PasswordResetRequests.call(email:)
          render json: { success: true, message: Access::PasswordResetRequests::MESSAGE }
        end

        def update
          token = params.require(:token).to_s
          password = params.require(:password).to_s
          raise ApiError.new("Password must be at least 12 characters", status: :unprocessable_content, code: "WEAK_PASSWORD") if password.length < 12

          reset = PasswordResetToken.active.find_by(token_digest: PasswordResetToken.digest(token))
          raise ApiError.new("Password reset token is invalid or expired", status: :unauthorized, code: "INVALID_RESET_TOKEN") unless reset

          PasswordResetToken.transaction do
            reset.user.update!(password:, password_confirmation: password)
            reset.mark_used!
            reset.user.api_sessions.active.find_each(&:revoke!)
          end

          render json: { success: true, message: "Password has been reset. Please sign in again." }
        end
      end
    end
  end
end
