module Api
  module V1
    module Pms
      # Both checkout routes use the same payment guards and ledger posting.
      class CheckoutController < FoliosController
        def create
          params[:operation] = "SETTLE_AND_CHECKOUT"
          params[:settlementMethod] = params[:paymentMethod].presence || "CASH"
          super
        end
      end
    end
  end
end
