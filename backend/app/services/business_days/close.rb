module BusinessDays
  class Close
    def self.call(property:, params:, user: Current.user)
      Context.with(property) do
        date = Date.iso8601(params[:businessDate].to_s)
        action = params[:action].to_s
        existing = property.business_day_closings.find_by(business_date: date)
        return existing if existing && action == "CLOSE_DAY"
        raise ApiError.new("Business date changed. Refresh before continuing.", status: :conflict, code: "BUSINESS_DATE_CHANGED") unless property.operating_date == date
        case action
        when "CLOSE_CASHIER"
          closed = property.cashier_closings.find_by(business_date: date, status: "CLOSED")
          return closed if closed
          review = Review.call(property)
          # Cashier closure can precede operational clearance, but all receipts must be final.
          if review[:pendingGatewayPayments].positive? || review[:unclassifiedReceipts].any?
            raise ApiError.new("Verify payments and classify restaurant receipts before closing the cashier", status: :conflict, code: "CASHIER_NOT_READY")
          end
          opening = money(params[:openingCash])
          counted = money(params[:countedCash])
          expected = opening + BigDecimal(review[:cashNet])
          raise ApiError.new("Opening cash does not cover cash refunds", status: :unprocessable_content, code: "INSUFFICIENT_OPENING_CASH") if expected.negative?
          variance = counted - expected
          notes = params[:notes].to_s.strip
          raise ApiError.new("Explain the cash difference before closing", status: :unprocessable_content, code: "VARIANCE_REASON_REQUIRED") if !variance.zero? && notes.length < 3
          property.update!(business_date: date) unless property.business_date
          record = property.cashier_closings.create!(closed_by: user, business_date: date, opening_cash: opening, expected_cash: expected, counted_cash: counted, variance:, notes:, snapshot: review)
        when "REOPEN_CASHIER"
          record = property.cashier_closings.find_by!(business_date: date, status: "CLOSED")
          notes = params[:notes].to_s.strip
          raise ApiError.new("Enter a reason to reopen the cashier", status: :unprocessable_content, code: "REOPEN_REASON_REQUIRED") if notes.length < 3
          record.update!(status: "REOPENED", reopened_at: Time.current, reopen_reason: notes)
        when "CLOSE_DAY"
          raise ApiError.new("A future business date cannot be closed", status: :conflict, code: "FUTURE_BUSINESS_DATE") if date > Date.current
          review = Review.call(property)
          cashier = property.cashier_closings.find_by(business_date: date, status: "CLOSED")
          blockers = review[:blockers].dup
          blockers << "Close and reconcile the cashier" unless cashier
          if cashier && (cashier.snapshot.slice("receiptIds", "refundIds", "posReceiptIds") != review.stringify_keys.slice("receiptIds", "refundIds", "posReceiptIds") || cashier.snapshot["tenders"] != review[:tenders].map(&:stringify_keys))
            blockers << "Receipts changed. Reopen and reconcile the cashier"
          end
          raise ApiError.new(blockers.join(". "), status: :conflict, code: "DAY_NOT_READY", details: blockers) if blockers.any?
          record = property.business_day_closings.create!(closed_by: user, cashier_closing: cashier, business_date: date, next_business_date: date + 1.day, snapshot: review)
          property.update!(business_date: date + 1.day)
        else
          raise ApiError.new("Invalid closing action", status: :bad_request, code: "INVALID_ACTION")
        end
        AuditLog.create!(company: property.company, property:, user:, module_name: "NIGHT_AUDIT", action:, entity_type: record.class.name, entity_id: record.id, new_values: record.as_json, request_id: Current.request_id, ip_address: Current.ip_address)
        record
      end
    rescue Date::Error
      raise ApiError.new("Choose a valid business date", status: :unprocessable_content, code: "INVALID_DATE")
    end

    def self.money(value)
      amount = BigDecimal(value.to_s, exception: false)
      unless amount&.finite? && amount >= 0 && amount == amount.round(2)
        raise ApiError.new("Enter a non-negative cash amount with at most two decimals", status: :unprocessable_content, code: "INVALID_CASH_AMOUNT")
      end
      amount
    end
  end
end
