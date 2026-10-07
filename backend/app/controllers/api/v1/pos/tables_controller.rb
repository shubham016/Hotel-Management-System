module Api
  module V1
    module Pos
      class TablesController < BackendController
        def index
          restaurant = default_property.restaurants.includes(:restaurant_tables).find_by(outlet_code: params[:outlet].presence || "DHIKI-REST")
          return render json: { success: true, tables: [] } unless restaurant

          render json: {
            success: true,
            restaurant: { id: restaurant.id, name: restaurant.name, outletCode: restaurant.outlet_code },
            taxes: default_property.company.tax_configurations.where(active: true, code: "VAT").for_date(Date.current).order(:calculation_order).map { |tax| { rate: tax.rate.to_f, inclusive: tax.inclusive } },
            inHouseRooms: default_property.reservations.where(status: "CHECKED_IN").includes(:guest, :folio, reservation_rooms: :room).flat_map { |reservation|
              next [] unless reservation.folio&.status == "OPEN"
              reservation.reservation_rooms.filter_map { |assignment| { roomNumber: assignment.room.room_number, guestName: reservation.guest.full_name } if assignment.room }
            },
            tables: restaurant.restaurant_tables.includes(kitchen_orders: [:user, { restaurant_table: :restaurant }]).order(:table_number).map { |table|
              { id: table.id, table_number: table.table_number, capacity: table.capacity, status: table.status,
                orders: table.kitchen_orders.select { |order| order.settled_at.nil? }.sort_by(&:created_at).map(&:portal_json) }
            }
          }
        end
      end
    end
  end
end
