module Api
  module V1
    module Pms
      class FrontdeskController < BackendController
        self.authorization_module_name = "PMS_FRONTDESK"

        def show
          property = default_property
          folios = property.folios.includes(:guest, :folio_items, :payments, reservation: { reservation_rooms: %i[room room_type] })
                           .joins(:reservation).where(status: %w[OPEN SETTLED], reservations: { status: "CHECKED_IN" }).order(created_at: :desc)
          arrivals = property.reservations.includes(:guest, :folio, reservation_rooms: %i[room room_type])
                             .where(status: %w[INQUIRY CONFIRMED]).where("check_in_date <= ?", property.operating_date).order(:check_in_date)
          render json: { success: true, folios: folios.map { |f| serialize_folio(f) }, arrivals: arrivals.map { |r| serialize_arrival(r) } }
        end

        def create
          reservation = default_property.reservations.includes(:guest, :folio, reservation_rooms: :room).find(params.require(:reservationId))
          Reservations::Lifecycle.check_in(reservation:, params: params.permit(:roomId, roomAssignments: %i[reservationRoomId roomId]))

          render json: { success: true, message: "Guest checked in successfully", folioId: reservation.reload.folio&.id }
        end

        private

        def serialize_folio(folio)
          rr = folio.reservation.reservation_rooms.first
          {
            id: folio.id,
            reservationId: folio.reservation_id,
            folioNumber: folio.folio_number,
            status: folio.status,
            guestId: folio.guest_id,
            guestName: folio.guest.full_name,
            phone: folio.guest.phone,
            email: folio.guest.email,
            vipLevel: folio.guest.vip_level,
            roomId: rr&.room&.id,
            roomNumber: folio.reservation.reservation_rooms.map { |item| item.room&.room_number || "Unassigned" }.join(", "),
            roomType: rr&.room_type&.name,
            checkInDate: folio.reservation.check_in_date,
            checkOutDate: folio.reservation.check_out_date,
            confirmationNumber: folio.reservation.confirmation_number,
            subTotal: folio.sub_total.to_f,
            serviceCharge: folio.service_charge.to_f,
            vatAmount: folio.tax_amount.to_f,
            discountAmount: 0,
            grandTotal: folio.grand_total.to_f,
            totalPaid: folio.total_paid.to_f,
            balanceDue: folio.balance_due.to_f,
            items: folio.folio_items.order(:created_at).map { |item| serialize_item(item) },
            payments: folio.payments.order(paid_at: :desc).map { |payment| serialize_payment(payment) }
          }
        end

        def serialize_arrival(reservation)
          rr = reservation.reservation_rooms.first
          {
            id: reservation.id,
            confirmationNumber: reservation.confirmation_number,
            guestName: reservation.guest.full_name,
            phone: reservation.guest.phone,
            email: reservation.guest.email,
            roomNumber: rr&.room&.room_number || "Unassigned",
            roomId: rr&.room&.id,
            roomCount: reservation.reservation_rooms.size,
            roomType: rr&.room_type&.name,
            checkInDate: reservation.check_in_date,
            checkOutDate: reservation.check_out_date,
            grandTotal: reservation.grand_total.to_f,
            advancePaid: reservation.advance_paid.to_f,
            status: reservation.status
          }
        end

        def serialize_item(item)
          taxes = Array(item.calculation_snapshot.to_h["taxes"] || item.calculation_snapshot.to_h[:taxes])
          service_charge = taxes.sum do |tax|
            tax = tax.with_indifferent_access
            tax[:code] == "SERVICE_CHARGE" ? BigDecimal(tax[:amount].to_s) : 0.to_d
          end
          {
            id: item.id,
            date: item.created_at.to_date.iso8601,
            sourceModule: item.source_module,
            description: item.description,
            quantity: item.quantity.to_f,
            unitPrice: item.unit_price.to_f,
            amount: item.sub_total.to_f,
            vatAmount: (item.tax_amount - service_charge).to_f,
            serviceCharge: service_charge.to_f
          }
        end

        def serialize_payment(payment)
          {
            id: payment.id,
            receiptNumber: payment.receipt_number,
            paymentMethod: payment.payment_method,
            amount: payment.amount.to_f,
            date: payment.paid_at.to_date.iso8601,
            notes: payment.notes
          }
        end
      end
    end
  end
end
