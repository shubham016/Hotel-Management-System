class AddSecuritySessionsAndPasswordResets < ActiveRecord::Migration[8.1]
  def change
    create_table :api_sessions, id: :uuid do |t|
      t.references :user, null: false, foreign_key: true, type: :uuid
      t.string :refresh_token_digest, null: false
      t.string :user_agent
      t.string :ip_address
      t.datetime :expires_at, null: false
      t.datetime :revoked_at
      t.datetime :last_used_at

      t.timestamps
    end

    add_index :api_sessions, :refresh_token_digest, unique: true
    add_index :api_sessions, %i[user_id revoked_at]
    add_index :api_sessions, :expires_at

    create_table :password_reset_tokens, id: :uuid do |t|
      t.references :user, null: false, foreign_key: true, type: :uuid
      t.string :token_digest, null: false
      t.datetime :expires_at, null: false
      t.datetime :used_at
      t.string :request_ip

      t.timestamps
    end

    add_index :password_reset_tokens, :token_digest, unique: true
    add_index :password_reset_tokens, %i[user_id used_at]
    add_index :password_reset_tokens, :expires_at
  end
end
