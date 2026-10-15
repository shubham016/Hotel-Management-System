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
          scope = property.reservations.where.not(status: "ARCHIVED").joins(:guest)
          scope = scope.where(id: params[:reservationId]) if params[:reservationId].present?
          scope = scope.where(status: params[:status]) if params[:status].present? && params[:status] != "ALL"
          scope = Reservations::Search.call(scope, params[:query])
          page = [params[:page].to_i, 1].max
          per_page = params[:perPage].present? ? params[:perPage].to_i.clamp(1, 100) : 100
          total = scope.count
          reservations = scope.includes(:guest, { folio: :cancellation_refund }, reservation_rooms: %i[room room_type]).order(created_at: :desc, id: :desc).offset((page - 1) * per_page).limit(per_page)
          render json: { success: true, data: reservations.map { |reservation| serialize(reservation) }, pagination: { page:, perPage: per_page, total:, totalPages: (total.to_f / per_page).ceil } }
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

        def destroy
          reservation = require_property!.reservations.where.not(status: "ARCHIVED").includes(:guest, :folio, reservation_rooms: %i[room room_type]).find(params[:id])
          reservation = Reservations::Lifecycle.archive(reservation:, params: { reason: "Deleted by staff from Reservations Matrix" })
          render json: { success: true, message: "Booking removed from the Reservations Matrix", data: { id: reservation.id } }
        end

        def refund
          authorize!("RESERVATIONS", "refund")
          reservation = require_property!.reservations.find(params[:id])
          reservation = Payments::CancellationRefunds.pay!(reservation:, params: params.permit(:refundMethod, :refundReference))
          render json: { success: true, data: serialize(reservation) }
        end

        def advance
          authorize!("FOLIOS", "create")
          reservation = require_property!.reservations.find(params[:id])
          Payments::ManualAdvance.call(reservation:, params: params.permit(:amount, :paymentMethod, :transactionRef, :idempotencyKey))
          render json: { success: true, data: serialize(reservation.reload) }
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

        def no_show
          reservation = require_property!.reservations.find(params[:id])
          Reservations::Lifecycle.no_show(reservation:, params: lifecycle_params)
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
          # Only authenticated staff may select an operational booking source.
          # Public callers are always website bookings and cannot impersonate a walk-in.
          create_params[:source] = Current.user ? (create_params[:source].presence || "WALK_IN") : "ONLINE"
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
              checkInTime: result.reservation.property.check_in_time,
              checkOutTime: result.reservation.property.check_out_time,
              nights: result.quote.nights,
              subTotal: result.quote.sub_total.to_f,
              vatAmount: result.quote.vat_amount.to_f,
              grandTotal: result.quote.grand_total.to_f,
              paymentStatus: "PENDING",
              paymentToken: result.payment_request&.public_token
            }
          }, status: :created
        end

        private

        def inferred_authorization_action
          return "cancel" if action_name == "no_show"
          return "read" if action_name == "advance"
          super
        end

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
            :paymentChoice,
            :advanceAmount,
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
            :reason,
            :expectedPaidAmount,
            :additionalNights,
            roomAssignments: %i[reservationRoomId roomId]
          )
        end

        def serialize(reservation)
          refund = reservation.folio&.cancellation_refund
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
            totalPaid: reservation.folio&.total_paid.to_f,
            cancellationRefund: refund && { status: refund.status, paidAmount: refund.paid_amount.to_f, deductionAmount: refund.deduction_amount.to_f, refundAmount: refund.refund_amount.to_f, paymentMethod: refund.payment_method, reference: refund.transaction_reference, paidAt: refund.paid_at },
            folioId: reservation.folio&.id,
            folioNumber: reservation.folio&.folio_number,
            rooms:
          }
        end
      end
    end
  end
end
