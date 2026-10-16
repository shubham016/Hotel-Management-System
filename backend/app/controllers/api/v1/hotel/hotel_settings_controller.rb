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
            if params[:display_preferences].present?
              if params[:display_preferences].key?(:currency_code) && params[:display_preferences][:currency_code] != property.company.currency_code
                raise ApiError.new("Accounting currency cannot be changed through display settings", status: :unprocessable_content, code: "ACCOUNTING_CURRENCY_LOCKED")
              end
              input = params.require(:display_preferences).permit(:nepali_calendar_enabled, :currency_display)
              if input.key?(:nepali_calendar_enabled) && ![true, false].include?(input[:nepali_calendar_enabled])
                raise ApiError.new("Select whether to show BS dates", status: :unprocessable_content, code: "INVALID_DISPLAY_PREFERENCES")
              end
              property.update!(input)
            end
            audit!("ROOMS", "UPDATE", "PropertySettings", property.id, new_values: serialize)
          end
          render json: { success: true, data: serialize }
        end

        private

        def update_tax(code, input)
          tax = current_vat || default_property.company.tax_configurations.find_or_initialize_by(code:, effective_from: Date.current)
          attributes = input.permit(:inclusive)
          tax.assign_attributes(name: "Value Added Tax", calculation_order: 2, applies_to_rooms: true)
          tax.assign_attributes(attributes.merge(rate: 13, active: true))
          tax.save!
        end

        def serialize
          property = default_property
          vat = current_vat
          {
            property: property.as_json(only: %i[name code phone email address check_in_time check_out_time laundry_collection_instructions laundry_return_instructions]),
            display_preferences: property.display_preferences,
            email_delivery: { configured: ENV["SMTP_ADDRESS"].present? && ENV["MAILER_FROM"].present?, sender: ENV["MAILER_FROM"].to_s },
            vat: { rate: vat&.rate&.to_f || 0, active: vat&.active? || false, inclusive: vat&.inclusive? || false }
          }
        end

        def current_vat
          default_property.company.tax_configurations.where(code: "VAT").for_date(Date.current).order(effective_from: :desc).first
        end
      end
    end
  end
end
