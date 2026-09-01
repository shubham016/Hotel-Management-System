module Api
  module V1
    class AuditLogsController < BackendController
      def index
        logs = Current.company.audit_logs.order(created_at: :desc).limit(100)
        render json: { success: true, logs: logs.as_json }
      end
    end
  end
end
