module Api
  module V1
    module Identity
      class SessionsController < BaseController
        skip_before_action :authenticate!, only: %i[login refresh logout]
        skip_before_action :authorize_request!, only: %i[login refresh logout]

        def login
          email = params.require(:email).to_s.strip.downcase
          password = params.require(:password)
          user = User.includes(:role, :company, :properties).find_by("lower(email) = ?", email)

          unless user&.active? && user.authenticate(password)
            return render_error("Invalid email or password", status: :unauthorized, code: "INVALID_CREDENTIALS")
          end

          user.update_column(:last_login_at, Time.current)
          issued = Authentication::SessionIssuer.call(user:, request:)
          render json: {
            success: true,
            data: user_payload(user).merge(
              token: issued.access_token,
              accessToken: issued.access_token,
              refreshToken: issued.refresh_token,
              expiresIn: Authentication::Token::LIFETIME.to_i
            )
          }
        end

        def me
          render json: { success: true, data: user_payload(Current.user) }
        end

        def refresh
          issued = Authentication::SessionRefresher.call(refresh_token: params.require(:refreshToken), request:)
          render json: {
            success: true,
            data: {
              token: issued.access_token,
              accessToken: issued.access_token,
              refreshToken: issued.refresh_token,
              expiresIn: Authentication::Token::LIFETIME.to_i
            }
          }
        end

        def logout
          refresh_token = params[:refreshToken].presence
          ApiSession.active.find_by(refresh_token_digest: ApiSession.digest(refresh_token))&.revoke! if refresh_token
          render json: { success: true, message: "Signed out" }
        end

        private

        def user_payload(user)
          {
            userId: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role.name,
            companyId: user.company_id,
            properties: user.properties.map { |property| { id: property.id, code: property.code, name: property.name } }
          }
        end
      end
    end
  end
end
