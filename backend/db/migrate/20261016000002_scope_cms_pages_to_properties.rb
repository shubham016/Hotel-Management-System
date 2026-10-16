class ScopeCmsPagesToProperties < ActiveRecord::Migration[8.1]
  def up
    remove_index :cms_pages, %i[company_id slug]
    add_index :cms_pages, %i[company_id property_id slug], unique: true
    add_index :cms_pages, %i[company_id slug], unique: true, where: "property_id IS NULL", name: "index_company_wide_cms_page_slugs"
  end

  def down
    raise ActiveRecord::IrreversibleMigration, "Property pages must not be merged or discarded"
  end
end
