module Authentication
  class SessionRefresher
    Result = Data.define(:user, :session, :access_token, :refresh_token)

    def self.call(refresh_token:, request:)
      digest = ApiSession.digest(refresh_token)
      session = ApiSession.includes(user: %i[role company properties]).active.find_by(refresh_token_digest: digest)
      raise ApiError.new("Refresh session is invalid or expired", status: :unauthorized, code: "INVALID_REFRESH_TOKEN") unless session&.user&.login_enabled?

      ApiSession.transaction do
        session.revoke!
        new_session, new_refresh_token = ApiSession.issue!(user: session.user, request:)
        access_token = Token.encode(session.user, session: new_session)
        Result.new(user: session.user, session: new_session, access_token:, refresh_token: new_refresh_token)
      end
    end
  end
end
