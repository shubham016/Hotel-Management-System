module Api
  module V1
    module Accounting
      class PayrollController < BackendController
        self.authorization_module_name = "PAYROLL"
        before_action :require_payroll_admin!

        def index
          property = default_property
          render json: { success: true, property: property.name,
            payroll_period: period_details, current_bs_period: Calendars::BikramSambat.iso(Date.current).first(7),
            legacy_ad_periods: property.payroll_entries.visible.where(period_calendar: "AD").distinct.order(period: :desc).pluck(:period).map { |date| date.strftime("%Y-%m") },
            staff: property.staff_members.order(:name).as_json(only: %i[id name department active monthly_salary], methods: %i[basic_salary monthly_allowance]),
            accounts: property.company.accounts.where(active: true).order(:account_code).map { |account| account.as_json(only: %i[id account_code name category]).merge("cash_or_bank" => account.cash_or_bank?) },
            configuration: property.payroll_configuration&.as_json,
            entries: property.payroll_entries.visible.where(period: period, period_calendar: calendar_system).includes(:payroll_advances, :approval_journal, :payment_journal).order(:employee_name).map { |entry| serialize(entry) } }
        end

        def configure
          property = default_property
          property.with_lock do
            configuration = property.payroll_configuration || property.build_payroll_configuration
            configuration.assign_attributes(params.permit(:expense_account_id, :payable_account_id, :deductions_account_id, :advances_account_id, :tds_account_id))
            if configuration.changed? && property.payroll_entries.where.not(status: "PAID").where("approval_journal_id IS NOT NULL OR advance_amount > 0").exists?
              fail!("Settle outstanding payroll and advances before changing ledger accounts")
            end
            configuration.save!
            audit!("PAYROLL", "CONFIGURE", "PayrollConfiguration", configuration.id)
          end
          render json: { success: true }
        end

        def salary
          member = default_property.staff_members.find(params[:id])
          member.with_lock do
            member.update!(monthly_salary: money(:monthly_salary))
            audit!("PAYROLL", "SALARY", "StaffMember", member.id, new_values: { monthly_salary: member.monthly_salary.to_s, basic_salary: member.basic_salary.to_s, monthly_allowance: member.monthly_allowance.to_s })
          end
          render json: { success: true }
        end

        def create
          reject_removed_adjustments!
          params.require(:calendar) # An older AD client must never create a BS period silently.
          fail!("New payroll must use BS months; earlier AD entries remain available as history") unless calendar_system == "BS"
          property = default_property
          member = property.staff_members.where(active: true).find(params.require(:staff_member_id))
          member.with_lock do
            fail!("Set up this employee's monthly salary first") if member.monthly_salary.nil?
            fail!("Payroll already exists for this employee and month") if member.payroll_entries.exists?(period: period, period_calendar: "BS")
            entry = property.payroll_entries.create!(staff_member: member, period: period, period_calendar: "BS", employee_name: member.name,
              department: member.department, base_salary: member.basic_salary, monthly_allowance: member.monthly_allowance, net_pay: member.monthly_salary, tds_rate: 1)
            audit!("PAYROLL", "CREATE", "PayrollEntry", entry.id)
            render json: { success: true, entry: serialize(entry) }, status: :created
          end
        end

        def update
          with_entry do |entry|
            draft!(entry)
            reject_removed_adjustments!
            entry.assign_attributes(base_salary: money(:base_salary), notes: params[:notes].to_s.first(2000))
            entry.monthly_allowance = money(:monthly_allowance) if params.key?(:monthly_allowance)
            rate = money(:tds_rate)
            fail!("TDS rate must be between 0% and 100%") unless rate <= 100
            entry.tds_rate = rate
            entry.tds_reason = params[:tds_reason].to_s.strip.first(2000) if params.key?(:tds_reason)
            entry.save!
            audit!("PAYROLL", "UPDATE", "PayrollEntry", entry.id, new_values: { base_salary: entry.base_salary.to_s, monthly_allowance: entry.monthly_allowance.to_s, gross_salary: entry.gross_salary.to_s, tds_rate: entry.tds_rate.to_s, tds_amount: entry.tds_amount.to_s, tds_reason: entry.tds_reason })
          end
        end

        def approve
          with_entry do |entry|
            next unless entry.status == "DRAFT" # Repeated approval never posts twice.
            completed_month!(entry)
            fail!("Set a TDS rate before approving payroll") if entry.tds_review_required?
            configuration = configuration!
            gross = entry.gross_salary
            fail!("Payroll earnings must be greater than zero") unless gross.positive?
            fail!("Select a Salary TDS Payable ledger account before approving") if entry.tds_amount.positive? && configuration.tds_account.nil?
            journal = post_journal(entry, "Salary approval", Date.current, [
              [configuration.expense_account, gross, 0], [configuration.payable_account, 0, entry.net_pay],
              [configuration.deductions_account, 0, entry.deductions], [configuration.advances_account, 0, entry.advance_amount],
              [configuration.tds_account, 0, entry.tds_amount]
            ])
            entry.update!(status: "APPROVED", approval_journal: journal)
            audit!("PAYROLL", "APPROVE", "PayrollEntry", entry.id, new_values: { journal_id: journal.id, tds_rate: entry.tds_rate.to_s, tds_amount: entry.tds_amount.to_s })
          end
        end

        def advance
          with_entry do |entry|
            key = params.require(:request_key).to_s
            fail!("Invalid advance request") unless key.match?(/\A[a-zA-Z0-9-]{16,100}\z/)
            next if entry.payroll_advances.exists?(request_key: key)
            draft!(entry)
            configuration = configuration!
            date, method, reference, account = payment_details(configuration)
            fail!("Advance date cannot be before the payroll month") if date < entry.period
            amount = money(:amount)
            fail!("Advance must be greater than zero and cannot exceed remaining salary") unless amount.positive? && amount <= entry.net_pay
            journal = post_journal(entry, "Salary advance", date, [[configuration.advances_account, amount, 0], [account, 0, amount]])
            advance = entry.payroll_advances.create!(amount: amount, paid_on: date, payment_method: method, payment_reference: reference, request_key: key, journal_entry: journal)
            entry.update!(advance_amount: entry.advance_amount + amount)
            audit!("PAYROLL", "ADVANCE", "PayrollEntry", entry.id, new_values: { advance_id: advance.id, journal_id: journal.id, amount: amount.to_s })
          end
        end

        def pay
          with_entry do |entry|
            next if entry.status == "PAID"
            fail!("Approve payroll before recording payment") unless entry.status == "APPROVED"
            completed_month!(entry)
            configuration = configuration!
            date, method, reference, account = payment_details(configuration)
            fail!("Salary payment must be after the payroll month has ended") unless date > Date.iso8601(entry.period_details[:end_ad])
            fail!("Payment cannot predate payroll approval") if date < entry.approval_journal.posting_date
            journal = if entry.net_pay.positive?
              post_journal(entry, "Salary payment", date, [[configuration.payable_account, entry.net_pay, 0], [account, 0, entry.net_pay]])
            end
            entry.update!(status: "PAID", payment_journal: journal, paid_on: date, payment_method: method, payment_reference: reference)
            audit!("PAYROLL", "PAY", "PayrollEntry", entry.id, new_values: { journal_id: journal&.id, amount: entry.net_pay.to_s })
          end
        end

        private

        def reject_removed_adjustments!
          %i[earnings deductions].each do |field|
            fail!("Additional earnings and other deductions are disabled") if params.key?(field) && !money(field).zero?
          end
        end

        def require_payroll_admin!
          raise ApiError.new("Only the owner or all-rounder/admin can manage payroll", status: :forbidden, code: "FORBIDDEN") unless Current.user.role.name.in?(%w[OWNER ADMIN SUPER_ADMIN])
        end

        def with_entry
          property = default_property
          property.with_lock do
            entry = property.payroll_entries.visible.lock.find(params[:id])
            yield entry
            render json: { success: true, entry: serialize(entry) }
          end
        end

        def configuration!
          configuration = default_property.payroll_configuration
          fail!("Configure payroll ledger accounts before posting") unless configuration
          configuration.validate!
          configuration
        end

        def draft!(entry)
          fail!("Approved payroll cannot be edited") unless entry.status == "DRAFT"
        end

        def completed_month!(entry)
          fail!("Complete the payroll month before approving or releasing salary") unless Date.current > Date.iso8601(entry.period_details[:end_ad])
        end

        def period
          Date.iso8601(period_details[:start_ad])
        end

        def calendar_system
          value = params[:calendar].presence || "BS"
          fail!("Invalid payroll calendar") unless value.in?(%w[BS AD])
          value
        end

        def period_details
          @period_details ||= begin
            value = params.require(:period).to_s
            if calendar_system == "BS"
              Calendars::BikramSambat.month(value)
            else
              fail!("Invalid earlier AD payroll month") unless value.match?(/\A\d{4}-\d{2}\z/)
              date = Date.iso8601("#{value}-01")
              { system: "AD", period: value, label: date.strftime("%B %Y AD"), start_ad: date.iso8601, end_ad: date.end_of_month.iso8601 }
            end
          end
        rescue ArgumentError => error
          fail!(error.message)
        end

        def money(field)
          value = params.require(field).to_s
          fail!("#{field.to_s.humanize} must be a nonnegative amount with at most two decimal places") unless value.match?(/\A\d{1,12}(?:\.\d{1,2})?\z/)
          BigDecimal(value)
        end

        def payment_details(configuration)
          date = Date.iso8601(params.require(:paid_on).to_s)
          bs_date = Calendars::BikramSambat.iso(date)
          fail!("BS payment date does not match the actual payment date") if params[:bs_paid_on].present? && params[:bs_paid_on] != bs_date
          fail!("Payment date cannot be in the future") if date > Date.current
          property = default_property
          if property.business_day_closings.exists?(business_date: date) || property.cashier_closings.exists?(business_date: date, status: "CLOSED")
            raise ApiError.new("This payment date is closed. Reopen the cashier or choose an open payment date.", status: :conflict, code: "PAYROLL_PAYMENT_DATE_CLOSED")
          end
          method = params.require(:payment_method).to_s
          fail!("Select Cash or Bank Transfer") unless method.in?(%w[CASH BANK_TRANSFER])
          reference = params[:payment_reference].to_s.strip.first(200)
          fail!("Enter a bank transaction reference") if method == "BANK_TRANSFER" && reference.blank?
          account = default_property.company.accounts.where(active: true, category: "ASSET").find(params.require(:payment_account_id))
          fail!("Select a cash or bank ledger account for salary payment") unless account.cash_or_bank?
          fail!("Select a separate cash or bank account") if account.id == configuration.advances_account_id
          [date, method, reference, account]
        rescue ArgumentError => error
          fail!("Invalid payment date: #{error.message}")
        end

        def post_journal(entry, label, date, lines)
          lines = lines.reject { |_, debit, credit| debit == 0 && credit == 0 }
          total = lines.sum { |_, debit, _| debit }
          fail!("Payroll journal is not balanced") unless total.positive? && total == lines.sum { |_, _, credit| credit }
          company = default_property.company
          journal = company.journal_entries.create!(property: default_property, voucher_number: DocumentNumbers::NextNumber.call(company: company, property: default_property, document_type: "JOURNAL", date: date),
            voucher_type: "JOURNAL", posting_date: date, nepali_date: Calendars::BikramSambat.iso(date), narration: "#{label}: #{entry.employee_name}, #{entry.period_details[:label]} (#{default_property.code})",
            total_debit: total, total_credit: total, status: "POSTED", source_module: "PAYROLL")
          lines.each { |account, debit, credit| journal.journal_lines.create!(account: account, debit: debit, credit: credit, memo: journal.narration) }
          journal
        end

        def serialize(entry)
          details = entry.period_details
          entry.as_json.merge("gross_salary" => entry.gross_salary.to_s, "period_key" => details[:period], "period_label" => details[:label],
            "tds_review_required" => entry.tds_review_required?, "tds_fiscal_year" => entry.tds_fiscal_year,
            "period_start_ad" => details[:start_ad], "period_end_ad" => details[:end_ad], "paid_on_bs" => bs_date(entry.paid_on),
            "approval_voucher" => entry.approval_journal&.voucher_number,
            "payment_voucher" => entry.payment_journal&.voucher_number,
            "advances" => entry.payroll_advances.order(:created_at).map { |advance| advance.as_json(only: %i[id amount paid_on payment_method payment_reference]).merge("paid_on_bs" => bs_date(advance.paid_on)) })
        end

        def bs_date(date)
          Calendars::BikramSambat.iso(date) if date
        rescue ArgumentError
          nil
        end

        def fail!(message)
          raise ApiError.new(message, status: :unprocessable_content, code: "INVALID_PAYROLL")
        end
      end
    end
  end
end
