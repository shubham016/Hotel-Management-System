module Api
  module V1
    module Banquet
      class BookingsController < BackendController
        def index
          property = default_property
          bookings = property.banquet_bookings.includes(:banquet_hall, :guest, banquet_transactions: [:user, :journal_entry]).order(:start_date_time)
          render json: { success: true, businessDate: property.operating_date, tax: ::Banquet::Quote.tax(property.company, property.operating_date),
            accounts: property.company.accounts.where(active: true).order(:account_code).select(&:cash_or_bank?).map { |a| { id: a.id, code: a.account_code, name: a.name } },
            halls: property.banquet_halls.where(active: true).order(theater_capacity: :desc).as_json, bookings: bookings.map { |booking| serialize(booking) } }
        end

        def show
          render json: { success: true, data: serialize(default_property.banquet_bookings.find(params[:id])) }
        end

        def create
          booking = ::Banquet::SaveBooking.call(property: default_property, params:)
          render json: { success: true, data: serialize(booking) }
        end

        def update
          booking = default_property.banquet_bookings.find(params[:id])
          booking = ::Banquet::SaveBooking.call(property: default_property, params:, booking:)
          render json: { success: true, data: serialize(booking) }
        end

        %w[receipt refund settle cancel reconcile].each do |operation|
          define_method(operation) do
            booking = default_property.banquet_bookings.find(params[:id])
            booking = ::Banquet::Finance.call(booking:, action: operation, params:)
            render json: { success: true, data: serialize(booking) }
          end
        end

        private

        def serialize(booking)
          {
            id: booking.id,
            bookingNumber: booking.booking_ref,
            eventName: booking.event_name,
            eventType: booking.event_type,
            hallId: booking.banquet_hall_id,
            hallName: booking.banquet_hall.name,
            hallCode: booking.banquet_hall.code,
            guestName: booking.guest.full_name,
            phone: booking.guest.phone,
            startDate: booking.start_date_time.to_date.iso8601,
            endDate: booking.end_date_time.to_date.iso8601,
            nepaliDate: booking.nepali_date,
            expectedPax: booking.pax_count,
            setupLayout: booking.hall_layout,
            hallRent: booking.hall_charge.to_f,
            cateringTotal: booking.catering_charge.to_f,
            hallNet: booking.hall_net.to_f,
            cateringNet: booking.catering_net.to_f,
            taxAmount: booking.tax_amount.to_f,
            tax: booking.tax_snapshot,
            grandTotal: booking.grand_total.to_f,
            advancePaid: booking.advance_paid.to_f,
            balanceDue: booking.balance_due.to_f,
            legacyAdvance: booking.legacy_advance.to_f,
            cancellationFee: booking.cancellation_fee.to_f,
            refundDue: booking.refund_due.to_f,
            cancellationReason: booking.cancellation_reason,
            notes: booking.notes,
            version: booking.lock_version,
            status: booking.status,
            transactions: booking.banquet_transactions.sort_by(&:created_at).map { |t| {
              id: t.id, kind: t.kind, number: t.document_number, amount: t.amount.to_f, method: t.payment_method,
              reference: t.transaction_reference, businessDate: t.business_date, createdAt: t.created_at,
              voucherNumber: t.journal_entry&.voucher_number, user: t.user.full_name, reason: t.reason
            } }
          }
        end
      end
    end
  end
end
