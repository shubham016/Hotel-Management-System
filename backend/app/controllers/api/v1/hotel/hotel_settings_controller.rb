module Api
  module V1
    module Hotel
      class HotelSettingsController < BackendController
        self.authorization_module_name = "ROOM_SETUP"

        def index
          render json: { success: true, data: serialize }
        end

        def update
          property = default_property
          Property.transaction do
            property.update!(params.require(:property).permit(:name, :phone, :email, :address, :check_in_time, :check_out_time, :laundry_collection_instructions, :laundry_return_instructions)) if params[:property].present?
            update_tax("VAT", params[:vat]) if params[:vat].present?
            audit!("ROOMS", "UPDATE", "PropertySettings", property.id, new_values: serialize)
          end
          render json: { success: true, data: serialize }
        end

        private

        def update_tax(code, input)
          tax = default_property.company.tax_configurations.find_or_initialize_by(code:, effective_from: Date.new(2020, 1, 1))
          attributes = input.permit(:inclusive)
          tax.assign_attributes(name: "Value Added Tax", calculation_order: 2, applies_to_rooms: true)
          tax.assign_attributes(attributes.merge(rate: 13, active: true))
          tax.save!
        end

        def serialize
          property = default_property
          vat = property.company.tax_configurations.where(code: "VAT").order(effective_from: :desc).first
          {
            property: property.as_json(only: %i[name code phone email address check_in_time check_out_time laundry_collection_instructions laundry_return_instructions]),
            vat: { rate: vat&.rate&.to_f || 0, active: vat&.active? || false, inclusive: vat&.inclusive? || false }
          }
        end
      end
    end
  end
end
