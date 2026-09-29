# Client data from `pics/` (29 September 2026)

The five client images are the source for `backend/db/client_data.rb` and the staff/laundry reference in `ClientReferenceController`. Run `bin/rails runner db/client_data.rb` from `backend/` to apply room inventory, tariffs, taxes, and extras to an existing database. Fresh database seeds call the same import. The import is idempotent and preserves reservation and folio records.

- `Floors & Rooms.jpg`: 45 listed rooms on five levels. Room numbers 1xx through 5xx map to Ground through 4th Floor. Yellow indicates non AC, green indicates AC. The supplied last column is treated as bed count.
- `Rooms Prices.jpg`: nine priced categories. Prices are per room and exclude 13% VAT. The image does not list a service charge.
- `Extra Services.jpg`: breakfast NPR 350 per person; airport pickup NPR 2,000.
- `Laundry.jpg`: nine item prices (NPR 50–500), collection request by 11 a.m., return by noon the following day. The source spells the last item "Shocks"; the transcription preserves it pending confirmation.
- `Staff details.jpg`: 12 names and departments. These appear in the authenticated staff directory. Login accounts were not created because the image provides no email addresses or credentials.

Room 509 is marked as a three-bed Deluxe AC room, but there is no three-bed Deluxe price on the tariff sheet. It is listed in setup and held from booking until the hotel confirms a rate. The other 44 listed rooms are bookable. Guest capacities were conservatively set to the listed bed counts because the images do not supply occupancy limits; hotel management should confirm these limits before relying on online booking capacity.

Previously entered rooms missing from the client sheet are inactive and hidden from Hotel Setup, not deleted, because eight existing reservations reference some of them. Existing reservation prices and folio history are unchanged.
Two existing inquiry reservations still point to inactive rooms 102 and 104. Staff should reassign them to confirmed client inventory before check-in.
