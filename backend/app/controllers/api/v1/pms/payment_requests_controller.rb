module Api
  module V1
    module Pms
      class PaymentRequestsController < BackendController
        self.authorization_module_name = "FOLIOS"
        skip_before_action :authenticate!, only: %i[show start verify]
        skip_before_action :authorize_request!, only: %i[show start verify]

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
          PaymentRequest.includes(folio: :reservation).find_by!(public_token: params[:id])
        end

        def serialize(payment_request)
          folio = payment_request.folio
          {
            token: payment_request.public_token,
            kind: payment_request.kind,
            status: payment_request.status,
            gateway: payment_request.gateway,
            amount: payment_request.amount.to_f,
            currency: "NPR",
            folioNumber: folio.folio_number,
            confirmationNumber: folio.reservation.confirmation_number,
            balanceDue: folio.balance_due.to_f,
            totalPaid: folio.total_paid.to_f,
            receiptNumber: payment_request.payment&.receipt_number,
            paymentUrl: "#{Payments::Gateway.frontend_url}/pay/#{payment_request.public_token}",
            expiresAt: payment_request.expires_at,
            availableGateways: Payments::Gateway.available.select { |_gateway, configured| configured }.keys,
            gatewayModes: Payments::Gateway.modes
          }
        end
      end
    end
  end
end
