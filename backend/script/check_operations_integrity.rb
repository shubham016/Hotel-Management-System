# Read-only verification. Does not change or repair operational records.
ActiveRecord::Base.transaction do
  connection = ActiveRecord::Base.connection
  connection.execute("SET TRANSACTION READ ONLY")
  checks = {
    reservation_guest_company: "SELECT r.id FROM reservations r JOIN properties p ON p.id=r.property_id JOIN guests g ON g.id=r.guest_id WHERE p.company_id<>g.company_id",
    reservation_room_property: "SELECT rr.id FROM reservation_rooms rr JOIN reservations r ON r.id=rr.reservation_id JOIN room_types t ON t.id=rr.room_type_id LEFT JOIN rooms room ON room.id=rr.room_id WHERE r.property_id<>t.property_id OR room.property_id<>r.property_id OR room.room_type_id<>rr.room_type_id",
    folio_reservation_guest: "SELECT f.id FROM folios f JOIN reservations r ON r.id=f.reservation_id WHERE f.property_id<>r.property_id OR f.guest_id<>r.guest_id",
    duplicate_reservation_folios: "SELECT reservation_id,COUNT(*) FROM folios GROUP BY reservation_id HAVING COUNT(*)>1",
    overlapping_room_bookings: "SELECT a.id,b.id AS conflict_id FROM reservation_rooms a JOIN reservations ra ON ra.id=a.reservation_id JOIN reservation_rooms b ON b.room_id=a.room_id AND a.id<b.id JOIN reservations rb ON rb.id=b.reservation_id WHERE ra.status IN ('INQUIRY','CONFIRMED','CHECKED_IN') AND rb.status IN ('INQUIRY','CONFIRMED','CHECKED_IN') AND ra.check_in_date<rb.check_out_date AND rb.check_in_date<ra.check_out_date",
    occupied_room_without_stay: "SELECT room.id FROM rooms room WHERE room.active AND room.setup_managed AND room.status IN ('OCCUPIED','DUE_OUT') AND NOT EXISTS(SELECT 1 FROM reservation_rooms rr JOIN reservations r ON r.id=rr.reservation_id WHERE rr.room_id=room.id AND r.status='CHECKED_IN')",
    stay_without_occupied_room: "SELECT rr.id FROM reservation_rooms rr JOIN reservations r ON r.id=rr.reservation_id LEFT JOIN rooms room ON room.id=rr.room_id WHERE r.status='CHECKED_IN' AND (room.id IS NULL OR room.status NOT IN ('OCCUPIED','DUE_OUT'))",
    folio_totals: "SELECT f.id FROM folios f WHERE f.status IN ('OPEN','SETTLED','CLOSED') AND (f.grand_total<>COALESCE((SELECT SUM(i.total_amount) FROM folio_items i WHERE i.folio_id=f.id AND NOT i.voided),0) OR f.total_paid<>COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.folio_id=f.id),0) OR f.balance_due<>GREATEST(f.grand_total-f.total_paid,0))",
    closed_folio_with_balance: "SELECT id FROM folios WHERE status='CLOSED' AND balance_due<>0",
    kitchen_property: "SELECT k.id FROM kitchen_orders k JOIN restaurant_tables t ON t.id=k.restaurant_table_id JOIN restaurants r ON r.id=t.restaurant_id JOIN users u ON u.id=k.user_id JOIN properties p ON p.id=k.property_id WHERE r.property_id<>k.property_id OR u.company_id<>p.company_id",
    available_table_with_orders: "SELECT t.id FROM restaurant_tables t WHERE t.status='AVAILABLE' AND EXISTS(SELECT 1 FROM kitchen_orders k WHERE k.restaurant_table_id=t.id AND k.settled_at IS NULL)",
    banquet_property: "SELECT b.id FROM banquet_bookings b JOIN banquet_halls h ON h.id=b.banquet_hall_id JOIN properties p ON p.id=b.property_id JOIN guests g ON g.id=b.guest_id WHERE h.property_id<>b.property_id OR g.company_id<>p.company_id",
    stock_company: "SELECT s.id FROM stock_balances s JOIN stores st ON st.id=s.store_id JOIN properties p ON p.id=st.property_id JOIN inventory_items i ON i.id=s.inventory_item_id WHERE i.company_id<>p.company_id",
    purchase_company: "SELECT po.id FROM purchase_orders po JOIN properties p ON p.id=po.property_id JOIN suppliers s ON s.id=po.supplier_id WHERE p.company_id<>s.company_id",
    purchase_item_company: "SELECT l.id FROM purchase_order_items l JOIN purchase_orders po ON po.id=l.purchase_order_id JOIN properties p ON p.id=po.property_id JOIN inventory_items i ON i.id=l.inventory_item_id WHERE i.company_id<>p.company_id"
  }
  tables = %w[reservations reservation_rooms folios folio_items payments cancellation_refunds rooms housekeeping_tasks kitchen_orders restaurant_tables banquet_bookings banquet_transactions inventory_items stock_balances stock_movements purchase_orders purchase_order_items purchase_receipts supplier_invoices supplier_invoice_lines supplier_payments accounts journal_entries journal_lines payroll_entries payroll_advances cms_pages cms_sections cms_offers staff_members]
  fingerprints = tables.select { |table| connection.data_source_exists?(table) }.to_h do |table|
    quoted = connection.quote_table_name(table)
    [table, connection.select_one("SELECT COUNT(*) AS count, md5(COALESCE(string_agg(md5(row_to_json(t)::text), '' ORDER BY id),'')) AS fingerprint FROM #{quoted} t")]
  end
  foreign_keys = connection.select_one("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE NOT convalidated) AS unvalidated FROM pg_constraint WHERE contype='f' AND connamespace='public'::regnamespace")
  puts JSON.pretty_generate(environment: Rails.env, issues: checks.transform_values { |sql| connection.select_all(sql).to_a }, foreign_keys:, fingerprints:)
end
