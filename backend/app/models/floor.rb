class Floor < ApplicationRecord
  belongs_to :property

  validates :number, numericality: { only_integer: true, greater_than: 0 }, uniqueness: { scope: :property_id }
  validates :name, presence: true
  validate do
    if persisted? && will_save_change_to_number? && property.rooms.exists?(floor: number_in_database)
      errors.add(:number, "cannot change while rooms use this floor; move the rooms first")
    end
  end
end
