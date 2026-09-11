class CreateCmsMediaLibrary < ActiveRecord::Migration[8.1]
  def change
    create_table :cms_media_assets, id: :uuid do |t|
      t.references :company, null: false, foreign_key: true, type: :uuid
      t.references :property, null: false, foreign_key: true, type: :uuid
      t.string :title, null: false
      t.string :alt_text, null: false
      t.string :category, null: false, default: "GENERAL"
      t.timestamps
    end

    add_index :cms_media_assets, %i[property_id category]

    create_table :active_storage_blobs, id: :uuid do |t|
      t.string :key, null: false
      t.string :filename, null: false
      t.string :content_type
      t.text :metadata
      t.string :service_name, null: false
      t.bigint :byte_size, null: false
      t.string :checksum
      t.datetime :created_at, null: false
      t.index :key, unique: true
    end

    create_table :active_storage_attachments, id: :uuid do |t|
      t.string :name, null: false
      t.string :record_type, null: false
      t.uuid :record_id, null: false
      t.uuid :blob_id, null: false
      t.datetime :created_at, null: false
      t.index %i[record_type record_id name blob_id], name: "index_active_storage_attachments_uniqueness", unique: true
      t.foreign_key :active_storage_blobs, column: :blob_id
    end
  end
end
