# Hotel New Era — Project Handoff

**Updated:** 2026-10-15
**Backend direction:** Ruby on Rails JSON API
**Current frontend:** React 18 + React Router + Vite 7 SPA; Rails owns every backend API

## Resume Here (2026-10-15)

This section is the current state and supersedes conflicting payroll details in the historical notes below. Keep session handoff notes in this Markdown file; the user's request to save progress means updating this file, not creating a Git commit unless explicitly requested.

- Core operations review (2026-10-15): checked Dashboard, Front Desk, Reservations, Rooms, and Night Audit together. Fixed Front Desk check-in passing unpermitted parameters; added a clean-room picker for unassigned single-room arrivals, excluded the booking's own inventory hold when finding rooms, displayed errors inside booking review, refreshed connected screens after changes, and fixed the Reservations mobile toolbar. Both checkout routes now share the guarded folio checkout, gateway-payment restrictions, and actual balanced journal posting.
- Group check-in and daily closing are now implemented (2026-10-15 follow-up). Booking review selects a distinct clean room for every booked room; the API validates property, room type, readiness, and conflicts, then occupies all rooms in one transaction. Group folios show all room numbers; extension and checkout retain one booking/folio and release every room to housekeeping. Unpaid due arrivals can be resolved as no-shows; paid arrivals still require the cancellation/refund workflow.
- Night Audit now supports one shared guest/restaurant cashier per property: receipt/refund totals by method, declared opening cash, counted cash, required variance explanations, audited closure/reopening, and classification of older POS receipt metadata without changing journal amounts. Closed cashiers reject new receipts/refunds until reopened or the day advances. Daily close blocks unresolved arrivals/departures, restaurant activity, initiated gateway payments, inconsistent folios, and unbalanced journals. It stores immutable closing evidence and advances the persistent property business date once; stale/concurrent/repeated requests cannot advance twice. Closing history provides saved reports and printing. Existing booking/folio charges are not posted again at day close.
- Migrations `20261015000001_add_business_day_closing` and `20261015000002_initialize_property_business_dates` were applied locally. Existing properties start from the Kathmandu calendar date at activation; migrations do not create operational cashier/day closings. New guest receipts, refunds, PMS/POS/manual journals, document numbers, and effective-date charge taxes use the operating business date. Actual timestamps and historical financial records are retained. Property advisory locks serialize closure against financial mutations, public bookings, gateway callbacks, and the stay monitor.
- Follow-up verification: full backend suite passed 147 tests / 6,797 assertions; 22 focused closing/POS/permission tests passed / 284 assertions; the additional business-date/tax test passed / 12 assertions. TypeScript passed. An isolated browser scenario verified two-room check-in/checkout, no-show resolution, cashier reconciliation, saved closing reports, desktop/mobile layouts, and two concurrent closing requests producing one closing and one date advance. Test-database inspection confirmed both rooms dirty, one payment, one cashier closing, one immutable day closing, and one closing audit. No operational hotel day or cashier was closed. Changes remain local and uncommitted.
- Core verification: 62 reservation/dashboard/auth integration tests passed (1,013 assertions); frontend type check passed; all five live pages were checked on desktop/mobile. A temporary test hotel verified room selection, check-in, stay extension, checkout, room maintenance, and overnight checking through the actual UI/API; a test-database read confirmed a closed folio, one payment, and balanced journal. API failure rendering was checked. Operational bookings and payments were not changed; the temporary API/frontend were stopped. These review changes are saved locally, not committed or pushed.

- Payroll is at `/admin/accounting/payroll`, accessible to Owner, All-rounder/Admin, and Super Admin within assigned properties. New payroll uses BS months and exact BS/AD boundaries. Approval and final salary payment require the payroll month to have ended.
- Salary setup stores gross monthly salary, split into 60% basic and 40% fixed monthly allowance. Example: NPR 20,000 gross = NPR 12,000 basic + NPR 8,000 allowance; default 1% TDS is NPR 200. Advances reduce remaining salary without reducing the TDS base.
- Additional earnings, other deductions, the Approved unpaid summary card, and TDS review/exemption reason input are removed from the active workflow. Notes are optional. Preserve historical amounts, reasons, journals, and payment evidence. Do not reintroduce explanatory salary paragraphs or inline amount summaries.
- The client requested restoration of staff advances. Record advance is now in the payroll toolbar beside Salary setup, with an employee selector. It is deliberately absent from the Monthly payroll row Actions to preserve alignment. Draft rows retain Edit and Approve. Advances can be issued during an open month, only against a draft, and cannot exceed remaining net salary.
- Advance recording captures amount, BS payment date, Cash/Bank Transfer, cash/bank account, and bank reference when applicable. Duplicate requests do not repost. Approval recovers advances; final payment covers the balance. Totals, advance history, and payslips retain the advance evidence. No new migration was needed to restore advances.
- Payment accounts exclude Accounts Receivable and Staff Advances. Existing 1001 Cash / Bank is appropriate for disbursement; receivables remain in Chart of Accounts. Ledger mappings generally need configuration once, not after every salary setup.
- Monthly payroll and Staff salary setup headers/cells are centered with vertical grid borders. Sidebar uses flat groups with the previous fonts/styles and no dropdowns. Accounting includes Journal Vouchers, Staff Payroll, Chart of Accounts, and Financial Reports; Core Operations and Hospitality & Outlets were reviewed.
- Generic descriptions and filler subtitles were removed across operational panels. Follow the concise interface wording rules in AGENTS.md. Retain necessary validation, confirmations, and payment safeguards.
- Rooms page `/admin/pms/rooms` was checked against its authenticated API and database: 45 active setup-managed rooms across five floors, all recorded Vacant Clean, no active guests at verification. These are stored statuses, not independent confirmation of physical room conditions. OOO means Out of Order; its button now shows the full label. Room types and base prices matched stored data.
- Local stability: database/API containers restart automatically; Vite ignores `backend/tmp` to avoid locked browser-profile files. Salary allowance migration `20261014000001_add_payroll_monthly_allowance` was applied to local development/test. Room-bed work and its migration are also included in the saved project changes.
- Verification completed: frontend type check; browser checks of payroll table alignment, advance toolbar/employee form, amount limits, cash/bank filtering, required bank reference, cancel, and mobile layout. Payroll integration run covered 26 tests; a frozen-timestamp ordering assertion was corrected and its test passed on rerun (1 test, 50 assertions). Other tests passed in the suite. Checks used isolated financial test data and did not record real operational payments.
- Local source checkpoint: commit `09a26e8` contains the changes made before this handoff correction. Nothing was pushed or deployed. This Markdown update is saved separately in the working tree.

