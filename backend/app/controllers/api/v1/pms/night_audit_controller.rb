module Api
  module V1
    module Pms
      class NightAuditController < BackendController
        def show
          property = default_property
          rooms = property.rooms.active.setup_managed
          total_rooms = rooms.count
          occupied_rooms = rooms.where(status: "OCCUPIED").count
          open_folios = property.folios.joins(:reservation).where(status: "OPEN", reservations: { status: "CHECKED_IN" })
          render json: {
            success: true,
            currentDate: Date.current.iso8601,
            currentNepaliDate: Date.current.iso8601,
            fiscalYear: Date.current.year.to_s,
            totalRooms: total_rooms,
            occupiedRooms: occupied_rooms,
            occupancyRate: total_rooms.positive? ? ((occupied_rooms.to_f / total_rooms) * 100).round(1).to_s : "0",
            openFoliosCount: open_folios.count,
            unsettledBalanceTotal: open_folios.sum(:balance_due).to_f
          }
        end

        def create
          property = default_property
          # Stay charges are already posted at booking. Add only overdue nights.
          result = Reservations::AutoExtendOverdue.call(property:)
          posted = result[:posted]
          count = result[:extended]
          audit!("NIGHT_AUDIT", "POST", "Property", property.id, new_values: { total_revenue_posted: posted.to_s, folios_audited: count })
          render json: {
            success: true,
            message: "End-of-Day Night Audit successfully executed for #{Date.current.iso8601}!",
            summary: {
              businessDateAD: Date.current.iso8601,
              businessDateBS: Date.current.iso8601,
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
