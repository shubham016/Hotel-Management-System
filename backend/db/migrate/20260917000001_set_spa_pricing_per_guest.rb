class SetSpaPricingPerGuest < ActiveRecord::Migration[8.1]
  def up
    execute <<~SQL.squish
      UPDATE service_offerings
      SET pricing_unit = 'PER_GUEST',
          name = 'Himalayan Herbal Aroma Therapy (60 Min)',
          updated_at = CURRENT_TIMESTAMP
      WHERE code = 'SPA'
    SQL
  end

  def down
    execute <<~SQL.squish
      UPDATE service_offerings
      SET pricing_unit = 'PER_BOOKING',
          updated_at = CURRENT_TIMESTAMP
      WHERE code = 'SPA'
    SQL
  end
end
