module Api
  module V1
    class ContactInquiriesController < BackendController
      skip_before_action :authenticate!, only: :create
      skip_before_action :authorize_request!, only: :create

      def create
        @property = public_property
        name = params[:fullName].presence || params[:name].presence || "Guest Visitor"
        raise ApiError.new("Please provide your name and contact phone or email", status: :bad_request, code: "CONTACT_REQUIRED") if name.blank? || (params[:phone].blank? && params[:email].blank?)

        inquiry = @property.contact_inquiries.create!(
          name:,
          email: params[:email],
          phone: params[:phone],
          subject: params[:subject],
          message: params[:message]
        )
        if (user = @property.company.users.first)
          user.notifications.create!(
            title: "New Website Inquiry from #{name}",
            message: "Subject: #{params[:subject].presence || 'General Inquiry'}\nPhone: #{params[:phone].presence || 'N/A'}\nEmail: #{params[:email].presence || 'N/A'}\nMessage: #{params[:message].presence || 'No message text provided.'}",
            channel: "IN_APP",
            action_url: "/admin/crm"
          )
        end
        audit!("CRM", "CREATE", "ContactInquiry", inquiry.id, new_values: { name:, subject: params[:subject] })
        render json: { success: true, message: "Thank you, #{name}! Your message has been received by our guest services team. We will contact you shortly via #{params[:phone].presence || params[:email]}." }
      end
    end
  end
end
