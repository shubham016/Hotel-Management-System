class AddPropertyDisplayPreferences < ActiveRecord::Migration[8.1]
  def change
    add_column :properties, :nepali_calendar_enabled, :boolean, default: true, null: false
    add_column :properties, :currency_display, :string, default: "SYMBOL", null: false
    add_check_constraint :properties, "currency_display IN ('SYMBOL', 'CODE')", name: "valid_property_currency_display"
  end
end
