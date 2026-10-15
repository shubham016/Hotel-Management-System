class InitializePropertyBusinessDates < ActiveRecord::Migration[8.1]
  def up
    date = Time.current.in_time_zone("Kathmandu").to_date
    execute "UPDATE properties SET business_date = #{connection.quote(date)} WHERE business_date IS NULL"
  end

  def down
    # Existing business dates and closing evidence must be retained.
  end
end
