module Api
  module V1
    module Hotel
      class PropertiesController < BaseController
        def index
          render json: { success: true, data: permitted_properties.order(:name).map { |property| serialize(property) } }
        end

        def show
          property = permitted_properties.find(params[:id])
          render json: { success: true, data: serialize(property) }
        end

        private

        def serialize(property)
          property.as_json(only: %i[id company_id name code address city country phone email check_in_time check_out_time])
        end
      end
    end
  end
end
