module Api
  module V1
    module Hotel
      class RoomTypesController < BackendController
        self.authorization_module_name = "ROOM_SETUP"

        def index
          room_types = default_property.room_types.setup_managed.includes(:rooms).order(:name)
          render json: { success: true, data: room_types.map { |room_type| serialize(room_type) } }
        end

        def show
          room_type = default_property.room_types.setup_managed.find(params[:id])
          render json: { success: true, data: serialize(room_type) }
        end

        def create
          room_type = RoomType.transaction do
            created = default_property.room_types.create!(room_type_params.merge(setup_managed: true))
            created.reload
            audit!("ROOMS", "CREATE", "RoomType", created.id, new_values: audit_values(created))
            created
          end
          render json: { success: true, data: serialize(room_type) }, status: :created
        end

        def update
          room_type = default_property.room_types.setup_managed.find(params[:id])
          RoomType.transaction do
            old_values = audit_values(room_type)
            room_type.update!(room_type_params(room_type))
            room_type.reload
            audit!("ROOMS", "UPDATE", "RoomType", room_type.id, old_values:, new_values: audit_values(room_type))
          end
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
          room_type.as_json(only: %i[id name code slug description image_url base_price bed_category bed_count max_adults max_children max_occupancy amenities active], methods: %i[bed_label bed_count_label])
        end

        def audit_values(room_type)
          room_type.attributes.slice("name", "code", "image_url", "base_price", "bed_category", "bed_count", "active")
        end

        def room_type_params(room_type = nil)
          permitted = params.require(:room_type).permit(:name, :code, :slug, :description, :image_url, :base_price, :bed_category, :bed_count, :max_adults, :max_children, :max_occupancy, :active, amenities: [])
          permitted[:slug] = permitted[:name].to_s.parameterize if permitted[:slug].blank? && permitted[:name].present?
          if permitted.key?(:max_adults) || permitted.key?(:max_children)
            adults = permitted.key?(:max_adults) ? permitted[:max_adults].to_i : (room_type&.max_adults || 0).to_i
            children = permitted.key?(:max_children) ? permitted[:max_children].to_i : (room_type&.max_children || 0).to_i
            permitted[:max_adults] = adults
            permitted[:max_children] = children
            permitted[:max_occupancy] = adults + children unless permitted.key?(:max_occupancy)
          end
          permitted
        end
      end
    end
  end
end
