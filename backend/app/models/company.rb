class Company < ApplicationRecord
  has_many :properties, dependent: :restrict_with_error
  has_many :roles, dependent: :restrict_with_error
  has_many :users, dependent: :restrict_with_error
  has_many :guests, dependent: :restrict_with_error
  has_many :tax_configurations, dependent: :restrict_with_error
  has_many :cms_pages, dependent: :restrict_with_error
  has_many :cms_media_assets, dependent: :restrict_with_error
  has_many :inventory_items, dependent: :restrict_with_error
  has_many :suppliers, dependent: :restrict_with_error
  has_many :purchase_orders, dependent: :restrict_with_error
  has_many :accounts, dependent: :restrict_with_error
  has_many :journal_entries, dependent: :restrict_with_error
  has_many :audit_logs, dependent: :restrict_with_error

  normalizes :slug, with: ->(value) { value.to_s.strip.downcase }

  validates :name, :slug, :currency_code, :timezone, presence: true
  validates :slug, uniqueness: true
end
