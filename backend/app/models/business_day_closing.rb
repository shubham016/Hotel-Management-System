class BusinessDayClosing < ApplicationRecord
  belongs_to :property
  belongs_to :closed_by, class_name: "User"
  belongs_to :cashier_closing
  validates :business_date, :next_business_date, presence: true
  def readonly?
    persisted?
  end
end
