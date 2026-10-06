# Changelog — TripExpense

Version format: **MAJOR.MINOR.REVISION**. The REVISION is rolled up (+1) on every released edit; MINOR on a new feature; MAJOR on a new generation.
Asset counter (`?v=`) and the service-worker cache name (`tripexpense-<version>`) change with every release, so browsers never keep old files.

## 2.0.7 — The link reader now says why it failed
**No SQL change, and the Edge Function is unchanged.**
- **No more silent failures.** In 2.0.6, when the call to `resolve-map-link` was refused (401), crashed (500) or could not be reached (network, CORS, wrong function name), the form only said "this link has no coordinates", with no reason and no button. Now the preview (and the amber pin bar) shows a line "ผลตรวจ: …" — for example "the function refused the call (401) — usually authentication (Verify JWT)", "the server function failed (500)", "the function could not be reached (network, CORS or a wrong function name)", "the function took longer than 10 seconds", or, when the function answered but Google gave no coordinates, "Google did not send coordinates for this link (no_coordinates)".
- **The copy button always appears on a failure** and the copied details now include the HTTP status, the error name and the server's own message (for example `Invalid JWT`), as well as the steps Google took when the function did answer.
- The English text of the "this link has no coordinates · it can open navigation…" note was missing for the current wording; added.

## 2.0.6 — Plus codes, and a stricter short-link reader
**Redeploy the Edge Function** (`edge-functions/resolve-map-link/index.ts`, replace the old code and Deploy). No SQL change.
- **Plus code support.** The coordinates box is now "พิกัด หรือ Plus code": paste what Google Maps shows for a place. A full code (8FVC9G8F+6W) is read at once. A short code with a city (QG83+VC กรุงเทพ) looks the city up and recovers the exact place; with no city the trip's destination, then another place of the trip, is the reference; if nothing can be used, or the typed city is not found, it says so instead of guessing. Decoding is done inside the app (Open Location Code), no server needed.
- **Check what the app understood.** Wherever a position is known, the preview shows its Plus code and a "ตรวจใน Google Maps" link, and every stop card shows its Plus code next to "มีพิกัด" — compare it with the Plus code Google shows for the place.
- **Pin bar:** a "Plus code" button opens a box to paste a code and jump straight to it; the box opens by itself, and the bar turns amber, when the place could not be found from the link.
- **Stricter server function.** It now accepts only the place's own pin (`!3d…!4d…`, `q=`/`ll=`/`destination=` in the redirect addresses, and the static-map `markers=` in the page). It no longer reads `@lat,lng` or `center=` from a page, which are the map's default view and not the place — the likely reason for "the position is where I am". `center=` is no longer read from pasted links either.
- **Diagnostics.** When a short link cannot be read, a "คัดลอกรายละเอียดการตรวจลิงก์" button copies the steps Google took (status, host, short path) so the reader can be adapted.
- English text added.

## 2.0.5 — Map follows the item you tap; Google link wins over old coordinates; add buttons on wide screens
**No SQL change.**
- **Tap an item, the map goes to its place.** On the map tab each item is tappable: the map flies to that item's position (street level), its pin is highlighted, its card gets a green frame and the map is brought into view. Buttons inside a card (แก้ไข, ปักหมุด…) do not change the selection. On opening, the first item with a position is selected (the map no longer zooms out to every stop). New button "ดูทุกจุดของวัน".
- **The Google link wins over an old saved position.** If an item's saved position is more than 300 m from where its Google link points (for example a wrong position was saved earlier), a note says how many km apart and offers "ดูตำแหน่งจากลิงก์" / "ใช้ตำแหน่งจากลิงก์". An item that has a link but no saved position shows the link's place straight away with "บันทึกตำแหน่งนี้". "ปักหมุด" now starts at the link's place.
- **The user's own position is never pre-selected as a place** when nothing can be found: the map opens at their position but no pin is placed and "ใช้ตำแหน่งนี้" stays disabled until they tap the map. (In 2.0.3–2.0.4 it was pre-selected, so it could be saved as the place's coordinates by mistake.)
- **Form:** pasting a new link replaces the old coordinates, except coordinates the user typed themselves; coordinates a previous link filled in are dropped when the link changes.
- **Wide screens:** the title row (and its add button) only exists up to 950 px wide, so a dedicated button was added: "＋ เพิ่ม" on the Travel tab, "＋ เพิ่มสถานที่" on the map tab, never two at once. The sticky tabs/day chips now sit exactly under the (taller) desktop top bar.
- English text added.

