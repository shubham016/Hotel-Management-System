class Folio < ApplicationRecord
  STATUSES = %w[OPEN SETTLED CLOSED VOID].freeze

  belongs_to :property
  belongs_to :reservation
  belongs_to :guest
  has_many :folio_items, dependent: :restrict_with_error
  has_many :payments, dependent: :restrict_with_error
  has_many :payment_requests, dependent: :restrict_with_error

  validates :folio_number, presence: true, uniqueness: true
  validates :status, inclusion: { in: STATUSES }
end