Next: let the client test payroll, including advances. The user previously mentioned resetting test payroll later; do not reset or delete operational records without a concrete request. Real SMTP delivery and live payment credentials remain separate pending configuration.

## Historical resume notes (2026-10-09)

- Product decision (2026-10-09): no separate HR portal is required. The owner will oversee staff payroll through the Accounts area of the existing Owner portal. This supersedes older plans mentioning an HR portal or future HR-role provisioning. Payroll is now implemented locally; other deferred inventory/accounting work remains outside this change.
- Owner-only Staff Payroll is available at `/admin/accounting/payroll`. Payroll now uses BS month/year selection and exact BS-month boundaries, with the AD equivalent range displayed. Set monthly salaries from the existing Staff Directory, create a BS-month draft, review earnings/deductions, optionally record issued advances, approve, then record the remaining salary payment and download a PDF payslip. Payment dates use a BS date picker. Super Admin also has access; All-rounder/Admin and departmental staff cannot access payroll.
- Payroll migrations through `20261009000004_add_payroll_tds` were applied locally and the test database prepared. HNE-BTW payroll mappings are configured: 6002 Staff Salaries (Expense), 2200 Salaries Payable (Liability), 2201 Payroll Deductions Payable (Liability), 1200 Staff Advances (Asset), and 2202 Salary TDS Payable (Liability). Existing 1001 Cash / Bank is available for payments. New payroll defaults to 1% TDS on base salary plus earnings, before other deductions/advances. Payslips and ledger posting show TDS separately. Other deductions remain manual; full annual tax slabs, SSF exemptions, attendance, leave, and statutory remittance need review. Payments record transfers already made; they do not initiate transfers.
- Keshav's Admin and Devi's Front Desk accounts are active; the user confirmed both logins. Earlier invalid-credential failures were not conclusively diagnosed. No actual employee password was reset during debugging. Safe failure-reason logging is now available without recording credentials.
- Staff Portal Access now has icon-only Edit/Delete actions. Owner/Admin can delete unused staff accounts in their property; Owner, Super Admin, and the current user's account are protected. Accounts with activity history require deactivation. Deletion preserves the employee directory entry and removes sign-in sessions.
- Shared accessible modals now handle Add/Edit in Staff Directory, Laundry Tariffs, Extra Services, and Staff Portal Access. Extra Services uses icon-only Edit/Deactivate actions. Settings tabs have a fixed compact size; Save Configuration, Publish CMS Updates, and the shared large-button style were reduced.
- Login now has a 440px maximum-width card with 32px desktop side padding, logo-only header, responsive spacing, and a password eye toggle. Do not restore the removed welcome/portal text or staff-account explanatory paragraph.
- Dashboard no longer shows Expected Arrivals, ledger postings, Housekeeping Matrix, Restaurant & Bar POS, or Night Audit cards. KPI tiles, Room Board, New Booking, underlying modules, and database records remain available.
- Forgot password opens a request modal. Requests persist, notify the appropriate Owner/Admin, and appear in Staff Portal Access. Administrators reset through Edit access; staff can then choose their own password in My Profile. Email notification code is implemented, but SMTP credentials/provider and actual receiving inboxes are still needed. Do not claim real inbox delivery is verified.
- Migration `20261008000001_add_staff_password_reset_requests` was applied locally and the test schema prepared. Final related backend checks passed 20 tests / 260 assertions; TypeScript and focused desktop/mobile browser checks passed. Changes remain local and uncommitted; no production deployment was performed.
- Research before implementation remains required, with brief, task-specific research and focused verification under `AGENTS.md`. HR is not implemented; inventory/accounting work remains deferred.

Next: enter actual salaries through the owner payroll screen; payroll ledger mappings are configured. Configure and verify real SMTP delivery; use a durable mail queue/worker for production. Continue remaining staff provisioning only with the hotel's actual employee details. Keep session notes in PROJECT_HANDOFF.md only, as requested by the user. Detailed notes follow below.

## Staff payroll (2026-10-09)

