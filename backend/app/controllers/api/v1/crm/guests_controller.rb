module Api
  module V1
    module Crm
      class GuestsController < BackendController
        def index
          guests = default_property.company.guests.includes(:reservations).order(lifetime_spend: :desc)
          render json: { success: true, guests: guests.map { |guest| serialize(guest) } }
        end

        def create
          company = default_property.company
          guest = params[:id].present? ? company.guests.find(params[:id]) : company.guests.find_or_initialize_by(phone: params.require(:phone))
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
          {
            id: guest.id,
            name: guest.full_name,
            firstName: guest.first_name,
            lastName: guest.last_name,
            email: guest.email || "N/A",
            phone: guest.phone,
            city: guest.city || "Butwal / Nepal",
            country: guest.country,
            vipLevel: guest.vip_level,
            stayCount: guest.stay_count,
            lifetimeSpend: guest.lifetime_spend.to_f,
            preferences: guest.preferences || "Standard preferred amenities",
            isBlacklisted: guest.blacklisted,
            recentReservations: guest.reservations.order(check_in_date: :desc).limit(5).map do |reservation|
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
