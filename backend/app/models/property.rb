class Property < ApplicationRecord
  belongs_to :company
  has_many :user_properties, dependent: :destroy
  has_many :users, through: :user_properties
  has_many :room_types, dependent: :restrict_with_error
  has_many :floors, dependent: :restrict_with_error
  has_many :rooms, dependent: :restrict_with_error
  has_many :rate_plans, dependent: :restrict_with_error
  has_many :service_offerings, dependent: :restrict_with_error
  has_many :staff_members, dependent: :restrict_with_error
  has_many :laundry_items, dependent: :restrict_with_error
  has_many :reservations, dependent: :restrict_with_error
  has_many :folios, dependent: :restrict_with_error
  has_many :cms_pages, dependent: :restrict_with_error
  has_many :cms_offers, dependent: :restrict_with_error
  has_many :cms_media_assets, dependent: :restrict_with_error
  has_many :cms_testimonials, dependent: :restrict_with_error
  has_many :contact_inquiries, dependent: :restrict_with_error
  has_many :restaurants, dependent: :restrict_with_error
  has_many :stores, dependent: :restrict_with_error
  has_many :purchase_orders, dependent: :restrict_with_error
  has_many :banquet_halls, dependent: :restrict_with_error
  has_many :banquet_bookings, dependent: :restrict_with_error

  normalizes :code, with: ->(value) { value.to_s.strip.upcase }

  validates :name, :code, presence: true
  validates :code, uniqueness: { scope: :company_id }
end
