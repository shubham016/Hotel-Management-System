module Api
  module V1
    module Pms
      class ReservationsController < BaseController
        skip_before_action :authenticate!, only: :create
        skip_before_action :authorize_request!, only: :create
        before_action :authenticate_if_present!, only: :create
        self.authorization_module_name = "RESERVATIONS"

        def index
          property = require_property!
          reservations = property.reservations.includes(:guest, :folio, reservation_rooms: %i[room room_type]).order(created_at: :desc).limit(100)
          render json: { success: true, data: reservations.map { |reservation| serialize(reservation) } }
        end

        def show
          reservation = require_property!.reservations.includes(:guest, :folio, :reservation_rooms).find(params[:id])
          render json: { success: true, data: serialize(reservation) }
        end

        def update
          reservation = require_property!.reservations.includes(:guest, :folio, reservation_rooms: %i[room room_type]).find(params[:id])
          authorize!("RESERVATIONS", "update")
          reservation = Reservations::Lifecycle.modify(reservation:, params: lifecycle_params)
          render json: { success: true, data: serialize(reservation) }
        end

        def cancel
          reservation = require_property!.reservations.includes(:guest, :folio, reservation_rooms: %i[room room_type]).find(params[:id])
          authorize!("RESERVATIONS", "cancel")
          reservation = Reservations::Lifecycle.cancel(reservation:, params: lifecycle_params)
          render json: { success: true, data: serialize(reservation) }
        end

        def assign_room
          reservation = require_property!.reservations.includes(:guest, :folio, reservation_rooms: %i[room room_type]).find(params[:id])
          authorize!("RESERVATIONS", "assign_room")
          reservation = Reservations::Lifecycle.assign_room(reservation:, params: lifecycle_params)
          render json: { success: true, data: serialize(reservation) }
        end

        def check_in
          reservation = require_property!.reservations.includes(:guest, :folio, reservation_rooms: %i[room room_type]).find(params[:id])
          authorize!("PMS_FRONTDESK", "check_in")
          reservation = Reservations::Lifecycle.check_in(reservation:, params: lifecycle_params)
          render json: { success: true, data: serialize(reservation).merge(folioId: reservation.folio&.id) }
        end

        def extend_stay
          reservation = require_property!.reservations.includes(:guest, :folio, reservation_rooms: %i[room room_type]).find(params[:id])
          authorize!("PMS_FRONTDESK", "extend_stay")
          reservation = Reservations::Lifecycle.extend_stay(reservation:, params: lifecycle_params)
          render json: { success: true, data: serialize(reservation) }
        end

        def transfer_room
          reservation = require_property!.reservations.includes(:guest, :folio, reservation_rooms: %i[room room_type]).find(params[:id])
          authorize!("PMS_FRONTDESK", "transfer_room")
          reservation = Reservations::Lifecycle.transfer_room(reservation:, params: lifecycle_params)
          render json: { success: true, data: serialize(reservation) }
        end

        def create
          authorize_reservation_create! if Current.user
          create_params = reservation_params
          # Keep the source selected in the booking form. Staff entries default
          # to Walk-In; direct website entries default to Online.
          create_params[:source] = create_params[:source].presence || (Current.user ? "WALK_IN" : "ONLINE")
          result = Reservations::Create.call(
            params: create_params,
            request_context: { request_id: request.request_id, ip_address: request.remote_ip }
          )
          render json: {
            success: true,
            data: {
              id: result.reservation.id,
              confirmationNumber: result.reservation.confirmation_number,
              folioNumber: result.folio.folio_number,
              guestName: result.reservation.guest.full_name,
              roomName: result.reservation.reservation_rooms.first.room_type.name,
              roomId: result.reservation.reservation_rooms.first.room_id,
              roomNumber: result.reservation.reservation_rooms.first.room&.room_number,
              checkInDate: result.reservation.check_in_date,
              checkOutDate: result.reservation.check_out_date,
              nights: result.quote.nights,
              subTotal: result.quote.sub_total.to_f,
              serviceCharge: result.quote.service_charge.to_f,
              vatAmount: result.quote.vat_amount.to_f,
              grandTotal: result.quote.grand_total.to_f,
              paymentStatus: "PENDING"
            }
          }, status: :created
        end

        private

        def authorize_reservation_create!
          role = Current.user.role
          return if role.name == "SUPER_ADMIN"
          return if role.allows?("RESERVATIONS", "create") || role.allows?("PMS_FRONTDESK", "create")

          raise ApiError.new("You do not have permission to create reservations", status: :forbidden, code: "FORBIDDEN")
        end

        def authenticate_if_present!
          authenticate! if request.authorization.present?
        end

        def reservation_params
          params.permit(
            :propertyCode,
            :checkInDate,
            :checkOutDate,
            :roomTypeCode,
            :roomId,
            :ratePlanCode,
            :roomsCount,
            :adultsCount,
            :childrenCount,
            :firstName,
            :lastName,
            :email,
            :phone,
            :idType,
            :idNumber,
            :specialRequests,
            :source,
            addOns: {}
          )
        end

        def lifecycle_params
          params.permit(
            :id,
            :checkInDate,
            :checkOutDate,
            :newCheckOutDate,
            :roomTypeCode,
            :ratePlanCode,
            :roomsCount,
            :adultsCount,
            :childrenCount,
            :specialRequests,
            :roomId,
            :reason
          )
        end

        def serialize(reservation)
          rooms = reservation.reservation_rooms.map do |rr|
            {
              id: rr.id,
              roomTypeId: rr.room_type_id,
              roomType: rr.room_type.name,
              roomId: rr.room_id,
              roomNumber: rr.room&.room_number,
              nightlyRate: rr.nightly_rate.to_f,
              nights: rr.nights
            }
          end
          {
            id: reservation.id,
            confirmationNumber: reservation.confirmation_number,
            status: reservation.status,
            source: reservation.source,
            checkInDate: reservation.check_in_date,
            checkOutDate: reservation.check_out_date,
            guest: {
              id: reservation.guest_id,
              name: reservation.guest.full_name,
              phone: reservation.guest.phone,
              idType: reservation.guest.id_type,
              idNumber: reservation.guest.id_number
            },
            adultsCount: reservation.adults_count,
            childrenCount: reservation.children_count,
            grandTotal: reservation.grand_total.to_f,
            advancePaid: reservation.advance_paid.to_f,
            folioNumber: reservation.folio&.folio_number,
            rooms:
          }
        end
      end
    end
  end
end
