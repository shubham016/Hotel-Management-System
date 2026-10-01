class CmsTestimonial < ApplicationRecord
  belongs_to :property

  scope :ordered, -> { order(:sort_order, :created_at, :id) }
  validates :name, :comment, presence: true
  validates :name, length: { maximum: 120 }
  validates :origin, length: { maximum: 160 }
  validates :comment, length: { maximum: 2_000 }
  validates :rating, numericality: { only_integer: true, in: 1..5 }
  validates :sort_order, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :avatar, format: { with: /\Ahttps?:\/\/\S+\z/, message: "must be an HTTP or HTTPS image URL" }, allow_blank: true
end
