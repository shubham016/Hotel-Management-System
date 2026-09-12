module Api
  module V1
    module Hotel
      class RoomTypesController < BackendController
        self.authorization_module_name = "ROOM_SETUP"

        def index
          room_types = default_property.room_types.setup_managed.order(:name)
          render json: { success: true, data: room_types.map { |room_type| serialize(room_type) } }
        end

        def show
          room_type = default_property.room_types.setup_managed.find(params[:id])
          render json: { success: true, data: serialize(room_type) }
        end

        def create
          room_type = default_property.room_types.create!(room_type_params.merge(setup_managed: true))
          audit!("ROOMS", "CREATE", "RoomType", room_type.id, new_values: room_type.attributes.slice("name", "code", "base_price"))
          render json: { success: true, data: serialize(room_type) }, status: :created
        end

        def update
          room_type = default_property.room_types.setup_managed.find(params[:id])
          old_values = room_type.attributes.slice("name", "code", "base_price", "active")
          room_type.update!(room_type_params)
          audit!("ROOMS", "UPDATE", "RoomType", room_type.id, old_values:, new_values: room_type.attributes.slice("name", "code", "base_price", "active"))
          render json: { success: true, data: serialize(room_type) }
        end

        def destroy
          room_type = default_property.room_types.setup_managed.find(params[:id])
          audit!("ROOMS", "DELETE", "RoomType", room_type.id, old_values: room_type.attributes.slice("name", "code"))
          room_type.destroy!
          render json: { success: true }
        end

        private

        def serialize(room_type)
          room_type.as_json(only: %i[id name code slug description base_price max_adults max_children max_occupancy amenities active])
        end

        def room_type_params
          permitted = params.require(:room_type).permit(:name, :code, :slug, :description, :base_price, :max_adults, :max_children, :max_occupancy, :active, amenities: [])
          permitted[:slug] = permitted[:name].to_s.parameterize if permitted[:slug].blank? && permitted[:name].present?
          if permitted[:max_adults].present? && permitted[:max_children].present?
            permitted[:max_occupancy] = permitted[:max_adults].to_i + permitted[:max_children].to_i
          end
          permitted
        end
      end
    end
  end
end
