class DisableServiceCharge < ActiveRecord::Migration[8.0]
  def up
    execute "UPDATE tax_configurations SET active = FALSE WHERE code = 'SERVICE_CHARGE'"
    execute "UPDATE tax_configurations SET rate = 13 WHERE code = 'VAT' AND active = TRUE"
  end

  def down
    # Previously posted financial records must not be repriced or reactivated.
  end
end
