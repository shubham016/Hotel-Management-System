class LinkPayrollJournalProperties < ActiveRecord::Migration[8.1]
  def up
    # Repair only unambiguous links already recorded by payroll. Financial
    # amounts, dates, voucher numbers, and historical payroll remain untouched.
    execute <<~SQL
      WITH links AS (
        SELECT approval_journal_id AS journal_id, property_id FROM payroll_entries WHERE approval_journal_id IS NOT NULL
        UNION
        SELECT payment_journal_id, property_id FROM payroll_entries WHERE payment_journal_id IS NOT NULL
        UNION
        SELECT a.journal_entry_id, e.property_id FROM payroll_advances a JOIN payroll_entries e ON e.id=a.payroll_entry_id
      ), resolved AS (
        SELECT journal_id, (array_agg(DISTINCT property_id))[1] AS property_id
        FROM links GROUP BY journal_id HAVING COUNT(DISTINCT property_id)=1
      )
      UPDATE journal_entries j SET property_id=r.property_id
      FROM resolved r JOIN properties p ON p.id=r.property_id
      WHERE j.id=r.journal_id AND j.property_id IS NULL AND j.source_module='PAYROLL' AND j.company_id=p.company_id
    SQL
  end

  def down
    raise ActiveRecord::IrreversibleMigration, "Do not remove established payroll property links"
  end
end
