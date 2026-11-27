# SMA / Map Credits v0.1 — Compact, legible attribution

**Date:** 2026-11-27
**Status:** independent Draft PR prototype; keep main unchanged until visual review.

## User-reported problem

The native MapLibre `AttributionControl({ compact: true })`, placed at bottom left, expands into a large white overlay with the LTA dataset notice. On iPhone it overlaps the bottom navigation/setting controls and blocks reading. It collapses on map movement, making the content unstable.

## Selected design

A two-level attribution system, with a visible on-map short notice and a self-contained dialog for details:

1. At the very bottom-left edge of the map, **below** the floating exploration controls, show two unobtrusive lines: `© OpenStreetMap contributors · OpenMapTiles` and `OpenFreeMap · LTA`, plus a small information glyph. The entire text-and-icon strip is clickable and 32px high, fitting into the narrow gap below the floating controls. At this location a 44px target would intrude on the navigation; re-evaluate accessible target sizing if the placement changes.
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

- `src/App.tsx`: compact bottom-left attribution, keyboard-accessible shared dialog, Settings navigation, and native attribution removal.
- `src/styles.css`: low-contrast, background-free credit near the bottom edge, responsive dialog sizing and scroll containment. Uses SMA Day/Night CSS tokens. Does not use overlay-size hacks to cover the map.
- `scripts/mapCredits.test.mjs`: verifies visible source names, all licensing links, dialog and focus restoration, and absence of expanding native control.
- CI runs `npm run test:credits` in addition to existing publish tests and build.

## Verify on preview before merging

- On 390px iPhone, bottom-edge credit must be quiet and readable **below** the main navigation controls. In preview/detail views it shifts to a small unboxed label beneath the logo to avoid covering the sheet.
- Normal map pan should NOT open or close the credits dialog.
- Tap full credit to open; close X, Escape and focus restoration should work.
- Open Settings -> Map data & credits -> close; focus returns to Settings gear.
- Check the modal scrolls without clipping on a short landscape screen.
- All named basemap and LTA links work. Existing OSM/OpenMapTiles credit stays **visible** outside the dialog.
- Confirm Day/Night and EN/JA, both root and language-prefixed URLs.
- Do not declare the changed attribution presentation legally certified without separate review.

## v0.1.1 visual correction: less prominent source text

A user screenshot of the first Vercel preview showed the upper-left attribution as a **large opaque white floating card** that visually rivalled the main map controls. The design was rejected on visual hierarchy grounds even though its semantics and links were correct.

The revision **does not change the source information or its dialog**. It removes all fill, rounded-card surface, shadow and horizontal/vertical padding; reduces the visible credit typography to 9px, tones it with the map-muted colour, and anchors the credit to the bottom-left map edge, below the floating UI. The text and small ⓘ still open the same dialog. In preview/detail states with a bottom sheet, the small unboxed label is moved below the top-left logo to stay discoverable. Specific thresholds and exact opacity are provisional pending a mobile screenshot.

The credit is intentionally not another floating navigation button. It is a map disclosure/attribution element that should be present but visually secondary. Verify whether the 9px type is still sufficiently readable; if not, prefer restoring 10px before adding any background card.

## v0.1.2 — Icon-first alignment refinement (2026-11-27)

Screenshot review confirmed the quiet bottom-left credits and modal were working. The user requested the ⓘ icon to the **left** of the two-line credit and considered alignment to the Settings control either by left edge or by centre. Adopt **centre alignment**: both controls share the same safe-area-aware left offset (12px), and a 56px-wide first grid column centres the 17px information icon directly beneath the 56px circular Settings button. The credit names occupy the second column. Keep the two-line 9px typography, transparency, modal, source names, tap area and Day/Night styles unchanged. No changes to the underlying credits or licence information.

Check 390px and 320px phone widths, EN/JA, Day/Night, compact/detail sheet states and iPhone safe-area bottom padding. Do not merge without the updated screenshot check.

## v0.1.3 — One centred attribution group (2026-11-27)

The second screenshot revealed an unintended **56px reserved icon column**: the ⓘ was aligned separately to the Settings button but sat too far from the two-line copyright credit. The second text line was left-aligned rather than centred. The user rejected this mixed alignment.

Make the icon and both credit lines one compact `inline-flex` group: `align-items: center`, `justify-content: center`, `gap: 6px`. The 17px icon appears immediately to the left of the text and is vertically centred against the full two-line block; both attribution lines are centred relative to each other with `text-align: center`. Keep the complete group near the lower-left map edge, aligned by its outside left edge to the Settings control's outside left edge, without allocating a separate 56px icon cell. Retain 9px muted type, transparent background, credits modal, source names, and URL links. Verify screenshot before merge.

## v0.1.4 — Centre the complete disclosure in the viewport (2026-11-27)

The prior explanations conflated three distinct alignments: (1) text alignment inside the two lines, (2) spacing between ⓘ and the text, and (3) the **horizontal position of the entire attribution group on the map**. The user's intended choice is (3): bottom-centre or bottom-left. If bottom-left, the entire group's left edge should align with the Settings circle's left edge; **for this iteration the user prefers bottom-centre**.

Keep the cohesive ⓘ + two-line credit group and its 6px internal gap. Set `.map-credit-entry` to `left: 50%; transform: translateX(-50%); width: max-content` so the **complete group** is centred at the map viewport, not just the icon or line text. Preserve the short bottom offset, muted typography, no card surface, and existing dialog. The preview/detail-sheet top-offset rule remains but retains the same horizontal centre. Confirm that the complete group is centred on 390px and 320px screens and does not collide with bottom navigation.
