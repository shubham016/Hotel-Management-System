class PasswordResetToken < ApplicationRecord
  LIFETIME = 30.minutes

  belongs_to :user

  validates :token_digest, presence: true, uniqueness: true
  validates :expires_at, presence: true

  scope :active, -> { where(used_at: nil).where("expires_at > ?", Time.current) }

  def self.digest(token)
    OpenSSL::Digest::SHA256.hexdigest(token.to_s)
  end

  def self.issue!(user:, request:)
    token = SecureRandom.urlsafe_base64(36)
    record = create!(
      user:,
      token_digest: digest(token),
      expires_at: LIFETIME.from_now,
      request_ip: request.remote_ip
    )
    [ record, token ]
  end

  def active?
    used_at.nil? && expires_at.future?
  end

  def mark_used!
    update!(used_at: Time.current)
  end
end
