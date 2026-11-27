# SMA / Map Credits v0.1 — Compact, legible attribution

**Date:** 2026-11-27
**Status:** independent Draft PR prototype; keep main unchanged until visual review.

## User-reported problem

The native MapLibre `AttributionControl({ compact: true })`, placed at bottom left, expands into a large white overlay with the LTA dataset notice. On iPhone it overlaps the bottom navigation/setting controls and blocks reading. It collapses on map movement, making the content unstable.

## Selected design

A two-level attribution system, with a visible on-map short notice and a self-contained dialog for details:

1. In the map's upper-left corner, below the SMA logo and away from the bottom navigation, show two compact lines: `© OpenStreetMap contributors · OpenMapTiles` and `OpenFreeMap · LTA`, plus a small information glyph. The **whole area is one 44px-high tap target**.
2. Tap the on-map credit: a centered, native `<dialog>` opens. It lists independent basemap sources and the full LTA MRT station data notice + links to the Singapore Open Data Licence version 1.0 and the MRT Kiasu processing source.
3. In Settings, add `Map data & credits` opening **the same** dialog. Closing returns keyboard focus to the map entry or Settings gear, depending on the opener.
4. Remove the native expanding MapLibre attribution control so it cannot cover the architecture controls. **Do not remove the credits themselves**: the on-map short source names stay visible.

### Cartographic rationale

- A map corner is visually less demanding than the floating central UI, and has established semantics for map attributions.
- The user-facing bottom action buttons are already closely spaced; the attribution should not expand there.
- Separating map attribution from broader SMA concept/Information keeps informational roles distinct.
- A dedicated modal makes language/links, keyboard focus and scrolling easier to control than MapLibre's inline content.

### Attribution and source responsibilities

- **OpenStreetMap Foundation** guidelines: readable © OpenStreetMap contributors and a link to the copyright page; compact disclosure may be appropriate on small screens if easy to access.
  - https://osmfoundation.org/wiki/Licence/Attribution_Guidelines
  - https://www.openstreetmap.org/copyright
- **OpenMapTiles**: credit should appear in the map corner for electronic maps using its data and OpenStreetMap.
  - https://openmaptiles.org/docs/terminology/attribution/
  - https://github.com/openmaptiles/openmaptiles
- **OpenFreeMap**: attribution is required; tile/style provider is distinct from OpenStreetMap data.
  - https://openfreemap.org/
- **LTA / Singapore Open Data Licence**: acknowledge the Train Station and Train Station Codes and Chinese Names datasets, provide a link to the licence, and preserve their provenance.
  - https://datamall.lta.gov.sg/content/datamall/en/SingaporeOpenDataLicence.html
  - https://datamall.lta.gov.sg/content/datamall/en/static-data.html
  - https://github.com/abhijitt/mrt-kiasu

The dataset entered SMA via a **Sep 2026 MRT Kiasu source snapshot**; this is not a claim that SMA itself fetched LTA's dataset on an exact day. No map style change is made.

**Scope caveat:** attribution requirements can change with third-party map sources. When replacing Liberty or adding new maps, revisit this component and its explicit links rather than relying on outdated static credits. Final legal interpretation remains for independent review.

## Implementation

- `src/App.tsx`: compact fixed corner attribution, keyboard-accessible shared dialog, Settings navigation, and native attribution removal.
- `src/styles.css`: lightweight translucent compact display below logo, responsive dialog sizing and scroll containment. Uses SMA Day/Night CSS tokens. Does not use overlay-size hacks to cover the map.
- `scripts/mapCredits.test.mjs`: verifies visible source names, all licensing links, dialog and focus restoration, and absence of expanding native control.
- CI runs `npm run test:credits` in addition to existing publish tests and build.

## Verify on preview before merging

- On 390px iPhone, top-left credit must remain beneath the logo, not overlap the weather chip, search, architecture actions or lower sheet.
- Normal map pan should NOT open or close the credits dialog.
- Tap full credit to open; close X, Escape and focus restoration should work.
- Open Settings -> Map data & credits -> close; focus returns to Settings gear.
- Check the modal scrolls without clipping on a short landscape screen.
- All named basemap and LTA links work. Existing OSM/OpenMapTiles credit stays **visible** outside the dialog.
- Confirm Day/Night and EN/JA, both root and language-prefixed URLs.
- Do not declare the changed attribution presentation legally certified without separate review.
