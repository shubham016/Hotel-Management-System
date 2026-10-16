class User < ApplicationRecord
  belongs_to :company
  belongs_to :role
  belongs_to :staff_member, optional: true
  has_many :user_properties, dependent: :destroy
  has_many :properties, through: :user_properties
  has_many :notifications, dependent: :destroy
  has_many :api_sessions, dependent: :destroy
  has_many :password_reset_tokens, dependent: :destroy
  has_secure_password

  normalizes :email, with: ->(value) { value.to_s.strip.downcase }

  validates :email, :first_name, :last_name, presence: true
  validates :email, uniqueness: { case_sensitive: false }
  validates :email, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :staff_member_id, uniqueness: true, allow_nil: true
  validate do
    errors.add(:role, "must belong to this company") if role && role.company_id != company_id
    errors.add(:staff_member, "must belong to this company") if staff_member && staff_member.property.company_id != company_id
    errors.add(:staff_member, "must be active before enabling portal access") if active? && staff_member && !staff_member.active?
  end

  scope :active_scope, -> { where(active: true) }

  def login_enabled?
    active? && (staff_member.nil? || staff_member.active?)
  end

  def full_name
    "#{first_name} #{last_name}".strip
  end

  def allowed_property?(property)
    property.company_id == company_id && (role.name == "SUPER_ADMIN" || properties.exists?(property.id))
  end
end
