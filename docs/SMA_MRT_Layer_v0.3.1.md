# SMA / MRT Layer v0.3.1 — Earlier Labels, Preserved Hierarchy

**Date:** 2026-11-27  
**Status:** controlled preview experiment, not merged into main.  
**Based on:** v0.3 full-network caplets in draft PR #12.
**Review dependency:** Draft PR #13 targets `main` so the existing pull-request CI runs. The branch still includes the unmerged v0.3 work from PR #12; do not merge PR #13 independently.

## User observation

The full MRT caplets render successfully and their visual direction is approved. However, stations appear at different times while zooming, and useful railway context could be shown when the map is slightly farther out.

We **do not** force simultaneous display of 146 stations. There are two separable causes of appearance differences:

1. Explicit zoom gates in SMA v0.3: before z13.75 none; z13.75–15 only 2-/3-line interchanges; from z15 all stations.
2. MapLibre symbol collision/placement and asynchronous icon decoding. In a dense district, some stations may not fit at the exact threshold. This is expected, and useful if it prevents map clutter.

## Chosen design adjustment

| Zoom | v0.3 baseline | v0.3.1 experiment |
| --- | --- | --- |
| below 13.25 | no custom MRT labels | unchanged |
| 13.25–13.75 | none | interchange colour stripe + name |
| 13.75–14.25 | interchanges only | unchanged content, now with explicit priority |
| 14.25–15 | interchanges only | **all** MRT stations eligible for compact stripe + name |
| z15+ | all full code caplets + names | unchanged, with explicit placement priority |

This reveals **familiar station names and official line-colour identities sooner** without moving the large full-code caplets to crowded lower zooms.

**Layer layout:** three non-overlapping zoom ranges:
- `sma-mrt-network-overview`: z13.25–14.25; interchange only.
- `sma-mrt-network-context`: z14.25–15; all 146 operating MRT stations, collision-filtered.
- `sma-mrt-network-full`: z15–18; all station codes + names.

**Priority:** `labelPriority = 3 - numberOfLines`; MapLibre `symbol-sort-key` places smaller values before larger values when overlaps are disabled. Triple transfers have priority 0, two-line interchanges 1, ordinary stations 2. The priority works **within the MRT layer** and does not guarantee that every transit label outranks basemap or architecture symbols.

**No change** to approved caplet colours, font, geometry, dataset, architecture pins, attribution, or Day/Night palette. `icon-allow-overlap: false` and `icon-ignore-placement: false` are retained. If an MRT symbol cannot fit, it can remain hidden at that zoom. The station codes remain complete for interchanges; we do not drop connecting lines merely to fit labels.

## Reliable zoom-preview URLs

The comparison camera now respects an explicit `cartographyPreview` even if a previous map location was saved locally. With that focus parameter present, `cartographyZoom` accepts z9–18.

Use these on the v0.3.1 Vercel preview (and keep `mrtNetwork=1`):
- Dense CBD: `/en/?cartographyPreview=marina-station&cartographyZoom=13.5&mrtNetwork=1`
- District: `/en/?cartographyPreview=bugis&cartographyZoom=14.4&mrtNetwork=1`
- Neighborhood: `/en/?cartographyPreview=orchard-station&cartographyZoom=14.4&mrtNetwork=1`
- Western area: `/en/?cartographyPreview=jurong&cartographyZoom=14.4&mrtNetwork=1`
- At z15.5 or z16, original full-code caplets should look the same as v0.3.

## Acceptance checks

1. At z13.5, major interchange labels can emerge where space permits, without cluttering the Singapore-wide map.
2. At z14.4, previously absent single-line station names can now appear with small route-colour ticks. No requirement to show every station in dense parts of town.
3. At z15.5, all code caplets remain visually unchanged.
4. When labels collide, triple- and double-line interchanges should be favored over single-line stations **within the MRT layer**.
5. Mobile 390px and desktop 1280px, Day/Night, EN/JA; examine Marina Bay, Bugis, Orchard, Jurong and Punggol.
6. Verify no duplicated station labels, no architectural marker collisions, and no extra initialization time or console errors.
7. Compare screenshot viewpoints at matched centre, zoom, theme and screen size. If z14.4 is too dense, reconsider the middle zoom threshold (14.4–14.6), not the entire MRT design.

## MapLibre references

- [Style spec / symbol-sort-key and collision placement](https://maplibre.org/maplibre-style-spec/layers/#symbol-sort-key)
- [MapLibre symbol-layer layout and zoom limits](https://maplibre.org/maplibre-style-spec/layers/)
