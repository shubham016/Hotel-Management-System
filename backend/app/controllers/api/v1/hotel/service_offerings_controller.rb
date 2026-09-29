module Api
  module V1
    module Hotel
      class ServiceOfferingsController < BackendController
        self.authorization_module_name = "ROOM_SETUP"

        def create
          offering = default_property.service_offerings.create!(offering_params)
          audit!("ROOMS", "CREATE", "ServiceOffering", offering.id, new_values: audit_values(offering))
          render json: { success: true, data: serialize(offering) }, status: :created
        end

        def update
          offering = default_property.service_offerings.find(params[:id])
          old_values = audit_values(offering)
          offering.update!(offering_params)
          audit!("ROOMS", "UPDATE", "ServiceOffering", offering.id, old_values:, new_values: audit_values(offering))
          render json: { success: true, data: serialize(offering) }
        end

        def destroy
          offering = default_property.service_offerings.find(params[:id])
          old_values = audit_values(offering)
          offering.update!(active: false)
          audit!("ROOMS", "DELETE", "ServiceOffering", offering.id, old_values:, new_values: audit_values(offering))
          render json: { success: true, data: serialize(offering) }
        end

        private

        def offering_params
          params.require(:service_offering).permit(:code, :name, :unit_price, :pricing_unit, :taxable, :active)
        end

        def audit_values(offering)
          offering.attributes.slice("code", "name", "unit_price", "pricing_unit", "taxable", "active")
        end

        def serialize(offering)
          offering.as_json(only: %i[id code name unit_price pricing_unit taxable active])
        end
      end
    end
  end
end
