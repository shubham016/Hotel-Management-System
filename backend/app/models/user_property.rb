class UserProperty < ApplicationRecord
  belongs_to :user
  belongs_to :property

  validates :property_id, uniqueness: { scope: :user_id }
  validate :same_company

  private

  def same_company
    errors.add(:property, "must belong to the user's company") if user && property && user.company_id != property.company_id
  end
end
