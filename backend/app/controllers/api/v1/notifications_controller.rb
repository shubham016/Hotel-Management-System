module Api
  module V1
    class NotificationsController < BaseController
      def index
        notifications = Current.user.notifications.order(created_at: :desc).limit(20)
        render json: {
          success: true,
          notifications: notifications.map { |n| serialize(n) },
          unreadCount: Current.user.notifications.where(read_at: nil).count
        }
      end

      def update
        notification = Current.user.notifications.find(params[:id])
        notification.update!(read_at: Time.current) unless notification.read_at
        render json: { success: true, notification: serialize(notification) }
      end

      private

      def authorize_request!
        role = Current.user.role
        return if role.name == "SUPER_ADMIN" || role.allows?("NOTIFICATIONS", inferred_authorization_action)
        return if role.allows?("RESERVATIONS", "read")

        super
      end

      def serialize(notification)
        {
          id: notification.id,
          title: notification.title,
          message: notification.message,
          actionUrl: notification.action_url,
          read: notification.read_at.present?,
          createdAt: notification.created_at.iso8601
        }
      end
    end
  end
end
