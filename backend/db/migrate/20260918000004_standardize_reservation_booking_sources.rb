class StandardizeReservationBookingSources < ActiveRecord::Migration[8.0]
  LEGACY_SOURCE_MAP = {
    "DIRECT_WEB" => "ONLINE",
    "EMAIL" => "PHONE",
    "OTA" => "TRAVEL_AGENCY",
    "CORPORATE" => "PARTNER_HOTEL",
    "TRAVEL_AGENT" => "TRAVEL_AGENCY"
  }.freeze

  def up
    LEGACY_SOURCE_MAP.each { |old_source, new_source| Reservation.where(source: old_source).update_all(source: new_source, updated_at: Time.current) }
    change_column_default :reservations, :source, from: "DIRECT_WEB", to: "ONLINE"
  end

  def down
    change_column_default :reservations, :source, from: "ONLINE", to: "DIRECT_WEB"
  end
end
