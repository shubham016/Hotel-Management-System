module Api
  module V1
    module Hotel
      class AddOnCatalogController < BackendController
        skip_before_action :authenticate!
        skip_before_action :authorize_request!

        def index
          offerings = public_property.service_offerings.where(active: true).order(:name)
          render json: { success: true, data: offerings.map { |offering| serialize(offering) } }
        end

        private

        def serialize(offering)
          {
            id: offering.id,
            code: offering.code,
            name: offering.name,
            unitPrice: offering.unit_price.to_f,
            pricingUnit: offering.pricing_unit,
            taxable: offering.taxable
          }
        end
      end
    end
  end
end
