module Api
  module V1
    module Accounting
      class JournalsController < BackendController
        def index
          company = default_property.company
          vouchers = company.journal_entries.includes(journal_lines: :account).order(created_at: :desc)
          render json: { success: true, vouchers: vouchers.map { |voucher| serialize(voucher) }, accounts: company.accounts.where(active: true).order(:account_code).as_json }
        end

        def create
          company = default_property.company
          entries = params[:entries]
          invalid!("Enter at least two journal lines") unless entries.is_a?(Array) && entries.size >= 2
          entries = entries.map do |entry|
            invalid!("Invalid journal line") unless entry.respond_to?(:permit)
            debit = amount!(entry[:debitAmount])
            credit = amount!(entry[:creditAmount])
            invalid!("Each line must have either a debit or a credit") unless debit.positive? != credit.positive?
            account = company.accounts.where(active: true).find_by(id: entry[:accountId])
            invalid!("Select an active account in this company") unless account
            { account: account, debit: debit, credit: credit, memo: entry[:narration] }
          end
          total_debit = entries.sum { |entry| entry[:debit] }
          total_credit = entries.sum { |entry| entry[:credit] }
          invalid!("Journal total exceeds the supported amount") if total_debit >= 1_000_000_000_000 || total_credit >= 1_000_000_000_000
          unless total_debit == total_credit && total_debit.positive?
            raise ApiError.new("Journal Voucher is not balanced! Total Debit (Rs. #{total_debit.to_f.round(2)}) must equal Total Credit (Rs. #{total_credit.to_f.round(2)}).", status: :bad_request, code: "UNBALANCED_JOURNAL")
          end
          type = params[:voucherType].presence || "JOURNAL"
          invalid!("Invalid voucher type") unless type.in?(%w[JOURNAL PAYMENT RECEIPT CONTRA])
          invalid!("Enter a narration") if params[:narration].blank?

          voucher = company.journal_entries.create!(
            voucher_number: DocumentNumbers::NextNumber.call(company:, property: default_property, document_type: "JOURNAL"),
            voucher_type: type,
            property: default_property,
            posting_date: default_property.operating_date,
            nepali_date: Calendars::BikramSambat.iso(default_property.operating_date),
            narration: params[:narration].presence || "General Ledger Manual Journal Entry",
            total_debit:,
            total_credit:,
            status: "POSTED",
            source_module: "MANUAL_GL"
          )
          entries.each do |entry|
            voucher.journal_lines.create!(
              account: entry[:account],
              memo: entry[:memo].presence || voucher.narration,
              debit: entry[:debit],
              credit: entry[:credit]
            )
          end
          audit!("GENERAL_LEDGER", "POST", "JournalEntry", voucher.id, new_values: { voucher_number: voucher.voucher_number, total_debit: total_debit.to_s })
          render json: { success: true, message: "Journal voucher posted successfully!", data: voucher.as_json }
        end

        private

        def invalid!(message)
          raise ApiError.new(message, status: :unprocessable_content, code: "INVALID_JOURNAL")
        end

        def amount!(value)
          value = value.presence || "0"
          invalid!("Use nonnegative amounts with at most two decimal places") unless value.to_s.match?(/\A\d{1,12}(?:\.\d{1,2})?\z/)
          BigDecimal(value.to_s)
        end

        def serialize(voucher)
          {
            id: voucher.id,
            voucherNumber: voucher.voucher_number,
            voucherType: voucher.voucher_type,
            status: voucher.status,
            voucherDate: voucher.posting_date,
            nepaliDate: voucher.nepali_date,
            narration: voucher.narration,
            sourceModule: voucher.source_module,
            totalAmount: voucher.total_debit.to_f,
            entries: voucher.journal_lines.map do |line|
              {
                id: line.id,
                accountId: line.account_id,
                account: line.account.as_json,
                debitAmount: line.debit.to_f,
                creditAmount: line.credit.to_f,
                narration: line.memo
              }
            end
          }
        end
      end
    end
  end
end
