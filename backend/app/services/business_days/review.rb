module BusinessDays
  class Review
    def self.call(property, date: property.operating_date)
      payments = Payment.joins(:folio).where(folios: { property_id: property.id })
        .where("payments.business_date = :date OR (payments.business_date IS NULL AND payments.paid_at >= :start AND payments.paid_at < :finish)", date:, start: date.in_time_zone, finish: (date + 1.day).in_time_zone)
      refunds = CancellationRefund.joins(:folio).where(folios: { property_id: property.id }, status: "PAID")
        .where("cancellation_refunds.business_date = :date OR (cancellation_refunds.business_date IS NULL AND cancellation_refunds.paid_at >= :start AND cancellation_refunds.paid_at < :finish)", date:, start: date.in_time_zone, finish: (date + 1.day).in_time_zone)
      pos = property.journal_entries.where(source_module: "POS_RESTAURANT", posting_date: date)
      legacy = property.company.journal_entries.where(property_id: nil, source_module: "POS_RESTAURANT", posting_date: date)
      legacy = legacy.where("voucher_number LIKE ?", "JV-#{ActiveRecord::Base.sanitize_sql_like(property.code)}-%") if property.company.properties.count > 1
      received = payments.group(:payment_method).sum(:amount)
      pos.group(:payment_method).sum(:total_debit).each { |method, total| received[method] = (received[method] || 0) + total }
      paid_out = refunds.group(:payment_method).sum(:refund_amount)
      tenders = (received.keys | paid_out.keys).sort_by(&:to_s).map { |method| { method: method || "UNCLASSIFIED", receipts: (received[method] || 0).to_s, refunds: (paid_out[method] || 0).to_s, net: ((received[method] || 0) - (paid_out[method] || 0)).to_s } }
      in_house = property.reservations.where(status: "CHECKED_IN")
      pending = property.reservations.where(status: %w[INQUIRY CONFIRMED]).where("check_in_date <= ?", date)
      due = in_house.where("check_out_date <= ?", date)
      orders = property.kitchen_orders.unsettled.count
      tables = RestaurantTable.joins(:restaurant).where(restaurants: { property_id: property.id }, status: "OCCUPIED").count
      gateways = PaymentRequest.joins(:folio).where(folios: { property_id: property.id }, status: "INITIATED").count
      entries = property.company.journal_entries.where(posting_date: date, status: "POSTED")
        .where("journal_entries.property_id = :id OR (journal_entries.property_id IS NULL AND journal_entries.source_reference IN (SELECT 'PMS_CHECKOUT:' || id::text FROM folios WHERE property_id = :id))", id: property.id).includes(journal_lines: :account)
      unbalanced = entries.count { |entry| entry.journal_lines.sum(&:debit) != entry.journal_lines.sum(&:credit) || entry.total_debit != entry.total_credit || entry.total_debit != entry.journal_lines.sum(&:debit) }
      folios = property.folios.where(status: %w[OPEN SETTLED]).includes(:folio_items, :payments)
      inconsistent = folios.count { |folio| folio.folio_items.reject(&:voided).sum(&:total_amount) != folio.grand_total || folio.payments.sum(&:amount) != folio.total_paid || [folio.grand_total - folio.total_paid, 0].max != folio.balance_due }
      lines = entries.flat_map(&:journal_lines)
      revenue = lines.select { |line| line.account.category == "REVENUE" }.sum { |line| line.credit - line.debit }
      vat = lines.select { |line| line.account.account_code == "2100" }.sum { |line| line.credit - line.debit }
      blockers = []
      blockers << "Resolve #{pending.count} pending arrival(s)" if pending.exists?
      blockers << "Check out or extend #{due.count} departure(s)" if due.exists?
      blockers << "Settle #{orders} restaurant order(s)" if orders.positive?
      blockers << "Release #{tables} occupied restaurant table(s)" if tables.positive?
      blockers << "Verify #{gateways} gateway payment(s)" if gateways.positive?
      blockers << "Review #{unbalanced} unbalanced journal(s)" if unbalanced.positive?
      blockers << "Review #{inconsistent} inconsistent guest folio(s)" if inconsistent.positive?
      unknown = legacy.to_a + pos.where(payment_method: nil).to_a
      blockers << "Classify #{unknown.size} restaurant receipt(s)" if unknown.any?
      { businessDate: date.iso8601, pendingArrivals: pending.count, dueDepartures: due.count, unsettledOrders: orders, occupiedTables: tables, pendingGatewayPayments: gateways, unbalancedJournals: unbalanced,
        tenders:, receiptCount: payments.count + pos.count, refundCount: refunds.count, cashNet: ((received["CASH"] || 0) - (paid_out["CASH"] || 0)).to_s,
        revenue: revenue.to_s, vat: vat.to_s, inconsistentFolios: inconsistent, openGuestBalance: property.folios.joins(:reservation).where(reservations: { status: "CHECKED_IN" }, status: %w[OPEN SETTLED]).sum(:balance_due).to_s,
        unclassifiedReceipts: unknown.map { |entry| { id: entry.id, voucherNumber: entry.voucher_number, amount: entry.total_debit.to_s } },
        receiptIds: payments.order(:id).pluck(:id), refundIds: refunds.order(:id).pluck(:id), posReceiptIds: pos.order(:id).pluck(:id), blockers: }
    end
  end
end
