class HousekeepingTask < ApplicationRecord
  belongs_to :room

  validates :task_type, :status, presence: true
end
