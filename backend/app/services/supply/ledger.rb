module Supply
  class Ledger
    include Support
    attr_reader :property
    def initialize(property)
      @property = property
    end
    def ready!
      invalid!("Reconcile opening stock in Inventory before recording stock or invoices", code: "OPENING_STOCK_REVIEW", status: :conflict) if property.supply_opening_review_required
    end
    def account(code, name, category)
      record = property.company.accounts.find_or_create_by!(account_code: code) { |a| a.assign_attributes(name:, category:) }
      invalid!("Review account #{code} in Chart of Accounts", code: "ACCOUNT_CONFIGURATION", status: :conflict) unless record.active && record.category == category
      record
    end
    def stock = account("1300", "Stock Inventory", "ASSET")
    def grni = account("2204", "Goods Received Not Invoiced", "LIABILITY")
    def payable = account("2001", "Accounts Payable", "LIABILITY")
    def input_vat = account("1301", "Input VAT", "ASSET")
    def rounding = account("6005", "Purchase Rounding", "EXPENSE")
    def journal(reference, narration, lines, method: nil, source: "SUPPLY")
      lines = lines.reject { |_, dr, cr| dr.zero? && cr.zero? }
      return if lines.empty?
      dr, cr = decimal(lines.sum { |l| l[1] }), decimal(lines.sum { |l| l[2] })
      invalid!("The accounting entry does not balance", status: :conflict) unless dr == cr
      record = property.company.journal_entries.create!(property:, voucher_number: number(property, "JOURNAL"), voucher_type: method ? "PAYMENT" : "JOURNAL",
        posting_date: property.operating_date, nepali_date: Calendars::BikramSambat.iso(property.operating_date), narration:, total_debit: dr, total_credit: cr,
        status: "POSTED", source_module: source, source_reference: reference, payment_method: method)
      lines.each { |a, debit, credit| record.journal_lines.create!(account: a, debit:, credit:, memo: narration) }
      record
    end
    def receipt(receipt)
      amount = decimal(receipt.stock_movements.sum(:total_cost))
      entry = journal("SUPPLY_RECEIPT:#{receipt.id}", "Stock receipt - #{receipt.receipt_number}", [[stock, amount, 0], [grni, 0, amount]])
      SupplyPosting.create!(property:, purchase_receipt: receipt, user: Current.user, journal_entry: entry, kind: "RECEIPT", idempotency_key: "receipt:#{receipt.id}", request_digest: receipt.request_digest)
    end
    def issue(movement)
      expense = movement.inventory_item.category.in?(%w[FOOD BEVERAGE]) ? account("5001", "Cost of Sales", "COST_OF_SALES") : account("6001", "Operating Expense", "EXPENSE")
      entry = journal("SUPPLY_ISSUE:#{movement.id}", "Stock issue - #{movement.document_number}", [[expense, movement.total_cost, 0], [stock, 0, movement.total_cost]])
      SupplyPosting.create!(property:, stock_movement: movement, user: Current.user, journal_entry: entry, kind: "ISSUE", idempotency_key: "issue:#{movement.id}", request_digest: movement.request_digest)
    end
    def opening(params)
      BusinessDays::Context.with(property) do
        retry_key = key(params)
        request_digest = digest(params, %w[mode reason confirmedReview])
        if (existing = SupplyPosting.find_by(property:, idempotency_key: retry_key))
          invalid!("This identifier was used for another reconciliation", status: :conflict) unless existing.request_digest == request_digest
          return existing
        end
        invalid!("Opening stock has already been reviewed", status: :conflict) unless property.supply_opening_review_required
        invalid!("Confirm the review and enter a reason") unless params[:confirmedReview] == true && params[:reason].to_s.strip.length >= 3
        value = decimal(StockBalance.joins(:store).where(stores: {property_id: property.id}).sum(:inventory_value))
        lines = stock.journal_lines.joins(:journal_entry).where(journal_entries: {property_id: property.id, status: "POSTED"})
        posted = lines.sum(:debit) - lines.sum(:credit)
        delta = value - posted
        entry = nil
        if params[:mode] == "LINK"
          invalid!("Posted stock does not match the current stock value") unless delta.zero?
        elsif params[:mode] == "ADJUST"
          equity = account("3000", "Owner Equity", "EQUITY")
          entry = journal("SUPPLY_OPENING:#{property.id}:#{retry_key}", "Reviewed opening stock adjustment", delta >= 0 ? [[stock, delta, 0], [equity, 0, delta]] : [[equity, -delta, 0], [stock, 0, -delta]])
        else
          invalid!("Select an opening stock reconciliation method")
        end
        record = SupplyPosting.create!(property:, user: Current.user, journal_entry: entry, kind: "OPENING", idempotency_key: retry_key, request_digest:, reason: params[:reason], snapshot: { stock_value: value.to_s, posted_value: posted.to_s, adjustment: delta.to_s })
        property.update!(supply_opening_review_required: false)
        audit(property, "RECONCILE_OPENING", record, record.snapshot)
        record
      end
    end
    def legacy_receipt(receipt, params)
      BusinessDays::Context.with(property) do
        retry_key = key(params)
        request_digest = digest(params, %w[mode voucherNumber reason confirmedUnposted])
        if (existing = receipt.supply_posting)
          invalid!("This receipt was already reconciled", status: :conflict) unless existing.idempotency_key == retry_key && existing.request_digest == request_digest
          return existing
        end
        invalid!("Enter the review reason") if params[:reason].to_s.strip.length < 3
        amount = decimal(receipt.stock_movements.sum(:total_cost))
        if params[:mode] == "LINK"
          entry = property.journal_entries.find_by!(voucher_number: params.require(:voucherNumber), status: "POSTED", source_module: "MANUAL_GL")
          entry.lock!
          lines = entry.journal_lines.to_a.reject { |l| l.debit.zero? && l.credit.zero? }
          valid = entry.total_debit == amount && entry.total_credit == amount && lines.size == 2 && lines.any? { |l| l.account_id == stock.id && l.debit == amount && l.credit.zero? } && lines.any? { |l| l.account_id == grni.id && l.credit == amount && l.debit.zero? }
          invalid!("Select the matching stock receipt to Goods Received Not Invoiced") unless valid && entry.posting_date <= property.operating_date
        elsif params[:mode] == "POST_NEW" && params[:confirmedUnposted] == true
          entry = journal("SUPPLY_RECEIPT:#{receipt.id}", "Reviewed earlier stock receipt - #{receipt.receipt_number}", [[stock, amount, 0], [grni, 0, amount]])
          property.update!(supply_opening_review_required: true)
        else
          invalid!("Link the prior receipt or confirm it was not posted")
        end
        record = SupplyPosting.create!(property:, purchase_receipt: receipt, user: Current.user, journal_entry: entry, kind: "RECEIPT", idempotency_key: retry_key, request_digest:, reason: params[:reason])
        audit(property, "RECONCILE_RECEIPT", record, {receipt: receipt.receipt_number, voucher: entry&.voucher_number})
        record
      end
    rescue ActiveRecord::RecordNotUnique
      invalid!("This receipt or voucher has already been reconciled", status: :conflict)
    end
  end
end
