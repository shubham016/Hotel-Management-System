class Property < ApplicationRecord
  belongs_to :company
  has_many :cashier_closings, dependent: :restrict_with_error
  has_many :business_day_closings, dependent: :restrict_with_error
  has_many :journal_entries, dependent: :restrict_with_error
  has_many :user_properties, dependent: :destroy
  has_many :users, through: :user_properties
  has_many :room_types, dependent: :restrict_with_error
  has_many :floors, dependent: :restrict_with_error
  has_many :rooms, dependent: :restrict_with_error
  has_many :rate_plans, dependent: :restrict_with_error
  has_many :service_offerings, dependent: :restrict_with_error
  has_many :staff_members, dependent: :restrict_with_error
  has_one :payroll_configuration, dependent: :restrict_with_error
  has_many :payroll_entries, dependent: :restrict_with_error
  has_many :laundry_items, dependent: :restrict_with_error
  has_many :reservations, dependent: :restrict_with_error
  has_many :folios, dependent: :restrict_with_error
  has_many :cms_pages, dependent: :restrict_with_error
  has_many :cms_offers, dependent: :restrict_with_error
  has_many :cms_media_assets, dependent: :restrict_with_error
  has_many :cms_testimonials, dependent: :restrict_with_error
  has_many :contact_inquiries, dependent: :restrict_with_error
  has_many :restaurants, dependent: :restrict_with_error
  has_many :kitchen_orders, dependent: :restrict_with_error
  has_many :stores, dependent: :restrict_with_error
  has_many :purchase_orders, dependent: :restrict_with_error
  has_many :banquet_halls, dependent: :restrict_with_error
  has_many :banquet_bookings, dependent: :restrict_with_error

  normalizes :code, with: ->(value) { value.to_s.strip.upcase }

  validates :name, :code, presence: true
  validates :code, uniqueness: { scope: :company_id }
  validates :check_in_time, :check_out_time, format: { with: /\A(?:[01]\d|2[0-3]):[0-5]\d\z/ }
  validates :currency_display, inclusion: { in: %w[SYMBOL CODE] }

  def display_preferences
    { currency_code: company.currency_code, currency_display: currency_display, nepali_calendar_enabled: nepali_calendar_enabled }
  end

  def operating_date
    business_date || Date.current
  end

  def overdue_departure_cutoff_date(now: Time.current)
    hour, minute = check_out_time.split(":").map(&:to_i)
    deadline = now.change(hour: hour, min: minute, sec: 0)
    now >= deadline ? now.to_date : now.to_date - 1.day
  end
end
