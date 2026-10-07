module Api
  module V1
    module Pms
      class PaymentRequestsController < BackendController
        self.authorization_module_name = "FOLIOS"
        skip_before_action :authenticate!, only: %i[show start verify options]
        skip_before_action :authorize_request!, only: %i[show start verify options]

        def options
          render json: { success: true, data: { availableGateways: Payments::Gateway.public_available } }
        end

        def create
          folio = default_property.folios.includes(:reservation).find(params.require(:folioId))
          kind = params.require(:kind).to_s.upcase
          raise ApiError.new("Invalid payment purpose", status: :unprocessable_content, code: "INVALID_PAYMENT_KIND") unless kind.in?(PaymentRequest::KINDS)

          amount = kind == "CHECKOUT" ? folio.balance_due : params.require(:amount)
          payment_request = Payments::Requests.create!(folio:, kind:, amount:)
          render json: { success: true, data: serialize(payment_request.reload) }, status: :created
        end

        def show
          render json: { success: true, data: serialize(find_request) }
        end

        def start
          payment_request = find_request
          gateway = params.require(:gateway).to_s.upcase
          raise ApiError.new("Invalid gateway", status: :unprocessable_content, code: "INVALID_GATEWAY") unless gateway.in?(PaymentRequest::GATEWAYS)

          result = Payments::Requests.start!(payment_request, gateway)
          render json: { success: true, data: serialize(payment_request.reload).merge(redirect: result) }
        end

        def verify
          payment_request = Payments::Requests.verify!(find_request)
          render json: { success: true, data: serialize(payment_request) }
        end

        private

        def find_request
          PaymentRequest.includes(:payment, folio: [ :guest, { reservation: { reservation_rooms: :room_type } } ]).find_by!(public_token: params[:id])
        end

        def serialize(payment_request)
          folio = payment_request.folio
          reservation = folio.reservation
          payment = payment_request.payment
          {
            token: payment_request.public_token,
            kind: payment_request.kind,
            status: payment_request.status,
            gateway: payment_request.gateway,
            amount: payment_request.amount.to_f,
            currency: "NPR",
            folioNumber: folio.folio_number,
            confirmationNumber: folio.reservation.confirmation_number,
            guestName: folio.guest.full_name,
            checkInDate: reservation.check_in_date,
            checkOutDate: reservation.check_out_date,
            nights: (reservation.check_out_date - reservation.check_in_date).to_i,
            roomDescription: reservation.reservation_rooms.map { |room| room.room_type.name }.tally.map { |name, count| count > 1 ? "#{count} × #{name}" : name }.join(", "),
            adultsCount: reservation.adults_count,
            childrenCount: reservation.children_count,
            reservationStatus: reservation.status,
            bookingTotal: folio.grand_total.to_f,
            paidAt: payment&.paid_at,
            paymentMethod: payment&.payment_method,
            balanceDue: folio.balance_due.to_f,
            totalPaid: folio.total_paid.to_f,
            receiptNumber: payment&.receipt_number,
            paymentUrl: "#{Payments::Gateway.frontend_url}/pay/#{payment_request.public_token}",
            expiresAt: payment_request.expires_at,
            availableGateways: payment_request.public_checkout ? Payments::Gateway.public_available : Payments::Gateway.available.select { |_gateway, configured| configured }.keys,
            gatewayModes: Payments::Gateway.modes,
            canResume: Payments::Gateway.resumable_esewa?(payment_request)
          }
        end
      end
    end
  end
end
