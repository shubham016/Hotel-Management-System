module Api
  module V1
    module Crm
      class GuestsController < BackendController
        def index
          guests = default_property.company.guests.order(:first_name, :last_name)
          render json: { success: true, guests: guests.map { |guest| serialize(guest) } }
        end

        def create
          company = default_property.company
          if params[:id].present?
            authorize!("GUESTS", "update")
            guest = company.guests.find(params[:id])
            if company.guests.where.not(id: guest.id).exists?(normalized_phone: params.require(:phone).to_s.gsub(/\D/, ""))
              raise ApiError.new("Another guest already uses this phone", status: :conflict, code: "GUEST_EXISTS")
            end
          else
            if company.guests.exists?(normalized_phone: params.require(:phone).to_s.gsub(/\D/, ""))
              raise ApiError.new("A guest with this phone already exists. Open their profile to edit it.", status: :conflict, code: "GUEST_EXISTS")
            end
            guest = company.guests.new
          end
          guest.update!(
            first_name: params.require(:firstName),
            last_name: params.require(:lastName),
            phone: params.require(:phone),
            email: params[:email].presence,
            vip_level: params[:vipLevel].presence || "REGULAR",
            city: params[:city],
            preferences: params[:preferences],
            notes: params[:notes]
          )
          audit!("CRM", "UPDATE", "Guest", guest.id, new_values: { name: guest.full_name, vip_level: guest.vip_level })
          render json: { success: true, message: "Guest profile saved successfully", data: serialize(guest) }
        end

        private

        def serialize(guest)
          reservations = guest.reservations.where(property_id: permitted_properties.select(:id))
          {
            id: guest.id,
            name: guest.full_name,
            firstName: guest.first_name,
            lastName: guest.last_name,
            email: guest.email || "N/A",
            phone: guest.phone,
            city: guest.city || "",
            country: guest.country,
            vipLevel: guest.vip_level,
            stayCount: reservations.where(status: %w[CHECKED_IN CHECKED_OUT]).count,
            lifetimeSpend: guest.folios.where(property_id: permitted_properties.select(:id), status: "CLOSED").sum(:grand_total).to_f,
            preferences: guest.preferences || "",
            notes: guest.notes,
            isBlacklisted: guest.blacklisted,
            recentReservations: reservations.order(check_in_date: :desc).limit(5).map do |reservation|
              {
                id: reservation.id,
                confirmationNumber: reservation.confirmation_number,
                checkInDate: reservation.check_in_date,
                checkOutDate: reservation.check_out_date,
                status: reservation.status,
                grandTotal: reservation.grand_total.to_f
              }
            end
          }
        end
      end
    end
  end
end
