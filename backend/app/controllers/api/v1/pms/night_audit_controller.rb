module Api
  module V1
    module Pms
      class NightAuditController < BackendController
        def show
          property = default_property
          if params[:closingId].present?
            closing = property.business_day_closings.includes(:cashier_closing, :closed_by).find(params[:closingId])
            return render json: { success: true, closingReport: { id: closing.id, businessDate: closing.business_date, nextBusinessDate: closing.next_business_date, closedAt: closing.created_at, closedBy: closing.closed_by.full_name, cashier: closing.cashier_closing.as_json(except: :snapshot), summary: closing.snapshot } }
          end
          review = BusinessDays::Review.call(property)
          rooms = property.rooms.active.setup_managed
          total_rooms = rooms.count
          occupied_rooms = rooms.where(status: %w[OCCUPIED DUE_OUT]).count
          in_house = property.reservations.where(status: "CHECKED_IN")
          open_folios = property.folios.joins(:reservation).where(status: %w[OPEN SETTLED], reservations: { status: "CHECKED_IN" })
          render json: {
            success: true,
            currentDate: property.operating_date.iso8601,
            calendarDate: Date.current.iso8601,
            dailyClosingAvailable: true,
            canClose: Current.user.role.name == "SUPER_ADMIN" || Current.user.role.allows?("NIGHT_AUDIT", "close"),
            reconciliation: review,
            cashierClosing: property.cashier_closings.find_by(business_date: property.operating_date, status: "CLOSED")&.as_json(except: :snapshot),
            closingHistory: property.business_day_closings.includes(:closed_by, :cashier_closing).order(business_date: :desc).limit(10).map { |record| { id: record.id, businessDate: record.business_date, nextBusinessDate: record.next_business_date, closedBy: record.closed_by.full_name, closedAt: record.created_at, cashier: record.cashier_closing.as_json(except: :snapshot) } },
            pendingArrivals: review[:pendingArrivals],
            dueDepartures: review[:dueDepartures],
            overdueDepartures: in_house.where("check_out_date <= ?", property.overdue_departure_cutoff_date).count,
            unsettledOrders: KitchenOrder.where(property:).unsettled.count,
            occupiedTables: RestaurantTable.joins(:restaurant).where(restaurants: { property_id: property.id }, status: "OCCUPIED").count,
            totalRooms: total_rooms,
            occupiedRooms: occupied_rooms,
            occupancyRate: total_rooms.positive? ? ((occupied_rooms.to_f / total_rooms) * 100).round(1).to_s : "0",
            openFoliosCount: open_folios.count,
            unsettledBalanceTotal: open_folios.sum(:balance_due).to_f
          }
        end

        def create
          property = default_property
          operation = request.request_parameters["operation"]
          if operation.present?
            authorize!("NIGHT_AUDIT", "close")
            if operation == "CLASSIFY_RECEIPT"
              raise ApiError.new("Only an owner or administrator can classify earlier receipts", status: :forbidden, code: "FORBIDDEN") unless Current.user.role.name.in?(%w[OWNER ADMIN SUPER_ADMIN])
              record = property.company.journal_entries.where(property_id: [ nil, property.id ], source_module: "POS_RESTAURANT", posting_date: property.operating_date).find(params.require(:receiptId))
              if record.property_id.nil? && property.company.properties.count > 1 && !record.voucher_number.start_with?("JV-#{property.code}-")
                raise ActiveRecord::RecordNotFound
              end
              method = params.require(:paymentMethod)
              raise ApiError.new("Choose a valid payment method", status: :unprocessable_content, code: "INVALID_PAYMENT_METHOD") unless Payment::METHODS.include?(method)
              BusinessDays::Context.ensure_cashier_open!(property)
              record.update_columns(property_id: property.id, payment_method: method, updated_at: Time.current)
              audit!("NIGHT_AUDIT", "CLASSIFY_RECEIPT", "JournalEntry", record.id, new_values: { property_id: property.id, payment_method: method })
            else
              record = BusinessDays::Close.call(property:, params: params.permit(:businessDate, :openingCash, :countedCash, :notes).to_h.merge(action: operation))
            end
            return render json: { success: true, data: record.as_json, businessDate: property.reload.operating_date.iso8601 }
          end
          # Stay charges are already posted at booking. Add only overdue nights.
          result = Reservations::AutoExtendOverdue.call(property:)
          posted = result[:posted]
          count = result[:extended]
          audit!("NIGHT_AUDIT", "POST", "Property", property.id, new_values: { total_revenue_posted: posted.to_s, folios_audited: count, extension_conflicts: result[:conflicts], date: Date.current.iso8601 })
          render json: {
            success: true,
            message: result[:conflicts].positive? ? "Overnight check finished with room conflicts to resolve" : "Overnight stay check completed",
            summary: {
              businessDateAD: Date.current.iso8601,
              dailyClosingCompleted: false,
              foliosAudited: count,
              totalRevenuePosted: posted.to_f,
              extensionConflicts: result[:conflicts]
            }
          }
        end
      end
    end
  end
end
