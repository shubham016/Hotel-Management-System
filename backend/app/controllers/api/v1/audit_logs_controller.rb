module Api
  module V1
    class AuditLogsController < BackendController
      def index
        scope = Current.company.audit_logs.where(property_id: [nil, default_property.id])
        modules = scope.distinct.order(:module_name).pluck(:module_name)
        logs = scope
        logs = logs.where(module_name: params[:module]) if params[:module].present? && params[:module] != "ALL"
        if params[:q].present?
          query = "%#{AuditLog.sanitize_sql_like(params[:q].to_s)}%"
          logs = logs.where("module_name ILIKE :q OR action ILIKE :q OR entity_type ILIKE :q OR entity_id::text ILIKE :q", q: query)
        end
        page = [params[:page].to_i, 1].max
        total = logs.count
        logs = logs.includes(:user).order(created_at: :desc, id: :desc).offset((page - 1) * 100).limit(100)
        render json: { success: true, logs: logs.map { |log| serialize(log) }, modules: modules,
          page: page, total: total, hasNext: page * 100 < total }
      end

      private

      def serialize(log)
        { id: log.id, createdAt: log.created_at.iso8601, module: log.module_name, action: log.action,
          entityName: "#{log.entity_type.titleize} · #{log.entity_id}",
          description: "#{log.action.humanize} · #{log.entity_type.titleize}",
          actor: log.user&.full_name, ipAddress: log.ip_address }
      end
    end
  end
end
