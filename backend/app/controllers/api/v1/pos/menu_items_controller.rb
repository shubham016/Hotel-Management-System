module Api
  module V1
    module Pos
      class MenuItemsController < BackendController
        def index
          restaurants = default_property.restaurants.where(active: true).includes(:menu_items).order(:outlet_code)
          render json: {
            success: true,
            outlets: restaurants.map do |restaurant|
              {
                id: restaurant.id,
                outletCode: restaurant.outlet_code,
                name: restaurant.name,
                items: restaurant.menu_items.active.order(:category, :name).map { |item| serialize(item) }
              }
            end
          }
        end

        private

        def serialize(item)
          { id: item.id, name: item.name, category: item.category, price: item.price.to_f }
        end
      end
    end
  end
end
