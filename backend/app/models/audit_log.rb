class AuditLog < ApplicationRecord
  belongs_to :company
  belongs_to :property, optional: true
  belongs_to :user, optional: true

  validates :module_name, :action, :entity_type, :entity_id, presence: true
end