- User requested research and automatic 1% salary TDS. Reviewed the [IRD FY 2083/84 natural-person tax schedule](https://ird.gov.np/content/13609/tax-rate-for-natural-persons-for-the/) and downloaded/read its linked official PDF. The current first annual taxable-income band is Rs. 10 lakh at 1% for individuals/couples; higher bands and qualifying pension/retirement/SSF exceptions mean 1% is not a universal flat salary-tax rule. Reused the documented payroll accounting workflow: separate deduction amounts, net salary, and payable ledger accounts.
- Implemented a default 1% gross-salary withholding rule for new payroll: `(base salary + additional earnings) × rate / 100`, rounded to two decimals, half up. Net salary subtracts TDS, other deductions, and advances separately. Example: 30,000 salary + 2,000 earnings − 320 TDS − 1,000 other deductions − 5,000 advance = 25,680 remaining salary. Advances do not reduce the tax base and cannot exceed the post-TDS remaining salary.
- Owners can enter 0% for a reviewed exemption or another accountant-reviewed effective monthly rate, with a required explanation. Annual gross estimates above Rs. 10 lakh and fiscal years outside the researched 2083/84 require an explanation before approval. The app does not calculate full annual tax slabs or verify SSF eligibility. UI and approval guards make those review cases explicit.
- Rate, tax amount, and explanation are saved per entry. Backend derives totals and ignores client-supplied tax/net amounts; integer-paisa frontend previews match decimal half-up rounding. Approved amounts remain locked through the API. Earlier records retain their original net amounts with no retroactive tax: `tds_rate=NULL`, `tds_amount=0`; any older unreviewed draft must be reviewed in Edit before approval.
- Created and configured HNE-BTW account 2202 Salary TDS Payable, with an audit event. Verified the mapping through the running owner API and confirmed existing posted journals were unchanged. No real employee salary or operational payment was modified; there were no existing visible unreviewed drafts when setup was checked. Approval credits TDS to this separate liability; remittance/e-TDS filing is not automated.
- TDS verification: 15 payroll integration tests / 299 assertions passed, plus the updated invalid-rate/account validation check / 22 assertions (overlapping coverage). Covered default tax, earnings/deductions/advance ordering, half-paisa rounding, exemptions/reviewed rates, invalid rates, net-pay limits, account validation, duplicate approval, immutability, annual-band/fiscal-year review, and preservation of older amounts. Actual frontend preview checks, final TypeScript, production build, and whitespace checks passed.
- Real browser/API checks with isolated data verified automatic TDS, live edit preview, persisted net salary after reload, advances, approval/payment, a PDF containing the TDS line, BS month/date behavior, and desktop/mobile rendering. A local preview interruption occurred during the final API check; Vite was restarted and the resumed check passed. Screenshots were visually reviewed; isolated records were removed. Changes remain local and uncommitted, with no production deployment.
- User requested removal of the earlier AD payroll record. The only HNE-BTW record was Baje's October 2026 AD payroll, already PAID with approval/payment journals. Archived that specific record (`a85a3800-8c1f-4263-b344-54edca64fe78`) and logged an ARCHIVE audit event. Payroll lists and the earlier-AD history selector exclude archived entries; direct mutation endpoints also exclude them. Posted journals, journal lines, financial balances, and the retained payment record remain unchanged. This follows the [documented posted-entry/audit-trail pattern](https://www.odoo.com/documentation/17.0/applications/finance/accounting/reporting.html).
- Applied local migration `20261009000003_add_payroll_archiving`, with a database constraint permitting archive only for paid payroll. Focused archive integration check passed 1 test / 21 assertions, TypeScript and whitespace checks passed, and the running owner API confirmed the record and its AD history option are absent. Actual journals/lines were compared before and after archival and remained identical. No production deployment occurred.
- Calendar correction requested by the user: payroll periods must use BS, with accurate dates. Added migration `20261009000002_add_payroll_calendar` locally and prepared the test schema. New BS periods store their exact AD starting date plus `period_calendar=BS`. Existing AD periods retain their dates and are available through Earlier payroll records (AD); they are not silently relabeled. New payroll creation requires an explicit BS calendar, preventing older AD clients from accidentally creating a BS period.
- Backend conversion uses a generated month-length table from the installed `@inicrea/bikram-sambat-core` 0.1.3, matching the frontend library, with source/license attribution and a regeneration script. Supported range is BS 1975–2100; invalid/out-of-range dates are rejected. Checked 13 published 2083 BS/AD date pairs against the [Government of Nepal holiday list](https://eg.nepalembassy.gov.np/pages/holidays/). Ashwin 2083 runs from 2026-09-17 through 2026-10-17 AD. Today's date on the payroll screen explicitly uses Asia/Kathmandu.
- BS month and payment-date pickers, payment displays, payslips, and payroll journal Nepali dates now use real conversions. Payslips include the selected month label and the exact AD range. API validation rejects inconsistent BS/AD payment dates. This supersedes the earlier AD-only implementation notes below.
- Calendar verification passed: 13 payroll/calendar tests / 4,774 assertions, frontend/backend parity at the first/last day of all 1,512 supported BS months, TypeScript/production build, and whitespace checks. Actual browser verification covered BS periods/ranges, salary setup, adjustments, advances, approval/payment, persisted reload, BS payslip PDF, month switching, earlier AD history, and desktop/mobile rendering. Screenshots were visually reviewed. Only isolated browser-test data was used and removed; operational payroll amounts and ledger mappings were not changed. Changes remain local; no deployment occurred.
- Follow-up account setup: created the four dedicated payroll accounts listed above and saved HNE-BTW's mappings in one transaction, with an audit entry. Verified the persisted selections and account categories through the running owner Payroll API and confirmed all four accounts appear in the Chart of Accounts API. No salary entries or payments were created by account setup. This configuration is in the local application database; no production deployment was performed.
- Reused Oracle Hospitality's documented employee/payroll-summary workflow: [Using Labor Management](https://docs.oracle.com/en/industries/food-beverage/labor-management/lamug/c_gettingstarted.htm). Payroll lives inside Accounts, with no separate HR portal.
- Salary setup is linked to property-scoped Staff Directory records. Monthly entries retain employee-name/department and salary snapshots. One entry per employee and AD month is enforced in the database. Drafts support additional earnings, deductions, and explanatory notes.
- Owner chooses separate active company ledger accounts for salary expense, salary payable, deductions payable, and staff advances. Cash/bank accounts are selected when recording payments. Account mapping changes are blocked while approved unpaid payroll or unrecovered advances exist.
- Advances are recorded as actual payments against a draft, with payment date/method/reference and an idempotency key. Approval debits gross salary expense and credits net salary payable, deductions payable, and advance recovery. Salary payment clears net payable against the selected cash/bank account. Zero-net payroll can be settled without a zero-value journal.
- Property and entry locks, transactions, journal references, unique constraints, and repeated-request checks protect against duplicates and partial financial postings. Approved amounts cannot be edited through the API. Audit entries capture salary setup, draft edits, approval, advances, and settlement. Posted payroll journals appear in the existing ledger and financial reports.
- Salary/payment forms use the existing accessible modal. Payslips include employee, payroll month, earnings, deductions, recovered advances, net salary, settlement details, and voucher references. Dates/months are explicitly AD; no BS-month payroll calculation was added.
- Verification: seven payroll integration tests / 161 assertions passed, plus the updated financial-boundary check / 27 assertions passed (overlapping coverage). The existing eleven staff-portal tests / 141 assertions passed. Covered owner-only authorization, property/company isolation, account/date/reference validation, monthly uniqueness, salary snapshots, advance recovery, balanced journals, repeat requests, zero-net settlement, rollback after a forced journal-line failure, and financial-report integration.
- Production build, final TypeScript check, and whitespace checks passed. Actual desktop/mobile browser checks used an isolated company/employee and the real API to save salary/mappings, create/edit a draft, record an advance, approve/pay, verify persistence after reload, and download a valid PDF payslip. Screenshots were visually reviewed. Test records were removed; real staff salaries and operational payments were not changed. Changes remain local and uncommitted; no production deployment occurred.

## Session details (2026-10-08)

### Staff accounts and login debugging

- Keshav Bhattarai (keshav@hotelnewera.com, ADMIN) and Devi Thapa (devi@hotelnewera.com, FRONT_DESK_STAFF) now have active, property-linked accounts. The user confirmed both can sign in. Their passwords are not recorded in project documentation.
- Earlier Invalid email or password failures were not conclusively diagnosed. Separate fixture-account tests passed, but did not prove that the originally entered real credentials matched. No actual employee password was reset during debugging.
- Added safe server-side failed-login reasons: ACCOUNT_NOT_FOUND, ACCOUNT_INACTIVE, and PASSWORD_MISMATCH, with request/user IDs. Emails and passwords stay out of these diagnostic messages; the public response remains generic.
- Owner and All-rounder/Admin can delete unused staff login accounts in their property. The server protects Owner/Super Admin/self accounts and rejects deletion when activity history exists; use deactivation in that case. Deletion keeps the Staff Directory record, removes account sessions, and creates an audit entry.
- Staff Portal Access now uses pencil/trash icons with tooltips and accessible labels. Extra Services uses pencil/power icons for Edit/Deactivate. No HR module or HR portal was added.

### Settings, forms, and dashboard

- Added a shared native FormDialog for Add/Edit in Staff Directory, Laundry Tariffs, Extra Services, and Staff Portal Access. It supports a titled responsive modal, initial field focus, Escape/Cancel/Close, background scroll locking, restored trigger focus, and blocking closure during a save. Errors stay inside the form. Hotel Setup already used modals.
- Settings tabs have 32px buttons, reduced padding, lighter text, stable sizing across selected states, and horizontal scrolling on small screens. Save Configuration and Publish CMS Updates use the standard button size; the shared large-button style was reduced to a 40px minimum height, 14px text, and tighter padding.
- Removed the five requested dashboard sections: Today's Expected Arrivals, Automated Double-Entry General Ledger Postings, Housekeeping Matrix, Restaurant & Bar POS, and Night Audit. KPI tiles, Room Board, New Booking, backend modules, and records remain available.
- Saved the user's research-before-implementation rule in AGENTS.md, with the explicit speed constraint: brief task-specific research, reuse applicable sources, focused verification, and no broad audits or repeated checks without a concrete reason. Inventory/accounting work remains deferred.

### Login design

- Login now has a logo-only header, 440px maximum-width card, 40px vertical/32px desktop horizontal padding, mobile-specific spacing, clearer fields, and a compact Sign In button. Removed the welcome/portal heading and the staff-account explanatory paragraph at the user's request.
- Password eye controls on Login and Staff Portal Access show/hide the current entry without changing its value or submitting the form. Accessible labels and autocomplete settings remain intact.
- A temporary browser profile inside the project caused Vite to crash while watching locked browser files. The profile was moved to the OS temporary directory, the project profile was removed, and the local frontend restarted. Browser helpers used hidden/headless processes and were removed after checks. Ignored screenshots remain under backend/tmp.

### Administrator-assisted forgotten password

- Forgot your password? is now a clickable button that opens a request modal and submits the employee email to POST /api/v1/auth/password.
- Public requests use the same acknowledgement for known, unknown, inactive, and protected accounts. They never return a raw reset token or change the password. Protected Owner/Super Admin requests are not handled through staff account resets.
- Active eligible accounts persist password_reset_requested_at and password_reset_email_status. Repeated requests have a five-minute cooldown in addition to existing authentication endpoint throttling.
- Only active Owner/Admin/Super Admin accounts in the same company and sharing an active assigned property receive notifications/email; the requesting account is excluded. Notifications and mail links open Staff Portal Access with the matching account editor. The table marks pending requests and flags unavailable email delivery.
- Owner/Admin set a replacement password using Edit access and share it privately. Password reset clears the pending request, invalidates existing reset tokens, revokes active sign-in sessions, and records an audit event. Role-only edits preserve the request. Staff then sign in and choose a private password through My Profile; that change also clears pending requests and revokes sessions/reset tokens.
- Added StaffAccessMailer, StaffPasswordResetEmailJob, and SMTP configuration through backend environment variables. Passwords are not included in notification emails. Delivery status distinguishes QUEUED, SENT, NOT_CONFIGURED, and FAILED; delayed jobs check that the request is still current before sending.
- Migration 20261008000001_add_staff_password_reset_requests was applied to local development; the test database was prepared. It adds two request-tracking columns to users.
- REAL EMAIL DELIVERY IS STILL PENDING: no SMTP provider/credentials and verified receiving inboxes were supplied. In-app notifications and stored requests work independently. Configure MAILER_FROM and SMTP_* privately using .env.example, then recreate/restart the API and verify an actual inbox. The local Active Job adapter is in-process; production needs a durable queue/worker. Do not claim real email delivery has passed.

### Verification

- Staff account deletion checks: 11 tests / 141 assertions passed.
- Authentication diagnostic checks: 5 tests / 64 assertions passed.
- Settings modal-related existing database checks: 2 tests / 22 assertions passed.
- Final staff reset/auth/portal integration run: 20 tests / 260 assertions, zero failures/errors. Covered request persistence, mail generation using the test transport, correct recipients, cooldown, generic responses, property/company boundaries, session/token revocation, and staff password change after an administrator reset.
- Frontend TypeScript and git diff checks passed. Focused component checks covered icon/password controls, modal Add/Edit/Cancel behavior, save payloads and refresh/error handling.
- Completed headless desktop/mobile checks for Login and the request dialog: no horizontal overflow, password reveal/hide, initial input focus, real API acknowledgement using a nonexistent QA email, close, and restored focus. Browser checks did not reset real accounts or send actual emails.
- These are overlapping focused checks, not a full repository regression result. Changes are local and uncommitted; no production deployment occurred.

### Next session

- Configure real outgoing email and verified administrator inboxes, then test actual delivery. Keep SMTP secrets out of chat and project notes.
- Provision remaining staff only with the hotel's real employee details, and review department usability as needed.
- Keep deferred HR/inventory/accounting, live payment activation, and deployment/backup work outside the current scope unless the user resumes them.

---

## Previous session (2026-10-07)

This entry supersedes older descriptions of demo logins, unrestricted staff navigation, sample kitchen tickets, and incomplete booking wiring. See the detailed **2026-10-07** entry in [`docs/CONVERSATION.md`](docs/CONVERSATION.md).

### Current staff portals

- Existing `admin@hotelnewera.com` remains **OWNER**. **ADMIN** is now **All-rounder / Admin**, with full hotel access within assigned properties. The owner account is protected from staff account edits.
- One login at `/login` routes staff to their workspace. Owner/Admin open Dashboard; Front Desk opens `/admin/pms/frontdesk`; Housekeeping/Cleaning opens `/admin/housekeeping`; Restaurant opens `/admin/pos/tables`; Kitchen Cook/Helper opens `/admin/pos/kot`.
- `/admin/staff-access` lets Owner/Admin create individual accounts from the existing Staff Directory, assign roles, change passwords, and activate/deactivate access. The **Sign-in email** column is the login ID. Passwords are not displayed. Role/password/access changes revoke existing sessions.
- Keshav Bhattarai (`keshav@hotelnewera.com`, ADMIN) and Devi Thapa (`devi@hotelnewera.com`, FRONT_DESK_STAFF) now have active accounts; the user confirmed both logins work. Do not invent credentials for other employees or change existing passwords merely to verify them.
- Forgot password now submits an administrator-assisted request. Pending requests and email-delivery status persist on users; same-company administrators sharing an assigned active property receive in-app notifications and queued email. Staff Portal Access shows requests and email links open the matching account editor. Owner/Admin set a replacement password and share it privately; staff choose their own password in My Profile. Public requests no longer expose raw reset tokens. SMTP setup remains required for real inbox delivery.
- Helpers may use Kitchen and cleaners may use Housekeeping with individual accounts. A dedicated Dishwasher portal is unnecessary for current workflows.
- Backend permissions, page guards, sidebar, app switcher and search enforce role access. Front Desk can manage bookings, advances, folios and checkout; Owner/Admin record refund payouts and delete/archive bookings. `/admin/profile` lets every authenticated employee change their own password.
- Restaurant/Kitchen now use persisted tables and KOT tickets, not sample browser-only orders: Restaurant sends -> Cook prepares/marks ready -> Restaurant marks served -> settlement or posting to an actual in-house room. Menu prices are saved on tickets, retries are protected, and settlement releases the table. Direct wallet selections record a received payment; they do not collect money online.
- Mobile staff navigation is collapsible. Only the real current hotel is displayed; old dummy property options were removed.

### Booking/payment state

- Booking receipt/voucher and mobile payment confirmation use a single guest-facing booking reference, customer and stay details. Duplicate cancellation policy text was removed.
- Before check-in, cancellation retains 10% of the actual amount paid and marks the remaining 90% due. Staff payout recording preserves original payments and accounting/audit records; it does not automatically send money to a wallet.
- Manual cash/bank advances, payment retry protection, resumable eSewa checkout, guest identity preservation, pagination and dashboard search are implemented. Clicking a dashboard search match opens the selected booking in Reservations Matrix. Placeholder: `Search reservation, Name, Mobile, Rooms, ID...`.
- A regression found during portal verification was corrected: booking references ending in digits no longer trigger unrelated normalized-phone matches.
- Public live wallet checkout still needs merchant credentials and a public HTTPS return URL; the local gateway setup remains sandbox. Do not enable live checkout without those inputs.

### Verification and local state

- Migrations `20261007000001` through `20261007000004` were applied locally: cancellation refunds, payment idempotency/public checkout, staff accounts/roles, and kitchen orders.
- Frontend typecheck and production build passed. Browser checks with isolated fixture data passed for all six roles, restricted-route redirects, account creation, restaurant/kitchen/settlement, and mobile Kitchen/Housekeeping layouts.
- Staff/auth/POS checks: 16 runs / 140 assertions initially passed; later staff/POS checks passed 12 runs / 123 assertions. The booking/notifications/portal regression run had 56 runs / 907 assertions with one search failure; its corrected focused rerun passed 4 runs / 129 assertions. Final room-posting/auth checks passed 4 runs / 61 assertions; kitchen invalid-input checks passed 1 run / 5 assertions. These are separate, overlapping runs, not a single full-suite result.
- `git diff --check` passed. Temporary browser fixtures/processes were removed. Work remains uncommitted in the working tree; no production deployment was performed.

### Resume tomorrow

1. Configure outgoing SMTP and real Owner/Admin inboxes for staff reset notifications; remaining employee provisioning requires the hotel's actual employee emails and individual passwords.
2. Exercise each department with hotel staff and real operational data. Discuss housekeeping assignment/stayover cleaning or additional restaurant workflows only if needed.
3. Keep inventory/accounting improvements deferred unless the user resumes that scope. The review found unsafe stock-issue validation, incomplete purchasing, financial-report calculation gaps, banquet validation gaps, and incomplete night-audit closing. Those modules were reviewed, not fixed in this session.
4. Email-assisted password reset code is implemented; SMTP credentials and real inbox delivery verification remain outstanding. The local Active Job adapter is in-process, so queued mail needs a durable worker/queue for production. Live gateway credentials, public HTTPS URL, and deployed backup/restore verification remain outstanding.

## Resume Here (2026-09-29 session end)

The client image import and confirmations are documented in [`docs/CLIENT_DATA_IMPORT.md`](docs/CLIENT_DATA_IMPORT.md). The complete recent work record and next steps are in [`docs/CONVERSATION.md`](docs/CONVERSATION.md), under **Record Entry: 2026-09-29**.

Current public/admin typography uses DM Sans for interface text and Newsreader for public editorial headings. Footer Quick Navigation links are not underlined. The latest typography change passed the TypeScript check. Guest capacities from the sheets remain provisional, and inquiries assigned to inactive rooms 102 and 104 need reassignment before check-in.

## Resume Here (2026-09-12 session end)

### Completed today

- Hotel Setup is the operational inventory screen at `/admin/cms/hotel-setup`. It manages Floors, Room Categories, and Rooms with live Rails CRUD; `/admin/cms/pages` remains the website-content editor.
- Removed demo/seed inventory from Hotel Setup and the Dashboard Room Board. Existing demo room categories and rooms are marked/prefixed as demo data, leaving operational inventory to be created through Hotel Setup.
- Added bulk room creation: an owner can create a consecutive room range (for example 101 to 110) at once. Room lists now use natural numeric ordering rather than lexicographic ordering (1, 2, ... 10).
- Added per-floor room management: compact room ranges, expandable individual-room controls, and a delete-all-rooms-on-floor action.
- Corrected Owner access for Hotel Setup through the `ROOM_SETUP` permission module. Manager and Front Desk Staff have status-update access through the separate `ROOMS` module.
- Room Category form improvements: amenities accept comma-separated values normally; Base nightly rate, Adults, and Children start blank; total capacity is calculated after adult and child values are entered.

### Validation completed today

- Frontend typecheck passed: `npm.cmd run typecheck`.
- Production frontend build passed earlier in this session.
- Rails test suite passed: 16 runs, 90 assertions, 0 failures.
- Rails database migrations are up, and the Docker API/database health checks returned HTTP 200 / healthy.

### Resume next session

1. Continue testing real owner-created floors, room categories, and bulk rooms in Hotel Setup.
2. Replace remaining hard-coded PMS Room Board labels/counts with live values where needed.
3. Continue the live Rails integration for remaining admin and staff workflows.

## Resume Here (2026-09-02 session end)

The Rails backend is established in `backend/`; it is now the authoritative backend for the active application API surface. Authentication, hotel inventory, availability, pricing, reservation creation and lifecycle management, PMS rooms, front desk, folios, checkout, night audit, CMS pages/offers, CRM guests, housekeeping, inventory, POS, procurement, banquet, accounting, audit records, notifications, and document sequencing have Rails implementations.

The public booking workflow and administration modules communicate with Rails through the centralized React API client and Vite's `/rails-api` development proxy. The former Next.js API compatibility routes have been removed.

## Resume Here (2026-09-12 frontend migration)

- Replaced Next.js with a React/Vite SPA while preserving all public and admin URLs.
- React Router owns navigation and layouts; Rails remains the only backend and source of business logic.
- The API client maps existing frontend `/api/...` calls to Rails `/api/v1/...`, adding JWT and property context.
- Login persists the Rails token/profile according to Remember Me, validates sessions with `/auth/me`, revokes refresh sessions on logout, and redirects expired sessions to login.
- A top-level error boundary prevents a component failure from blanking the entire application.
- Removed the Next dependency, server layouts, API proxy routes, and build configuration.
- Verified the Vite production build, all 29 frontend routes, and core authenticated Rails endpoints.
- **Permanent code-organization rule:** use a domain-first, one-route-per-folder structure modeled on the local recruitment system. Each route owns `page.tsx`; feature-specific CRUD components, API functions, types, constants, and hooks stay beside it. The authoritative rule is `.agents/rules/hotel_new_era_preferences.md` section 6.
- **Operational inventory rule:** old seed rooms and room categories are marked demo-only and excluded from Hotel Setup and the Dashboard Room Board. Create all operational floors, room categories, and rooms through `/admin/cms/hotel-setup`.
- **Hotel Setup permission rule:** Floors, Room Categories, and Rooms are one operational inventory module. The `OWNER` role has `ROOM_SETUP` read/create/update/delete access; do not split these permissions into separate `FLOORS` or `ROOM_TYPES` modules. `ROOMS` is reserved for operational room-status access.

## Resume Here (2026-09-11 session end)

### Completed today

- **Login and dashboard responsiveness:** reduced unnecessary post-login work by preserving a display-only session profile cookie and by using the compact dashboard response path. The dashboard now has a route loading state. The related Rails development logging was reduced to normal `info` level because verbose Docker bind-mount SQL logging was adding local delay.
- **Exact room assignment:** the Dashboard **New Booking** flow now supports selecting a specific available room. The selected room is sent to Rails, reserved atomically, and reflected in the Room Board. The backend validates availability rather than trusting the browser.
- **Correct BS/AD dates:** replaced the previous approximate, incorrect frontend conversion with `@inicrea/bikram-sambat-core`, which uses Bikram Sambat calendar data. Confirmed result: `2026-09-11` AD is `2083-05-26` / **26 Bhadra 2083 BS**, fiscal year `2083/84`.
- **CMS media is real and property-scoped:** added `CmsMediaAsset`, authenticated Rails media endpoints, local Active Storage persistence, image validation (JPG/PNG/WebP/GIF, maximum 10 MB), and audit records. Database migrations applied:
  - `20260911000001_create_cms_media_library.rb`
  - `20260911000002_create_active_storage_variant_records.rb`
- **Hotel Setup workflow:** `/admin/cms/hotel-setup` manages operational master data (floors, room categories, and rooms). Public page images are uploaded directly from `/admin/cms/pages`.

### Validation completed today

- `npx tsc --noEmit` passed after the active frontend changes.
- Real authenticated CMS media workflow passed against Rails: upload → list → public image request (HTTP 200) → delete.
- Authenticated request through the Vite-to-Rails proxy returned HTTP 200.
- Rails migrations and seeds were applied to local Docker development. The OWNER seed role now has `CMS` read/create/delete permissions required by the new media API.

### Important current caveats

- Production hosting must provide SPA history fallback to `index.html` and reverse-proxy `/rails-api/*` to Rails `/api/*`.
- CMS media currently uses the local Active Storage disk service. For production, configure S3-compatible/object storage and persistent backups before deployment; do not rely on ephemeral server disk.

### Recommended next work

1. Continue CMS depth: page sections beyond hero, saved contact information, testimonials/FAQs, draft/publish scheduling and revisions.
2. Resolve the public-page Suspense build failures before a production release.
3. Add integration tests for CMS pages/offers/media; the current media workflow is manually verified but needs automated coverage.
4. Continue PMS reservation UI wiring and live dashboard data improvements as described below.

## Resume Here (2026-09-09 session end)

## Session Update - 2026-09-17

- The public Room and Home catalog cards are live from Hotel Setup Room Categories through `GET /api/v1/room_catalog`; do not restore the old hard-coded category arrays.
- The booking page's Optional Add-On Experiences are live from `GET /api/v1/add_on_catalog`. It supports `PER_BOOKING`, `PER_NIGHT`, `PER_GUEST`, and `PER_GUEST_PER_NIGHT`; guest-based pricing includes adults and children.
- SPA is now `PER_GUEST` (Rs. 4,000 per person) via migration `20260917000001_set_spa_pricing_per_guest`.
- Dashboard stat values are live. The visual stat icons/sparklines are deliberately fixed; data refreshes on focus, visibility, dashboard booking, and every 30 seconds. A reservation is an Arrival/Reserved room, while only a checked-in guest contributes to In-house and Occupancy.
- Embedded dashboard bookings use authenticated staff permissions. `20260917000002_grant_operational_booking_permissions` grants booking-create permission to OWNER, MANAGER, and FRONT_DESK_STAFF. The create endpoint accepts either `RESERVATIONS:create` or `PMS_FRONTDESK:create`.
- Browser favicon points to `public/images/favicon_logo.png`.
- Validation after this session: full Rails suite 33 runs / 192 assertions / 0 failures; changed backend files pass RuboCop; production frontend build passes.

### Reference project

Use `D:\Laravel Projects\kamra-pms-develop` as the local design and workflow reference for future Hotel New Era work. Copy its interaction and layout patterns selectively, but keep Hotel New Era's React/Vite + Rails architecture, Nepal localization, and own branding/data.

### Current UI state

- Dashboard top KPI cards are temporary static presentation seed data: Arrivals 1, Departures 0, In-house 10, Occupancy 20% (3 of 15), Revenue `Rs. 9,819`, RevPAR `Rs. 983`. Fixed sparklines and the Kamra-style layout are in `src/pages/admin/dashboard/page.tsx` and `src/components/ui/StatTile.tsx`.
- KPI cards now mirror Kamra's compact `StatCard`: icon/label row, value and fixed 96×32 sparkline side-by-side, subtle border, and progress-bar variant. Revenue labels do not wrap.
- Dashboard header has compact `New Booking` → `/book`.
- Clicking a Room Board room opens a status modal (Clean, Dirty, Inspected, Occupied, Out of Order) and saves only after **Update status**. The unselected Occupied option uses soft green/dark text for visibility.
- Sidebar width is 240px (208px Kamra reference was too narrow for HNE labels); sidebar-header horizontal padding is 12px.
- Topbar includes: compact Kamra-style app-grid launcher, UI-only temporary hotel selector (Butwal/Kathmandu/Pokhara), flexible search, website/theme/notifications/user controls. The launcher opens a 3-column icon grid and **View all apps** → `/admin/apps`.
- Current topbar spacing: 16px left padding, 16px app-grid/hotel gap, 12px hotel/search and utility gaps, flexible `AdminSearch` (`minWidth: 210px`), 32px right padding. Do not restore fixed 420px search width.

### Local development/auth state

- `backend/config/initializers/bcrypt.rb` applies `BCRYPT_COST` only in development/test. Docker development sets `BCRYPT_COST: 8`; production bcrypt security is unchanged. Default local seeded login remains `admin@hotelnewera.com` / `ChangeMe-Admin-2026!` unless manually changed.
- The frontend is now Vite-based; the former `.next` cache warning no longer applies.

### Next work

1. Replace static KPI values and temporary property selector with live Rails data only after visual approval; real Kathmandu/Pokhara properties need explicit authorization and tenant/property-context wiring.
2. Continue adapting Kamra's front-desk workflow patterns (Today board, reservation detail, tape chart) without changing HNE's backend architecture.
3. Sajhilostay reference: do not attempt to extract private backend data. The requested demo URL was inaccessible here; require authorized credentials, screenshots/video, or an official export before using it as reference.

Validation at session end: `npx tsc --noEmit` passed; `http://localhost:3000/admin/dashboard` returned HTTP 200.

**This session's work (full detail in `docs/CONVERSATION.md`, dated entries under 2026-09-02):**
- Ran a 5-module audit (PMS/POS/CRM/Accounting/CMS) against the spec and wrote the phased build plan: `docs/plans/IMPLEMENTATION_PLAN_v3.0_OWNER_PORTAL.md`. Phase 0 (POS billing server-trust fix, transactions, idempotency, journal/audit-log immutability) is done; BS/AD date conversion is still stubbed and open.
- Rebuilt the admin dashboard on real data (`GET /api/v1/dashboard`), added 6 stat tiles with sparklines.
- Admin topbar/sidebar: dark mode (with a real accent-color contrast pass, not just backgrounds), a quick-nav search, spacing/sizing fixes, a working notifications bell (new `notifications` API + UI, backed by the pre-existing but previously unused `Notification` model).
- **Seeded a real, permission-checked `OWNER` role** (was `SUPER_ADMIN`, which bypasses all authorization — nothing had ever been tested against a scoped role). Full audit of every controller's permission module/action pairs is in `db/seeds.rb`'s comments and `docs/CONVERSATION.md`.
- **Fixed a live production bug found while verifying the above**: the public site's availability search, CMS content, and contact form were all 500ing for every anonymous visitor (`skip_before_action :authenticate!` without also skipping `authorize_request!` in 4 controllers). Confirmed via direct curl before/after.

Next recommended work:

1. Continue the Owner-portal plan: BS/AD date conversion port, then Phase 1 (posting-rule/account-mapping model) before Phase 2 (wire the PMS reservations page — still 100% mock data with zero fetch calls despite the backend fully supporting it).
2. Extend dark-mode CSS-variable theming to the ~18 remaining admin pages that still use hardcoded `#FFFFFF` (POS, CRM, housekeeping, inventory, procurement, banquet, accounting, CMS, audit-logs, settings, front desk, rooms, night-audit) — currently only the shell + dashboard are dark-mode-correct.
3. Seed the remaining §6.2 roles (Manager, HR, Staff, Finance) once those portals are actually being built — not urgent now that `OWNER` exists and is verified.
4. Move frontend fetch calls from `/api/...` proxy URLs to `/rails-api/v1/...` where practical.
5. Expand accounting automation for POS, checkout, banquet, inventory, and procurement.
6. Add production deployment settings, backup policy, monitoring, and error reporting.

## Confirmed Working Foundation

- Ruby 3.4.10 and Rails 8.1.3.1 API application.
- PostgreSQL 17 through Docker Compose.
- JWT login and current-user endpoint.
- Refresh-token backed API sessions with rotation and logout revocation.
- Password reset token workflow with session revocation after reset.
- API request throttling for general and sensitive authentication endpoints.
- Production startup guards for required secrets, host authorization, SSL, and CORS origins.
- Default server-side role/permission authorization for authenticated API actions.
- Company and property tenant scope on authenticated API requests.
- Property, room type, room, and availability read APIs.
- Transactional reservation creation with room quote, taxes, folio, and audit log.
- Transactional reservation modification, cancellation, room assignment, check-in, stay extension, and room transfer.
- React public booking integration with Rails.
- Development seeds for one property, 43 rooms, room types, rates, taxes, services, role, and administrator.
- OpenAPI description in `backend/openapi/v1.yaml`.
- Rails persistence for CMS, CRM, housekeeping, inventory, POS, procurement, banquet, accounting, contact inquiries, notifications, and payments.
- Centralized React-to-Rails API client with no Prisma imports.

## Current API Domains

```text
backend/app/controllers/api/v1/
|-- identity/       Authentication and current-user identity
|-- hotel/          Properties, room types, rooms, availability
|-- pms/            Reservations, PMS rooms, front desk, folios, checkout, night audit
|-- cms/            Public/admin CMS pages and offers
|-- crm/            Guest profiles
|-- housekeeping/   Room cleaning status/actions
|-- inventory/      Stores, stock balances, stock issue
|-- pos/            Restaurant tables, menu items, and billing
|-- procurement/    Purchase orders
|-- banquet/        Halls and event bookings
|-- accounting/     Chart of accounts, journals, reports
|-- dashboard_controller.rb     Owner-portal overview stats (7-day trends, GL-sourced revenue)
|-- notifications_controller.rb In-app notifications (list, mark-as-read)
|-- contact_inquiries_controller.rb
`-- base_controller.rb

backend/config/routes/
|-- identity.rb
|-- hotel.rb
|-- pms.rb           (also draws the top-level dashboard resource)
|-- cms.rb
|-- crm.rb
|-- operations.rb    (housekeeping, inventory, pos, procurement, banquet)
|-- accounting.rb
`-- notifications.rb
```

The public URL contract remains `/api/v1/...`; the domain folders improve internal ownership without changing client URLs.

## Migration Boundary

`backend/` is the authoritative destination for all backend work. React owns presentation; Rails owns persistence, authorization, validation, and business workflows. Prisma and Next.js were removed from the active frontend stack.

When adding or changing a frontend API call, update the shared mapping in `src/lib/api-client.ts` and implement the authoritative endpoint, authorization, validation, and audit behavior in Rails.

## Important Requirements

- Support multi-company and multi-property tenancy from the beginning.
- Use integer minor units or fixed-precision decimals for financial values; never floating-point arithmetic.
- Keep reservation, inventory, folio, payment, and accounting writes transactional.
- Preserve append-only audit evidence for sensitive operations.
- Enforce permissions and tenancy on the server.
- Do not use wildcard CORS origins or short JWT secrets in production.
- Generate sequential business document numbers safely under concurrency.
- Keep Nepal taxation, fiscal reporting, and BS/AD date presentation requirements explicit.

The full requirements audit is in `docs/PROJECT_REQUIREMENTS_AND_RAILS_ROADMAP.md`.

## Common Commands

```bash
# Start backend and database
npm run backend:up

# Prepare database
docker compose -f backend/compose.yml run --rm api bin/rails db:prepare

# Rails tests and quality checks
npm run backend:test
docker compose -f backend/compose.yml run --rm api bin/rubocop
docker compose -f backend/compose.yml run --rm api bin/brakeman --no-pager
docker compose -f backend/compose.yml run --rm api bin/rails zeitwerk:check

# Frontend
npm run dev
npm run build
```

## Safe Development Workflow

- Put HTTP concerns in the appropriate namespaced Rails controller.
- Put multi-record workflows and calculations in `backend/app/services/<domain>/`.
- Put persistence rules and associations in Active Record models.
- Add a route to the matching `backend/config/routes/<domain>.rb` file.
- Add or update integration tests under `backend/test/integration/`.
- Update `docs/architecture/MODULE_MAP.md` when a module changes migration state.

## Latest saved payroll and Rooms changes

- Monthly salary is split into 60% basic and 40% fixed monthly allowance, with default 1% TDS. Additional earnings, other deductions, and the TDS exemption reason input are removed; notes are optional. Historical financial evidence is retained.
- Staff advances are enabled for draft payrolls. The Record advance button is in the payroll toolbar with an employee selector, keeping row actions compact. Advances post balanced cash/bank journals, reduce net salary, and recover at approval. Duplicate requests and advances beyond remaining salary are blocked.
- Monthly payroll and salary setup tables have centered headers/cells and vertical borders. Accounting navigation stays flat; operational panel wording follows AGENTS.md.
- Rooms uses the existing API and database. Last read-only verification found 45 active rooms on five floors, all recorded Vacant Clean. The OOO action now reads Out of Order.
- Validation: frontend type check and browser checks passed. Payroll suite covered 26 tests; its sole failed assertion was corrected for equal frozen timestamps, and the affected test passed on rerun. Financial tests used isolated test data; browser checks did not save operational payments.
