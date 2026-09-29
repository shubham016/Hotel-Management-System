# Client data from `pics/` (29 September 2026)

The five client images are the source for `backend/db/client_data.rb`. Run `bin/rails runner db/client_data.rb` from `backend/` to create room inventory, tariffs, taxes, extras, staff, and laundry records in an existing database. Fresh database seeds call the same import. The import creates missing client defaults and preserves later edits, reservations, and folios.

- `Floors & Rooms.jpg`: 45 listed rooms on five levels. Room numbers 1xx through 5xx map to Ground through 4th Floor. Yellow indicates non AC, green indicates AC. The supplied last column is treated as bed count.
- `Rooms Prices.jpg`: nine priced categories. Prices are per room and exclude 13% VAT. The image does not list a service charge. The hotel confirmed Dormitory 105's NPR 4,000 is for the whole room, not per bed.
- `Extra Services.jpg`: breakfast NPR 350 per person per day; airport pickup NPR 2,000 per booking. The hotel confirmed 13% VAT is added on top of these prices.
- `Laundry.jpg`: nine item prices (NPR 50–500), collection request by 11 a.m., return by noon the following day. The hotel confirmed 13% VAT is added on top of the listed prices. The source spells the last item "Shocks"; the client confirmed the correct item name is "Socks".
- `Staff details.jpg`: 12 names and departments. These are property-scoped database records editable in Settings. Login accounts were not created because the image provides no email addresses or credentials.

Laundry tariffs, collection and return instructions, extra services, property details, and tax settings are also editable in Settings. The Front Desk laundry selector and booking quotes read the current database values. The calendar tab is display only.

The hotel confirmed room 509 is a three-bed Deluxe AC room at NPR 4,000 per room per night, plus 13% VAT. All 45 listed rooms are bookable.

The sheets give bed counts, not guest limits. Provisional capacities are: dormitory 5 adults; single Deluxe 1 adult; twin Standard/Deluxe 2 adults or 1 adult and 1 child (2 guests total); triple Standard/Deluxe up to 3 adults or 2 adults and 1 child (3 guests total); one-bed Suite 2 adults or 1 adult and 1 child (2 guests total); Family Suite Apartment 2 adults and 2 children (4 guests total). The separate adult and child limits never override the combined guest limit. These are working assumptions based on comparable hotel room listings and need hotel confirmation, including bed sizes and children's ages.

Previously entered rooms missing from the client sheet are inactive and hidden from Hotel Setup, not deleted, because eight existing reservations reference some of them. Existing reservation prices and folio history are unchanged.
Two existing inquiry reservations still point to inactive rooms 102 and 104. Staff should reassign them to confirmed client inventory before check-in.
