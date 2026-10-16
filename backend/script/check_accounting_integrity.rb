# Read-only inspection of the current database. No financial records are changed.
ActiveRecord::Base.transaction do
  connection = ActiveRecord::Base.connection
  connection.execute("SET TRANSACTION READ ONLY")
  checks = {
    journal_totals: <<~SQL,
      SELECT j.id, j.voucher_number, j.source_module, j.status, j.property_id,
             j.total_debit::text, j.total_credit::text, COUNT(l.id) AS lines,
             COALESCE(SUM(l.debit),0)::text AS line_debit, COALESCE(SUM(l.credit),0)::text AS line_credit
      FROM journal_entries j LEFT JOIN journal_lines l ON l.journal_entry_id=j.id
      WHERE j.status='POSTED'
      GROUP BY j.id HAVING COUNT(l.id)<2 OR j.total_debit<>j.total_credit
        OR j.total_debit<>COALESCE(SUM(l.debit),0) OR j.total_credit<>COALESCE(SUM(l.credit),0)
        OR j.total_debit<=0
    SQL
    cross_company_lines: <<~SQL,
      SELECT l.id FROM journal_lines l JOIN accounts a ON a.id=l.account_id
      JOIN journal_entries j ON j.id=l.journal_entry_id WHERE a.company_id<>j.company_id
    SQL
    invalid_line_amounts: "SELECT id FROM journal_lines WHERE debit<0 OR credit<0 OR (debit>0 AND credit>0) OR (debit=0 AND credit=0)",
    cross_company_properties: "SELECT j.id FROM journal_entries j JOIN properties p ON p.id=j.property_id WHERE p.company_id<>j.company_id",
    payroll_staff_mismatch: "SELECT e.id FROM payroll_entries e JOIN staff_members s ON s.id=e.staff_member_id WHERE e.property_id<>s.property_id",
    payroll_journal_mismatch: <<~SQL,
      SELECT e.id, e.status, j.id AS journal_id, j.property_id AS journal_property, e.property_id AS payroll_property
      FROM payroll_entries e JOIN properties p ON p.id=e.property_id
      JOIN journal_entries j ON j.id=e.approval_journal_id OR j.id=e.payment_journal_id
      WHERE j.company_id<>p.company_id OR j.property_id IS DISTINCT FROM e.property_id OR j.status<>'POSTED'
    SQL
    advance_journal_mismatch: <<~SQL,
      SELECT a.id, j.id AS journal_id, j.property_id AS journal_property, e.property_id AS payroll_property
      FROM payroll_advances a JOIN payroll_entries e ON e.id=a.payroll_entry_id
      JOIN properties p ON p.id=e.property_id JOIN journal_entries j ON j.id=a.journal_entry_id
      WHERE j.company_id<>p.company_id OR j.property_id IS DISTINCT FROM e.property_id OR j.total_debit<>a.amount OR j.status<>'POSTED'
    SQL
    advance_totals_mismatch: <<~SQL,
      SELECT e.id FROM payroll_entries e LEFT JOIN payroll_advances a ON a.payroll_entry_id=e.id
      GROUP BY e.id HAVING e.advance_amount<>COALESCE(SUM(a.amount),0)
    SQL
    missing_payroll_journals: "SELECT id,status FROM payroll_entries WHERE (status IN ('APPROVED','PAID') AND approval_journal_id IS NULL) OR (status='PAID' AND net_pay>0 AND payment_journal_id IS NULL)",
    historical_payroll_payment_accounts: <<~SQL,
      SELECT j.voucher_number, e.payment_method, e.net_pay::text, e.paid_on, a.account_code, a.name AS account_name
      FROM payroll_entries e JOIN journal_entries j ON j.id=e.payment_journal_id
      JOIN journal_lines l ON l.journal_entry_id=j.id JOIN accounts a ON a.id=l.account_id
      WHERE l.credit>0 AND NOT (a.category='ASSET' AND a.name ~* '\\m(cash|bank)\\M' AND a.name !~* '\\m(receivable|advance)\\M')
    SQL
    orphan_lines: "SELECT l.id FROM journal_lines l LEFT JOIN accounts a ON a.id=l.account_id LEFT JOIN journal_entries j ON j.id=l.journal_entry_id WHERE a.id IS NULL OR j.id IS NULL"
  }
  results = checks.transform_values { |sql| connection.select_all(sql).to_a }
  results[:payroll_configuration_errors] = PayrollConfiguration.includes(:property).filter_map do |configuration|
    { property: configuration.property.code, errors: configuration.errors.to_hash } unless configuration.valid?
  end
  constraints = connection.select_all("SELECT conname, convalidated FROM pg_constraint WHERE conrelid IN ('journal_entries'::regclass,'journal_lines'::regclass,'payroll_entries'::regclass,'payroll_advances'::regclass,'payroll_configurations'::regclass) AND contype='f'").to_a
  summary = { environment: Rails.env, counts: { accounts: Account.count, journals: JournalEntry.count, lines: JournalLine.count, payroll: PayrollEntry.count, advances: PayrollAdvance.count },
    journals_by_source: JournalEntry.group(:source_module).count, payroll_by_status: PayrollEntry.group(:status).count,
    issues: results, foreign_keys: constraints }
  puts JSON.pretty_generate(summary)
end
