class Notification < ApplicationRecord
  belongs_to :user

  validates :title, :message, :channel, presence: true
end
