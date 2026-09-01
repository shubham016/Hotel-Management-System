class ApiSession < ApplicationRecord
  REFRESH_TOKEN_LIFETIME = 30.days

  belongs_to :user

  validates :refresh_token_digest, presence: true, uniqueness: true
  validates :expires_at, presence: true

  scope :active, -> { where(revoked_at: nil).where("expires_at > ?", Time.current) }

  def self.digest(token)
    OpenSSL::Digest::SHA256.hexdigest(token.to_s)
  end

  def self.issue!(user:, request:)
    refresh_token = SecureRandom.urlsafe_base64(48)
    session = create!(
      user:,
      refresh_token_digest: digest(refresh_token),
      user_agent: request.user_agent.to_s.first(500),
      ip_address: request.remote_ip,
      expires_at: REFRESH_TOKEN_LIFETIME.from_now,
      last_used_at: Time.current
    )
    [ session, refresh_token ]
  end

  def active?
    revoked_at.nil? && expires_at.future?
  end

  def revoke!
    update!(revoked_at: Time.current)
  end
end
