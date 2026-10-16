module Api
  module V1
    class DashboardController < BackendController
      TREND_DAYS = 7

      def show
        property = default_property
        company = property.company
        today = property.operating_date

        return render json: compact_dashboard(property, company, today) if params[:compact] == "true"

        days = (TREND_DAYS - 1).downto(0).map { |offset| today - offset.days }

        rooms = property.rooms.active.setup_managed
        total_rooms = rooms.count
        occupied_rooms = rooms.where(status: %w[OCCUPIED DUE_OUT]).count

        render json: {
          success: true,
          businessDate: today.iso8601,
          occupancy: occupancy_stats(rooms, total_rooms, occupied_rooms),
          guests: guest_stats(property, days),
          revenue: revenue_stats(property, today, occupied_rooms, total_rooms),
          receivables: { pendingReceivables: property.folios.where(status: "OPEN").sum(:balance_due).to_f },
          arrivals: arrivals(property, today),
          recentTransactions: recent_transactions(property),
          housekeeping: housekeeping_stats(rooms),
          pos: pos_stats(property, days),
          trends: trends(property, days),
          rooms: room_board(property.rooms.setup_managed)
        }
      end

      private

      # The front-desk landing screen only displays these live operational
      # sections. Avoid calculating the 7-day analytics series until a screen
      # that consumes it asks for the complete dashboard payload.
      def compact_dashboard(property, company, today)
        rooms = property.rooms.active.setup_managed

        {
          success: true,
          businessDate: today.iso8601,
          receivables: { pendingReceivables: property.folios.where(status: "OPEN").sum(:balance_due).to_f },
          arrivals: arrivals(property, today),
          recentTransactions: recent_transactions(property),
          housekeeping: housekeeping_stats(rooms),
          pos: pos_stats(property, [ today ]),
          rooms: room_board(property.rooms.setup_managed)
        }
      end

      def occupancy_stats(rooms, total_rooms, occupied_rooms)
        {
          totalRooms: total_rooms,
          occupiedRooms: occupied_rooms,
          vacantRooms: rooms.where(status: %w[VACANT_CLEAN VACANT_DIRTY]).count,
          occupancyPct: total_rooms.positive? ? (occupied_rooms.to_f / total_rooms * 100).round(1) : 0
        }
      end

      def guest_stats(property, days)
        today = days.last
        in_house = property.reservations.where(status: "CHECKED_IN")
        {
          todayArrivals: arrivals_on(property, today),
          todayDepartures: departures_on(property, today),
          inHouseGuests: in_house.sum(:adults_count) + in_house.sum(:children_count),
          overdueArrivals: property.reservations.where(status: %w[INQUIRY CONFIRMED]).where("check_in_date < ?", today).count,
          overdueDepartures: in_house.where("check_out_date <= ?", property.overdue_departure_cutoff_date).count
        }
      end

      # A reservation counts as having arrived/departed on a given day if that day is its
      # check-in/check-out date and it wasn't cancelled or a no-show — this stays correct
      # both for "today" (regardless of whether the guest has actually checked in yet) and
      # for past days in the trend series, using only the current (terminal) status column.
      def arrivals_on(property, day)
        property.reservations.where(check_in_date: day).where.not(status: %w[CANCELLED NO_SHOW ARCHIVED]).count
      end

      def departures_on(property, day)
        property.reservations.where(check_out_date: day).where.not(status: %w[CANCELLED NO_SHOW ARCHIVED]).count
      end

      def in_house_on(property, day)
        finish = (day + 1).in_time_zone
        property.reservations
          .where("checked_in_at < :finish OR (checked_in_at IS NULL AND status IN ('CHECKED_IN', 'CHECKED_OUT') AND check_in_date <= :day)", finish:, day:)
          .where("checked_out_at >= :finish OR (checked_out_at IS NULL AND (status = 'CHECKED_IN' OR (status = 'CHECKED_OUT' AND check_out_date > :day)))", finish:, day:)
          .sum("adults_count + children_count")
      end

      # Operational KPIs use this property's posted ledger. Historical checkout
      # entries can be attributed through their persisted folio reference.
      def ledger_entries(property)
        property.company.journal_entries.where(status: "POSTED")
          .where("journal_entries.property_id = :id OR (journal_entries.property_id IS NULL AND journal_entries.source_reference IN (SELECT 'PMS_CHECKOUT:' || id::text FROM folios WHERE property_id = :id))", id: property.id)
      end

      def revenue_stats(property, today, occupied_rooms, total_rooms)
        by_code = revenue_by_account_code(property, today)
        room = by_code["4001"].to_f
        fnb = by_code["4002"].to_f
        banquet = by_code["4004"].to_f
        total = by_code.values.sum.to_f

        {
          today: { room:, fnb:, banquet:, total: },
          adr: occupied_rooms.positive? ? (room / occupied_rooms).round(2) : 0,
          revPar: total_rooms.positive? ? (room / total_rooms).round(2) : 0
        }
      end

      def revenue_by_account_code(property, day)
        JournalLine.joins(:account, :journal_entry)
                   .where(accounts: { company_id: property.company_id, category: "REVENUE" })
                   .where(journal_entry_id: ledger_entries(property).where(posting_date: day).select(:id))
                   .group("accounts.account_code").sum("journal_lines.credit - journal_lines.debit")
      end

      def revenue_total_on(property, day)
        revenue_by_account_code(property, day).values.sum(&:to_f)
      end

      def restaurant_orders_on(property, day)
        range = day.beginning_of_day..day.end_of_day
        settlements = ledger_entries(property).where(source_module: "POS_RESTAURANT", posting_date: day).count
        room_postings = FolioItem.joins(:folio).where(folios: { property_id: property.id }, source_module: "RESTAURANT", created_at: range).count
        settlements + room_postings
      end

      def arrivals(property, today)
        property.reservations.includes(:guest, reservation_rooms: :room)
                .where(status: %w[INQUIRY CONFIRMED], check_in_date: today)
                .order(:created_at).limit(5).map do |reservation|
          rr = reservation.reservation_rooms.first
          {
            confirmationNumber: reservation.confirmation_number,
            guestName: reservation.guest.full_name,
            room: rr&.room&.room_number || "Unassigned",
            adults: reservation.adults_count,
            balanceDue: (reservation.grand_total - reservation.advance_paid).to_f
          }
        end
      end

      def recent_transactions(property)
        ledger_entries(property).order(created_at: :desc).limit(5).map do |voucher|
          {
            voucherNumber: voucher.voucher_number,
            narration: voucher.narration,
            sourceModule: voucher.source_module,
            amount: voucher.total_debit.to_f,
            status: voucher.status,
            postedAt: voucher.created_at.iso8601
          }
        end
      end

      def housekeeping_stats(rooms)
        {
          clean: rooms.where(status: "VACANT_CLEAN").count,
          dirty: rooms.where(status: "VACANT_DIRTY").count,
          inspectionRequired: rooms.where(status: "INSPECTION_REQUIRED").count
        }
      end

      def room_board(rooms)
        rooms.includes(reservation_rooms: :reservation).by_floor_and_room_number.map do |room|
          {
            id: room.id,
            roomNumber: room.room_number,
            floor: room.floor,
            status: room.active? ? room.operational_status : "OUT_OF_SERVICE",
            hasActiveReservation: room.active_reservations.any?,
            active: room.active?
          }
        end
      end

      def pos_stats(property, days)
        tables = RestaurantTable.joins(:restaurant).where(restaurants: { property_id: property.id })
        {
          activeTables: tables.where(status: "OCCUPIED").count,
          totalTables: tables.count,
          ordersToday: restaurant_orders_on(property, days.last)
        }
      end

      # 7-day trailing series for the dashboard's stat-tile sparklines. Small multi-day query
      # fan-out is acceptable here — this endpoint is a low-traffic admin view, not a hot path.
      def trends(property, days)
        {
          arrivals: days.map { |d| arrivals_on(property, d) },
          departures: days.map { |d| departures_on(property, d) },
          inHouse: days.map { |d| in_house_on(property, d) },
          revenue: days.map { |d| revenue_total_on(property, d) },
          restaurantOrders: days.map { |d| restaurant_orders_on(property, d) }
        }
      end
    end
  end
end
