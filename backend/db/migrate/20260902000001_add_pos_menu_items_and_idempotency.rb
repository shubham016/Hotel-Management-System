class AddPosMenuItemsAndIdempotency < ActiveRecord::Migration[8.1]
  def change
    create_table :menu_items, id: :uuid do |t|
      t.references :restaurant, null: false, foreign_key: true, type: :uuid
      t.string :name, null: false
      t.string :category, null: false
      t.decimal :price, precision: 12, scale: 2, null: false
      t.boolean :active, default: true, null: false

      t.timestamps
    end

    add_index :menu_items, %i[restaurant_id name], unique: true

    add_index :folio_items, %i[folio_id source_reference], unique: true,
      where: "source_module = 'RESTAURANT' AND source_reference IS NOT NULL",
      name: "index_folio_items_on_folio_id_and_idempotency_key"

    add_index :journal_entries, %i[company_id source_reference], unique: true,
      where: "source_reference IS NOT NULL", name: "index_journal_entries_on_company_id_and_idempotency_key"
  end
end
