module Api
  module V1
    module Hotel
      class LaundryItemsController < BackendController
        self.authorization_module_name = "ROOM_SETUP"

        def create
          item = default_property.laundry_items.create!(item_params)
          audit!("ROOMS", "CREATE", "LaundryItem", item.id, new_values: item.attributes.slice("name", "price", "position", "active"))
          render json: { success: true, data: serialize(item) }, status: :created
        end

        def update
          item = default_property.laundry_items.find(params[:id])
          old_values = item.attributes.slice("name", "price", "position", "active")
          item.update!(item_params)
          audit!("ROOMS", "UPDATE", "LaundryItem", item.id, old_values:, new_values: item.attributes.slice("name", "price", "position", "active"))
          render json: { success: true, data: serialize(item) }
        end

        def destroy
          item = default_property.laundry_items.find(params[:id])
          item.update!(active: false)
          audit!("ROOMS", "DELETE", "LaundryItem", item.id, old_values: { active: true }, new_values: { active: false })
          render json: { success: true, data: serialize(item) }
        end

        private

        def item_params
          params.require(:laundry_item).permit(:name, :price, :position, :active)
        end

        def serialize(item)
          item.as_json(only: %i[id name price position active])
        end
      end
    end
  end
end
