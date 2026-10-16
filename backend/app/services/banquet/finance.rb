module Banquet
  class Finance
    include Support
    METHODS = %w[CASH BANK_TRANSFER].freeze
    FIELDS = %w[amount paymentMethod accountId transactionRef reason cancellationFee version reconciliationMode voucherNumber confirmedUnposted].freeze

    def self.call(booking:, action:, params:)
      new(booking).call(action, params)
    end

    def initialize(booking)
      @booking, @property, @company = booking, booking.property, booking.property.company
    end

    def call(action, params)
      BusinessDays::Context.with(@property) do
        @booking.lock!
        key = retry_key(params)
        request_digest = Digest::SHA256.hexdigest(action + digest(params, FIELDS))
        existing = @booking.banquet_transactions.find_by(idempotency_key: key)
        if existing
          invalid!("This identifier was used for a different transaction", code: "RETRY_CONFLICT", status: :conflict) unless existing.request_digest == request_digest
          return @booking
        end
        BusinessDays::Context.ensure_cashier_open!(@property)
        invalid!("Reconcile the earlier advance before recording transactions", code: "LEGACY_ADVANCE", status: :conflict) if action != "reconcile" && @booking.legacy_advance.positive?
        case action
        when "receipt"
          confirmed!
          amount = money(params.require(:amount), positive: true)
          invalid!("Payment exceeds the remaining balance") if amount > @booking.balance_due
          receive(amount, params, key, request_digest)
        when "refund"
          invalid!("Completed events cannot be refunded here", status: :conflict) unless @booking.status.in?(%w[CONFIRMED CANCELLED])
          amount = money(params.require(:amount), positive: true)
          limit = @booking.status == "CANCELLED" ? @booking.refund_due : @booking.advance_paid
          invalid!("Refund exceeds the refundable balance") if amount > limit
          reason!(params)
          tender = tender(params)
          bank_reference_available!(tender, ["REFUND"])
          journal = post("REFUND", key, [[deposit, amount, 0], [tender[:account], 0, amount]], tender[:method])
          transaction("REFUND", amount, key, request_digest, journal:, tender:, reason: params[:reason])
          @booking.update!(advance_paid: @booking.advance_paid - amount)
        when "settle"
          confirmed!
          version!(params)
          invalid!("Complete the event on or after its scheduled date", status: :conflict) if @booking.start_date_time.to_date > @property.operating_date
          receive(@booking.balance_due, params, "#{key}-balance", request_digest) if @booking.balance_due.positive?
          lines = [[deposit, @booking.grand_total, 0], [account("4004", "Venue Hire Revenue", "REVENUE"), 0, @booking.hall_net],
            [account("4002", "F&B Revenue", "REVENUE"), 0, @booking.catering_net], [account("2100", "VAT Payable", "LIABILITY"), 0, @booking.tax_amount]]
          journal = post("SETTLEMENT", key, lines)
          transaction("SETTLEMENT", @booking.grand_total, key, request_digest, journal:)
          @booking.update!(status: "COMPLETED", completed_at: Time.current)
        when "cancel"
          confirmed!
          version!(params)
          reason!(params)
          fee = money(params.require(:cancellationFee))
          invalid!("Cancellation charge exceeds the paid amount") if fee > @booking.advance_paid
          quote = Quote.call(hall: fee, catering: 0.to_d, tax: @booking.tax_snapshot.merge("inclusive" => true))
          journal = post("CANCELLATION", key, [[deposit, fee, 0], [account("4003", "Cancellation Revenue", "REVENUE"), 0, quote[:hall_net]], [account("2100", "VAT Payable", "LIABILITY"), 0, quote[:tax_amount]]])
          transaction("CANCELLATION", fee, key, request_digest, journal:, reason: params[:reason])
          @booking.update!(status: "CANCELLED", cancelled_at: Time.current, cancellation_reason: params[:reason].to_s.strip, cancellation_fee: fee)
        when "reconcile"
          reconcile(params, key, request_digest)
        else
          invalid!("Invalid banquet action")
        end
        audit(@booking, action.upcase, { reference: @booking.booking_ref, transaction_key: key, paid: @booking.advance_paid.to_s, status: @booking.status })
        @booking
      end
    rescue ActiveRecord::RecordNotUnique
      invalid!("This transaction or transfer reference was already recorded", code: "RETRY_CONFLICT", status: :conflict)
    end

    private

    def confirmed!
      invalid!("Only confirmed events allow this action", status: :conflict) unless @booking.status == "CONFIRMED"
    end

    def version!(params)
      invalid!("Event changed. Refresh before continuing.", code: "STALE_EVENT", status: :conflict) unless Integer(params[:version].to_s, exception: false) == @booking.lock_version
    end

    def reason!(params)
      invalid!("Enter a reason") if params[:reason].to_s.strip.length < 3
    end

    def account(code, name, category)
      record = @company.accounts.find_or_create_by!(account_code: code) { |a| a.assign_attributes(name:, category:) }
      invalid!("Review account #{code} in Chart of Accounts", code: "ACCOUNT_CONFIGURATION", status: :conflict) unless record.active && record.category == category
      record
    end

    def deposit
      account("2203", "Banquet Deposits", "LIABILITY")
    end

    def tender(params)
      method = params.require(:paymentMethod).to_s
      invalid!("Select Cash or Bank Transfer") unless method.in?(METHODS)
      cash = @company.accounts.find(params.require(:accountId))
      invalid!("Select an active cash or bank account") unless cash.active && cash.cash_or_bank?
      reference = params[:transactionRef].to_s.strip
      invalid!("Bank transfer reference is required") if method == "BANK_TRANSFER" && reference.blank?
      { method:, account: cash, reference: }
    end

    def receive(amount, params, key, request_digest)
      payment = tender(params)
      bank_reference_available!(payment, %w[RECEIPT LEGACY_LINK])
      journal = post("RECEIPT", key, [[payment[:account], amount, 0], [deposit, 0, amount]], payment[:method])
      transaction("RECEIPT", amount, key, request_digest, journal:, tender: payment)
      @booking.update!(advance_paid: @booking.advance_paid + amount)
    end

    def reconcile(params, key, request_digest)
      invalid!("No earlier advance requires reconciliation", status: :conflict) unless @booking.legacy_advance.positive?
      invalid!("Only confirmed or cancelled events can reconcile an earlier advance", status: :conflict) unless @booking.status.in?(%w[CONFIRMED CANCELLED])
      reason!(params)
      payment = tender(params)
      amount = @booking.legacy_advance
      if params[:reconciliationMode] == "LINK"
        journal = @property.journal_entries.includes(:journal_lines).find_by!(voucher_number: params.require(:voucherNumber), status: "POSTED", source_module: "MANUAL_GL")
        journal.lock!
        lines = journal.journal_lines.to_a
        valid = journal.posting_date <= @property.operating_date && journal.total_debit == amount && journal.total_credit == amount && lines.size == 2 &&
          lines.any? { |l| l.account_id == payment[:account].id && l.debit == amount && l.credit.zero? } &&
          lines.any? { |l| l.account_id == deposit.id && l.credit == amount && l.debit.zero? }
        invalid!("Select the matching posted cash/bank receipt to Banquet Deposits", code: "INVALID_PRIOR_RECEIPT") unless valid
        transaction("LEGACY_LINK", amount, key, request_digest, journal:, tender: payment, reason: params[:reason], date: journal.posting_date)
      elsif params[:reconciliationMode] == "POST_NEW" && params[:confirmedUnposted] == true
        bank_reference_available!(payment, %w[RECEIPT LEGACY_LINK])
        journal = post("RECEIPT", key, [[payment[:account], amount, 0], [deposit, 0, amount]], payment[:method])
        transaction("RECEIPT", amount, key, request_digest, journal:, tender: payment, reason: params[:reason])
      else
        invalid!("Link the prior receipt or confirm that it has not been posted")
      end
      @booking.update!(legacy_advance: 0)
    end

    def bank_reference_available!(payment, kinds)
      if payment[:method] == "BANK_TRANSFER" && BanquetTransaction.joins(:banquet_booking).where(banquet_bookings: { property_id: @property.id }, kind: kinds, payment_method: "BANK_TRANSFER", transaction_reference: payment[:reference]).exists?
        invalid!("This bank transfer has already been recorded", code: "PAYMENT_CONFLICT", status: :conflict)
      end
    end

    def post(kind, key, lines, method = nil)
      lines = lines.reject { |_, debit, credit| debit.zero? && credit.zero? }
      return if lines.empty?
      debit = lines.sum { |line| line[1] }
      credit = lines.sum { |line| line[2] }
      invalid!("Event amounts do not balance. Review the booking.", code: "UNBALANCED_EVENT", status: :conflict) unless debit == credit
      entry = @company.journal_entries.create!(property: @property, voucher_number: DocumentNumbers::NextNumber.call(company: @company, property: @property, document_type: "JOURNAL"),
        voucher_type: kind == "RECEIPT" ? "RECEIPT" : kind == "REFUND" ? "PAYMENT" : "JOURNAL", posting_date: @property.operating_date,
        nepali_date: Calendars::BikramSambat.iso(@property.operating_date), narration: "Banquet #{kind.downcase} - #{@booking.booking_ref}",
        total_debit: debit, total_credit: credit, status: "POSTED", source_module: "BANQUET", source_reference: "BANQUET:#{@booking.id}:#{kind}:#{key}", payment_method: method)
      lines.each { |acc, dr, cr| entry.journal_lines.create!(account: acc, debit: dr, credit: cr, memo: entry.narration) }
      entry
    end

    def transaction(kind, amount, key, request_digest, journal: nil, tender: nil, reason: nil, date: @property.operating_date)
      @booking.banquet_transactions.create!(kind:, amount:, idempotency_key: key, request_digest:, journal_entry: journal,
        account: tender&.dig(:account), payment_method: tender&.dig(:method), transaction_reference: tender&.dig(:reference),
        user: Current.user, reason:, business_date: date,
        document_number: DocumentNumbers::NextNumber.call(company: @company, property: @property, document_type: "PAYMENT"))
    end
  end
end
