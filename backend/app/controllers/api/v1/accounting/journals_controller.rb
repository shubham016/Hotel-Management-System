module Api
  module V1
    module Accounting
      class JournalsController < BackendController
        def index
          company = default_property.company
          vouchers = company.journal_entries.includes(journal_lines: :account).order(created_at: :desc).limit(50)
          render json: { success: true, vouchers: vouchers.map { |voucher| serialize(voucher) }, accounts: company.accounts.order(:account_code).as_json }
        end

        def create
          company = default_property.company
          entries = Array(params[:entries])
          total_debit = entries.sum { |entry| BigDecimal((entry[:debitAmount] || 0).to_s) }
          total_credit = entries.sum { |entry| BigDecimal((entry[:creditAmount] || 0).to_s) }
          unless (total_debit - total_credit).abs <= BigDecimal("0.01") && total_debit.positive?
            raise ApiError.new("Journal Voucher is not balanced! Total Debit (Rs. #{total_debit.to_f.round(2)}) must equal Total Credit (Rs. #{total_credit.to_f.round(2)}).", status: :bad_request, code: "UNBALANCED_JOURNAL")
          end

          voucher = company.journal_entries.create!(
            voucher_number: DocumentNumbers::NextNumber.call(company:, property: default_property, document_type: "JOURNAL"),
            voucher_type: params[:voucherType].presence || "JOURNAL",
            property: default_property,
            posting_date: default_property.operating_date,
            nepali_date: Date.current.iso8601,
            narration: params[:narration].presence || "General Ledger Manual Journal Entry",
            total_debit:,
            total_credit:,
            status: "POSTED",
            source_module: "MANUAL_GL"
          )
          entries.each do |entry|
            voucher.journal_lines.create!(
              account_id: entry[:accountId],
              memo: entry[:narration].presence || voucher.narration,
              debit: entry[:debitAmount].presence || 0,
              credit: entry[:creditAmount].presence || 0
            )
          end
          audit!("GENERAL_LEDGER", "POST", "JournalEntry", voucher.id, new_values: { voucher_number: voucher.voucher_number, total_debit: total_debit.to_s })
          render json: { success: true, message: "Journal voucher posted successfully!", data: voucher.as_json }
        end

        private

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
