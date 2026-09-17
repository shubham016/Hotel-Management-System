class Guest < ApplicationRecord
  belongs_to :company
  has_many :reservations, dependent: :restrict_with_error
  has_many :folios, dependent: :restrict_with_error

  normalizes :email, with: ->(value) { value.to_s.strip.downcase.presence }
  before_validation :normalize_phone

  validates :first_name, :last_name, :phone, :normalized_phone, presence: true
  validates :normalized_phone, length: { in: 7..15 }
  validates :email, format: { with: URI::MailTo::EMAIL_REGEXP }, allow_blank: true

  def full_name
    "#{first_name} #{last_name}".strip
  end

  private

  def normalize_phone
    self.normalized_phone = phone.to_s.gsub(/\D/, "")
  end
end
