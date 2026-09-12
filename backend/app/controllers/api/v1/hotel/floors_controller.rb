module Api
  module V1
    module Hotel
      class FloorsController < BackendController
        self.authorization_module_name = "ROOMS"

        def index
          render json: { success: true, data: default_property.floors.order(:number).map { |floor| serialize(floor) } }
        end

        def create
          floor = default_property.floors.create!(floor_params)
          audit!("ROOMS", "CREATE", "Floor", floor.id, new_values: floor.attributes.slice("number", "name", "active"))
          render json: { success: true, data: serialize(floor) }, status: :created
        end

        def update
          floor = default_property.floors.find(params[:id])
          old_values = floor.attributes.slice("number", "name", "active")
          floor.update!(floor_params)
          audit!("ROOMS", "UPDATE", "Floor", floor.id, old_values:, new_values: floor.attributes.slice("number", "name", "active"))
          render json: { success: true, data: serialize(floor) }
        end

        def destroy
          floor = default_property.floors.find(params[:id])
          if default_property.rooms.exists?(floor: floor.number)
            raise ApiError.new("Move or deactivate the rooms on this floor before deleting it", status: :unprocessable_content, code: "FLOOR_IN_USE")
          end
          audit!("ROOMS", "DELETE", "Floor", floor.id, old_values: floor.attributes.slice("number", "name"))
          floor.destroy!
          render json: { success: true }
        end

        private

        def floor_params
          params.require(:floor).permit(:number, :name, :active)
        end

        def serialize(floor)
          floor.as_json(only: %i[id number name active])
        end
      end
    end
  end
end
