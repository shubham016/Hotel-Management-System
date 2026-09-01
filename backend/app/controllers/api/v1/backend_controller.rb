module Api
  module V1
    class BackendController < BaseController
      private

      def default_property
        Current.property || permitted_properties.find_by(code: default_property_code) || permitted_properties.first!
      end

      def public_property
        Property.find_by(code: request.headers["X-Property-Code"].presence || params[:propertyCode].presence || default_property_code) ||
          Property.find_by!(code: default_property_code)
      end

      def default_property_code
        ENV.fetch("DEFAULT_PROPERTY_CODE", "HNE-BTW")
      end

      def audit!(module_name, action, entity_type, entity_id, old_values: nil, new_values: nil)
        property = Current.property || (defined?(@property) && @property)
        company = Current.company || property&.company
        return unless company

        AuditLog.create!(
          company:,
          property:,
          user: Current.user,
          module_name:,
          action:,
          entity_type:,
          entity_id:,
          old_values:,
          new_values:,
          request_id: Current.request_id,
          ip_address: Current.ip_address
        )
      end

      def split_name(name)
        parts = name.to_s.strip.split
        [ parts.first.presence || "Valued", parts.drop(1).join(" ").presence || "Guest" ]
      end
    end
  end
end
