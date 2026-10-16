module Api
  module V1
    class BaseController < ApplicationController
      before_action :set_request_context
      before_action :authenticate!
      before_action :authorize_request!
      around_action :with_business_day_context

      class_attribute :authorization_module_name, default: nil

      private

      def with_business_day_context(&action)
        if request.get? || request.head? || !Current.user
          return yield
        end
        property = Current.property || (respond_to?(:default_property, true) ? default_property : nil)
        property ? BusinessDays::Context.with(property, &action) : yield
      end

      def set_request_context
        Current.request_id = request.request_id
        Current.ip_address = request.remote_ip
      end

      def authenticate!
        token = request.authorization.to_s.split.last
        payload = Authentication::Token.decode(token)
        user = payload && User.includes(:role, :company).find_by(id: payload[:sub], active: true)
        return render_error("Authentication required", status: :unauthorized, code: "UNAUTHENTICATED") unless user&.login_enabled?
        if payload[:sid].present? && !user.api_sessions.active.exists?(id: payload[:sid])
          return render_error("Session expired", status: :unauthorized, code: "SESSION_EXPIRED")
        end

        Current.user = user
        Current.company = user.company
        set_current_property(user)
      end

      def set_current_property(user)
        code = request.headers["X-Property-Code"].presence || params[:propertyCode].presence
        return if code.blank?

        property = user.company.properties.find_by!(code: code.to_s.upcase, active: true)
        raise ApiError.new("You do not have access to this property", status: :forbidden, code: "FORBIDDEN") unless user.allowed_property?(property)

        Current.property = property
      end

      def authorize!(module_name, action)
        return if Current.user.role.name == "SUPER_ADMIN" || Current.user.role.allows?(module_name, action)

        raise ApiError.new("You do not have permission to perform this action", status: :forbidden, code: "FORBIDDEN")
      end

      def authorize_request!
        authorize!(authorization_module_name || inferred_authorization_module, inferred_authorization_action)
      end

      def inferred_authorization_module
        controller_path.split("/").last.upcase
      end

      def inferred_authorization_action
        case action_name
        when "index", "show", "me" then "read"
        when "create", "login", "refresh" then "create"
        when "update" then "update"
        when "destroy", "logout" then "delete"
        else action_name
        end
      end

      def permitted_properties
        return Current.company.properties.where(active: true) if Current.user.role.name == "SUPER_ADMIN"

        Current.user.properties.where(active: true)
      end

      def require_property!
        Current.property || raise(ApiError.new("A property context is required", status: :bad_request, code: "PROPERTY_REQUIRED"))
      end
    end
  end
end
