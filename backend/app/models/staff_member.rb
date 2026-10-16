class StaffMember < ApplicationRecord
  belongs_to :property
  has_one :user, dependent: :restrict_with_error
  validate :protect_portal_account
  after_update :disable_portal_account, if: -> { saved_change_to_active? && !active? }
  has_many :payroll_entries, dependent: :restrict_with_error
  validates :monthly_salary, numericality: { greater_than_or_equal_to: 0, less_than: 1_000_000_000_000 }, allow_nil: true

  validates :name, :department, presence: true
  validates :position, numericality: { only_integer: true, greater_than_or_equal_to: 0 }

  def basic_salary
    (monthly_salary * BigDecimal("0.60")).round(2, BigDecimal::ROUND_HALF_UP) if monthly_salary
  end

  def monthly_allowance
    monthly_salary - basic_salary if monthly_salary
  end

  private

  def protect_portal_account
    return unless will_save_change_to_active? && !active? && user
    if user.id == Current.user&.id || user.role.name.in?(%w[OWNER SUPER_ADMIN])
      errors.add(:active, "cannot deactivate a protected portal account")
    end
  end

  def disable_portal_account
    return unless user
    user.with_lock do
      user.update!(active: false)
      user.api_sessions.active.find_each(&:revoke!)
      user.password_reset_tokens.active.find_each(&:mark_used!)
      AuditLog.create!(company: property.company, property: property, user: Current.user,
        module_name: "USERS", action: "DEACTIVATE", entity_type: "User", entity_id: user.id,
        new_values: { active: false, reason: "Staff member deactivated" },
        request_id: Current.request_id, ip_address: Current.ip_address)
    end
  end
end
