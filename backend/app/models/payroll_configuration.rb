class PayrollConfiguration < ApplicationRecord
  belongs_to :property
  CATEGORIES = { expense: "EXPENSE", payable: "LIABILITY", deductions: "LIABILITY", advances: "ASSET", tds: "LIABILITY" }.freeze
  CATEGORIES.each_key { |kind| belongs_to "#{kind}_account".to_sym, class_name: "Account", optional: kind == :tds }
  validate :valid_accounts

  private

  def valid_accounts
    CATEGORIES.each do |kind, category|
      account = public_send("#{kind}_account")
      next if kind == :tds && account.nil? && tds_account_id.nil?
      errors.add("#{kind}_account", "must be an active #{category.downcase} account in this company") unless account && account.company_id == property&.company_id && account.active? && account.category == category
    end
    ids = CATEGORIES.keys.map { |kind| public_send("#{kind}_account_id") }.compact
    errors.add(:base, "Payroll accounts must be distinct") unless ids.uniq.size == ids.size
  end
end
