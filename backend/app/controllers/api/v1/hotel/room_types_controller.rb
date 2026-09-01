module Api
  module V1
    module Hotel
      class RoomTypesController < BaseController
        def index
          property = require_property!
          room_types = property.room_types.where(active: true).order(:name)
          render json: { success: true, data: room_types.map { |room_type| serialize(room_type) } }
        end

        def show
          room_type = require_property!.room_types.find(params[:id])
          render json: { success: true, data: serialize(room_type) }
        end

        private

        def serialize(room_type)
          room_type.as_json(only: %i[id name code slug description base_price max_adults max_children max_occupancy amenities])
        end
      end
    end
  end
end
