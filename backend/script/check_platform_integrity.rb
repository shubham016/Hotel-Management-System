ActiveRecord::Base.transaction do
  connection = ActiveRecord::Base.connection
  connection.execute("SET TRANSACTION READ ONLY")
  queries = {
    cms_company_mismatch: "SELECT c.id FROM cms_pages c JOIN properties p ON p.id=c.property_id WHERE c.company_id<>p.company_id",
    media_company_mismatch: "SELECT c.id FROM cms_media_assets c JOIN properties p ON p.id=c.property_id WHERE c.company_id<>p.company_id",
    role_company_mismatch: "SELECT u.id FROM users u JOIN roles r ON r.id=u.role_id WHERE u.company_id<>r.company_id",
    membership_company_mismatch: "SELECT up.id FROM user_properties up JOIN users u ON u.id=up.user_id JOIN properties p ON p.id=up.property_id WHERE u.company_id<>p.company_id",
    staff_company_mismatch: "SELECT u.id FROM users u JOIN staff_members s ON s.id=u.staff_member_id JOIN properties p ON p.id=s.property_id WHERE u.company_id<>p.company_id",
    staff_missing_property_access: "SELECT u.id FROM users u JOIN staff_members s ON s.id=u.staff_member_id WHERE NOT EXISTS(SELECT 1 FROM user_properties up WHERE up.user_id=u.id AND up.property_id=s.property_id)",
    inactive_staff_with_active_portal: "SELECT u.id FROM users u JOIN staff_members s ON s.id=u.staff_member_id WHERE u.active AND NOT s.active",
    room_category_property_mismatch: "SELECT r.id FROM rooms r JOIN room_types t ON t.id=r.room_type_id WHERE r.property_id<>t.property_id",
    undefined_setup_floors: "SELECT r.id,r.room_number,r.floor FROM rooms r WHERE r.setup_managed AND NOT EXISTS(SELECT 1 FROM floors f WHERE f.property_id=r.property_id AND f.number=r.floor)",
    duplicate_cms_slugs: "SELECT company_id,property_id,slug,COUNT(*) FROM cms_pages GROUP BY company_id,property_id,slug HAVING COUNT(*)>1",
    orphan_sections: "SELECT s.id FROM cms_sections s LEFT JOIN cms_pages p ON p.id=s.cms_page_id WHERE p.id IS NULL",
    audit_property_company_mismatch: "SELECT a.id FROM audit_logs a JOIN properties p ON p.id=a.property_id WHERE a.company_id<>p.company_id",
    audit_actor_company_mismatch: "SELECT a.id FROM audit_logs a JOIN users u ON u.id=a.user_id WHERE a.company_id<>u.company_id",
    invalid_property_times: "SELECT id FROM properties WHERE check_in_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' OR check_out_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'"
  }
  puts JSON.pretty_generate(environment: Rails.env, smtp_configured: ENV["SMTP_ADDRESS"].present?, counts: { pages: CmsPage.count, sections: CmsSection.count, media: CmsMediaAsset.count, floors: Floor.count, rooms: Room.count, managed_rooms: Room.setup_managed.count, staff: StaffMember.count, users: User.count, memberships: UserProperty.count, audit_logs: AuditLog.count },
    issues: queries.transform_values { |sql| connection.select_all(sql).to_a },
    foreign_keys: connection.select_all("SELECT conname,convalidated FROM pg_constraint WHERE contype='f' AND conrelid IN ('cms_pages'::regclass,'cms_sections'::regclass,'users'::regclass,'user_properties'::regclass,'staff_members'::regclass,'audit_logs'::regclass,'rooms'::regclass,'floors'::regclass)").to_a)
end
