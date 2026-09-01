module Api
  module V1
    module Pms
      class CheckoutController < BackendController
        def create
          folio = default_property.folios.includes(:reservation, :guest, :payments, :folio_items).find(params.require(:folioId))
          Folio.transaction do
            update_totals!(folio)
            if folio.balance_due.positive?
              folio.payments.create!(
                receipt_number: DocumentNumbers::NextNumber.call(company: Current.company, property: default_property, document_type: "PAYMENT"),
                payment_method: params[:paymentMethod].presence || "FONEPAY",
                amount: folio.balance_due,
                notes: "Checkout balance settlement",
                paid_at: Time.current
              )
            end
            update_totals!(folio)
            folio.update!(status: "CLOSED", closed_at: Time.current, balance_due: 0)
            folio.reservation.update!(status: "CHECKED_OUT", checked_out_at: Time.current)
            folio.reservation.reservation_rooms.includes(:room).each { |rr| rr.room&.update!(status: "VACANT_DIRTY") }
            audit!("PMS_FRONTDESK", "CHECKOUT", "Folio", folio.id, new_values: { folio_number: folio.folio_number })
          end
          render json: { success: true, data: { folioNumber: folio.folio_number, journalVoucher: "JV-CHECKOUT-#{folio.folio_number}" } }
        end

        private

        def update_totals!(folio)
          folio.reload
          sub_total = folio.folio_items.where(voided: false).sum(:sub_total)
          tax_amount = folio.folio_items.where(voided: false).sum(:tax_amount)
          total_paid = folio.payments.sum(:amount)
          grand_total = sub_total + tax_amount
          folio.update!(sub_total:, tax_amount:, grand_total:, total_paid:, balance_due: [ grand_total - total_paid, 0 ].max)
        end
      end
    end
  end
end
