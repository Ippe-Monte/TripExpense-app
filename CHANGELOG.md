# Changelog — TripExpense

Version format: **MAJOR.MINOR.REVISION**. The REVISION is rolled up (+1) on every released edit; MINOR on a new feature; MAJOR on a new generation.
Asset counter (`?v=`) and the service-worker cache name (`tripexpense-<version>`) change with every release, so browsers never keep old files.

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
