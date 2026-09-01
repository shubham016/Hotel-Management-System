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
            tables: restaurant.restaurant_tables.order(:table_number).as_json
          }
        end
      end
    end
  end
end
