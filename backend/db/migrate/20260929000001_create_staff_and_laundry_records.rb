class CreateStaffAndLaundryRecords < ActiveRecord::Migration[8.1]
  def change
    create_table :staff_members, id: :uuid do |t|
      t.references :property, null: false, foreign_key: true, type: :uuid
      t.string :source_key
      t.string :name, null: false
      t.string :department, null: false
      t.integer :position, null: false, default: 0
      t.boolean :active, null: false, default: true
      t.timestamps
    end
    add_index :staff_members, %i[property_id source_key], unique: true

    create_table :laundry_items, id: :uuid do |t|
      t.references :property, null: false, foreign_key: true, type: :uuid
      t.string :source_key
      t.string :name, null: false
      t.decimal :price, precision: 12, scale: 2, null: false
      t.integer :position, null: false, default: 0
      t.boolean :active, null: false, default: true
      t.timestamps
    end
    add_index :laundry_items, %i[property_id source_key], unique: true
  end
end
