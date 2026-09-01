module Authentication
  class SessionIssuer
    Result = Data.define(:user, :session, :access_token, :refresh_token)

    def self.call(user:, request:)
      session, refresh_token = ApiSession.issue!(user:, request:)
      access_token = Token.encode(user, session:)
      Result.new(user:, session:, access_token:, refresh_token:)
    end
  end
end
