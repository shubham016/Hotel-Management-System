module Api
  module V1
    module Identity
      class ProfilesController < BackendController
        skip_before_action :authorize_request!

        def update
          user = Current.user
          unless user.authenticate(params.require(:currentPassword))
            raise ApiError.new("Your current password is incorrect", status: :unprocessable_content, code: "INVALID_PASSWORD")
          end
          password = params.require(:password).to_s
          raise ApiError.new("Use at least 12 characters", status: :unprocessable_content, code: "WEAK_PASSWORD") if password.length < 12
          User.transaction do
            user.lock!
            user.update!(password:, password_confirmation: params.require(:passwordConfirmation), password_reset_requested_at: nil, password_reset_email_status: nil)
            user.password_reset_tokens.active.find_each(&:mark_used!)
            user.api_sessions.active.find_each(&:revoke!)
            audit!("USERS", "UPDATE", "User", user.id, new_values: { password_changed: true })
          end
          render json: { success: true, message: "Password changed. Sign in with your new password." }
        end
      end
    end
  end
end
