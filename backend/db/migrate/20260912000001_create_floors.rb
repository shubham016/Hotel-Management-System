class CreateFloors < ActiveRecord::Migration[7.1]
  def change
    create_table :floors, id: :uuid do |t|
      t.references :property, null: false, foreign_key: true, type: :uuid
      t.integer :number, null: false
      t.string :name, null: false
      t.boolean :active, null: false, default: true
      t.timestamps
    end

    add_index :floors, %i[property_id number], unique: true
  end
end
