class Role < ApplicationRecord
  belongs_to :company
  has_many :users, dependent: :restrict_with_error

  validates :name, presence: true, uniqueness: { scope: :company_id }

  def allows?(module_name, action)
    permissions.fetch(module_name.to_s, []).include?(action.to_s)
  end
end
