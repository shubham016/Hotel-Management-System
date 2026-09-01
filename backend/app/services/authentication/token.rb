module Authentication
  class Token
    ALGORITHM = "HS256"
    ISSUER = "hotel-new-era-api"
    AUDIENCE = "hotel-new-era-web"
    LIFETIME = 8.hours

    class << self
    def encode(user, session: nil)
        now = Time.current.to_i
        payload = {
        sub: user.id,
        company_id: user.company_id,
        role: user.role.name,
        sid: session&.id,
          iss: ISSUER,
          aud: AUDIENCE,
          iat: now,
          exp: now + LIFETIME.to_i
        }

        JWT.encode(payload, secret, ALGORITHM)
      end

      def decode(token)
        JWT.decode(
          token,
          secret,
          true,
          algorithm: ALGORITHM,
          iss: ISSUER,
          verify_iss: true,
          aud: AUDIENCE,
          verify_aud: true
        ).first.with_indifferent_access
      rescue JWT::DecodeError, JWT::ExpiredSignature
        nil
      end

      private

      def secret
        return ENV.fetch("JWT_SECRET_KEY") if Rails.env.production?

        ENV["JWT_SECRET_KEY"].presence || Rails.application.secret_key_base
      end
    end
  end
end
