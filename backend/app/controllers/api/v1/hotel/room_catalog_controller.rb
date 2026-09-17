module Api
  module V1
    module Hotel
      class RoomCatalogController < BackendController
        skip_before_action :authenticate!
        skip_before_action :authorize_request!

        def index
          room_types = public_property.room_types.setup_managed.where(active: true).order(:name)
          render json: { success: true, data: room_types.map { |room_type| serialize(room_type) } }
        end

        private

        def serialize(room_type)
          room_type.as_json(only: %i[id name code slug description base_price bed_category bed_count max_adults max_children max_occupancy amenities active])
        end
      end
    end
  end
end
