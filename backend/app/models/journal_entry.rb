class JournalEntry < ApplicationRecord
  belongs_to :company
  has_many :journal_lines, dependent: :destroy

  validates :voucher_number, presence: true, uniqueness: true
end