## 2.0.4 — Short Google Maps links, clearer pin layout
**Optional, recommended:** deploy the Edge Function `resolve-map-link` (see `edge-functions/`). Without it everything still works as in 2.0.3.
- **Short links (maps.app.goo.gl, from Google Maps' Share button) have no coordinates inside**, so the browser cannot read them. The Edge Function follows the link on the server and returns the place's coordinates. The app uses it (1) a moment after a link is pasted — the coordinates box fills itself, (2) when saving, (3) when ปักหมุด is pressed on an item that has a link but no coordinates. If the function is not installed (404), or the network fails, the app falls back to searching the place name, then to the current position, and never blocks saving.
- Links of the form `/maps/place/18.8,98.9` are now read in the browser too.
- **Pin mode layout:** the map sits right under the sticky header and is taller; the day chips are hidden while pinning; the confirm bar is below the map and floats above the bottom menu (and clear of the raised "สำรวจ" button), so "ใช้ตำแหน่งนี้" is always reachable, also on short phones.
- English text added.

## 2.0.3 — Schedule header layout and smarter pin start
**No SQL change.**
- **Schedule page (phone):** the heading + description + big "＋ เพิ่ม" card is gone; the one add button sits in the title row. On the map tab that button becomes **"＋ เพิ่มสถานที่"** (adds a place for the day shown) and the big in-page button is removed.
- **Sticky header:** top bar, title row, the two tabs and (on the map tab) the day chips stay fixed while the page scrolls.
- **Pin start (ปักหมุด / ย้ายหมุด):** the map now zooms in (street level, like opening the link in Google Maps) with a starting pin: the saved position or the position inside a full Google Maps link; for a short link (maps.app.goo.gl, no coordinates inside) the place name is searched on OpenStreetMap, and if it is not found, or there is no link at all, the pin starts at the user's current position. Tap the map to move it, "ใช้ตำแหน่งนี้" to save. If the current position cannot be read the bar says so and a tap still works.
- The pin bar keeps a fixed height, so the map no longer jumps after the first tap. When the pin button is pressed while scrolled down, the bar comes up below the sticky header.
- English text added.

## 2.0.2 — Pin by tapping, place categories, date-filtered expense links, one-calendar trip dates
**SQL to run first (small, safe to run twice):** `sql/v20_2_place_category.sql`. If it has not been run, the app still saves Schedule items but skips the category and says so.
- **Map tab — tap to pin.** Every stop you may edit has "ปักหมุด" (no position yet) or "ย้ายหมุด" (move it). Tap the map, see a green temporary pin and its coordinates, then "ใช้ตำแหน่งนี้". The map is shown even when no stop of that day has coordinates. Nothing is saved when you cancel or change day.
- **Expense form — "เชื่อมกับ Schedule" shows only items on the expense date** (time is optional, items are sorted by time) and refreshes when the date changes. An item that was linked earlier on another day stays selectable, marked "(คนละวัน)". Same in the edit form.
- **Expense form — payer and split.** Payer starts as the signed-in user (others can be chosen); the "หารกับใครบ้าง" heading now shows the state: "ทุกคนเท่ากัน (N คน)" or "เลือกเอง M จาก N คน".
- **"การเดินทาง" form re-ordered:** date/time → activity → from/to → **place name + coordinates** → **place category** (buttons: โรงแรม/ที่พัก, ร้านอาหาร, คาเฟ่, ห้างสรรพสินค้า, วัด + a box to type another) → location link → details. The hotel name, hotel price and hotel payer fields are removed (enter lodging costs in the expense form and link them to the Schedule item). Old items keep their hotel name and any expense already linked.
- **Create/Edit Trip: one calendar.** Tap the first day, then the return day; the days between are painted green. Tapping an earlier day swaps them, tapping the same day twice makes a one-day trip.
- English text added for all of the above.

## 2.0.1 — Map tab: add and edit places
- The Schedule **map tab** now has **"＋ เพิ่มสถานที่ของวันนี้"** (opens the add form with the selected day already filled in) and an **แก้ไข** button on every stop (opens the edit form with place name, link and coordinates filled in).
- After saving, the map refreshes by itself and stays on the same day and tab; a new or moved pin appears at once.
- Permissions follow the list: an ordinary member edits only stops they created, a trip admin edits all, and nobody can add or edit when the trip is closed (opening in Maps and check-in still work).
- English text added. No SQL change.

## 2.0.0 — Phase 2A (first version in the new numbering; follows V19.0)
**New**
- Centre button of the bottom bar is now **สำรวจ (Explore)** with 8 tabs (stays, tickets, cars/transfers, deals, insurance, eSIM, tours, reviews). Tabs that are not built yet say "เร็วๆ นี้". `FEATURES.exploreHub=false` in `js/explore.js` brings the old ＋ quick menu back.
- **Location link on every Schedule item** (link, place name, coordinates read from full Google Maps links) and a real **map tab** in Schedule (Leaflet, loaded only when the tab opens).
- **Check-in** on Schedule items and a private **My travel map**: 77 provinces, 6 regional medals, pins, timeline.
- **Offers**: pop-up shown once when a condition is met (trip anniversary, no trip for N days, season window). The user can only tap View or Close; there is no permanent opt-out. Offers shown are kept in a history page.
- **Ad slots**: 8 prepared positions, our own banners (rotating, weighted, scheduled) or AdSense, switched on/off from the Developer page. Every ad carries the word "โฆษณา".
- **Developer page**: aggregate-only system overview (users, logins, groups, trips, ad clicks, offers, partner click-outs), ad slots and banners, offer campaigns, partners and links. No personal data (PDPA).
- English text for all new screens, including the names of the 77 provinces and 6 regions.

**Permissions (database)**
- Developer can edit ads/campaigns/partners and see aggregate statistics, and can **no longer read** personal data: profiles, contacts, groups, trips, expenses, schedules, documents, chat, photos, check-ins. The old "open any trip" mode is gone.
- User / Admin Group / Admin Trip rules unchanged and now covered by tests: only a creator hands out admin; admin of a group is not admin of its trips and vice versa.

**SQL to run, in this order:** `sql/v20_phase2a.sql` then `sql/v20_developer_privacy.sql`.
Undo of the privacy change: re-run v14_security.sql, v14_1_refunds.sql, v15_join.sql, v16_social.sql, v17_media.sql, v18_history.sql in that order.

**Fixed while building:** banner container collapsing when the image is not loaded; centre-button label cut off at the screen edge; banner list hidden after adding a banner; `NaN` in the trips counter; range template printing `1--100`.
