module Api
  module V1
    module Hotel
      class ClientReferenceController < BackendController
        self.authorization_module_name = "PMS_FRONTDESK"

        def index
          property = default_property
          render json: {
            success: true,
            data: {
              staff: property.staff_members.order(:position, :created_at).map { |member| member.as_json(only: %i[id name department position active]) },
              laundry: property.laundry_items.order(:position, :created_at).map { |item| item.as_json(only: %i[id name price position active]) },
              extras: property.service_offerings.order(:name).map { |offering| offering.as_json(only: %i[id code name unit_price pricing_unit taxable active]) },
              laundryCollection: property.laundry_collection_instructions,
              laundryReturn: property.laundry_return_instructions
            }
          }
        end

        private

        def authorize_request!
          return if Current.user.role.name == "SUPER_ADMIN"
          return if Current.user.role.allows?("PMS_FRONTDESK", "read") || Current.user.role.allows?("ROOM_SETUP", "read")

          raise ApiError.new("You do not have permission to view client data", status: :forbidden, code: "FORBIDDEN")
        end
      end
    end
  end
end
