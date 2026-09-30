module Api
  module V1
    module Pms
      class NightAuditController < BackendController
        def show
          property = default_property
          rooms = property.rooms.active.setup_managed
          total_rooms = rooms.count
          occupied_rooms = rooms.where(status: "OCCUPIED").count
          open_folios = property.folios.where(status: "OPEN")
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
          posted = 0.to_d
          count = 0
          property.folios.includes(reservation: { reservation_rooms: %i[room room_type] }).where(status: "OPEN").find_each do |folio|
            rr = folio.reservation.reservation_rooms.first
            nightly = rr&.nightly_rate || rr&.room_type&.base_price || 0
            vat_tax = property.company.tax_configurations.for_rooms.for_date(Date.current).find_by(code: "VAT")
            vat = vat_tax&.inclusive ? 0.to_d : (nightly * (vat_tax&.rate || 0) / 100).round(2)
            total = nightly + vat
            folio.folio_items.create!(
              source_module: "ROOM",
              description: "Night Audit Room Posting - Room ##{rr&.room&.room_number || 'Unassigned'}",
              quantity: 1,
              unit_price: nightly,
              sub_total: nightly,
              tax_amount: vat,
              total_amount: total,
              calculation_snapshot: {
                taxes: [{ code: "VAT", rate: vat_tax&.rate || 0, amount: vat }]
              }
            )
            folio.update!(
              sub_total: folio.sub_total + nightly,
              tax_amount: folio.tax_amount + vat,
              grand_total: folio.grand_total + total,
              balance_due: folio.balance_due + total
            )
            posted += total
            count += 1
          end
          audit!("NIGHT_AUDIT", "POST", "Property", property.id, new_values: { total_revenue_posted: posted.to_s, folios_audited: count })
          render json: {
            success: true,
            message: "End-of-Day Night Audit successfully executed for #{Date.current.iso8601}!",
            summary: {
              businessDateAD: Date.current.iso8601,
              businessDateBS: Date.current.iso8601,
              foliosAudited: count,
              totalRevenuePosted: posted.to_f,
              glVoucherNumber: "JV-NA-#{Date.current.strftime('%Y%m%d')}"
            }
          }
        end
      end
    end
  end
end
