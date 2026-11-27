# SMA / Cartography Lab v0.1 — Named Rail Station Context

**Status:** development experiment; no production deployment.  
**Base:** OpenFreeMap Liberty via MapLibre GL JS; main at `39177d66414f1e2a2fe8dece71f2fe567aec8a21`.  
**Question:** Can a small amount of transport orientation help users discover and visit architecture, without turning SMA into a generic navigation map?

## Findings verified in code

- `src/App.tsx` loads `https://tiles.openfreemap.org/styles/liberty`.
- `applyMapStructure()` suppresses all Liberty `poi_*` symbols, including `poi_transit` (rail/bus/airport).
- Current architecture dots switch to building icons at z13.5; footprints fade in from z13.2–13.4; map zoom range is z9–18.
- Colors are applied from Day/Night tokens. No change to pin, color token values, panels, or application layout in this experiment.

## Experiment v0.1 — one decision, no runtime A/B UI

- Keep all `poi_*` symbols suppressed except `poi_transit`.
- In `poi_transit`, show *named* features with `class = railway` and `subclass = station | halt | subway` from the OpenMapTiles POI schema; suppress bus and airport labels.
- **Correction:** the first version mistakenly used `class = rail` (a transportation geometry class). That returned no matching POI station labels and was corrected after the preview was reported as unchanged.
- Show railway station names from z14 onwards. Use text only: remove the default icon; neutral, subdued map label styling; normal MapLibre text collision rules.
- The feature class is not a guarantee that all MRT stations will be present or uniquely labeled. Check the actual Singapore tiles before accepting the change.
- The rail label remains a background landmark, not a route planner or a new architecture pin.

## Auditing the actual render style

In local development only, add `?cartographyAudit=1` to the URL and inspect the browser console table after map load. It shows layer ID, type, tile source, effective visibility, zoom range, and original visibility/minzoom. No audit UI is displayed publicly. This captures style state after SMA overrides, not the exact set of rendered vector features.

## Open a focused preview

This experiment includes opt-in deep links to view actual labels at z15.25:
- `?cartographyPreview=marina` — Downtown / Marina Bay
- `?cartographyPreview=orchard` — Orchard
- `?cartographyPreview=west` — Western Singapore near NTU

The parameter is not a user-facing control. It changes only the opening camera when the parameter is present, leaving the default SMA opening unchanged. Confirm station POIs exist and render at each location; a correctly configured filter cannot make missing tile features appear.

## Visual checks before any merge

1. z11: Singapore overview — no new station labels, existing map and pins unchanged.
2. z14–15: Marina Bay / Downtown — nearest station labels help orientation without obscuring SMA architecture markers.
3. z15–17: Orchard or Civic District — label count and collision behavior remain useful when multiple stations are nearby.
4. z15–17: NTU / western Singapore — check missing transit labels and avoid treating OSM gaps as verified absences.
5. iPhone 390px, desktop 1280px; Day/Night; EN/JA. Verify map interaction, Selected state, Record panel, and font loading.

## Acceptance / rollback

Merge only if rail labels materially improve recognition of nearby areas or stations without competing with the architecture. Verify from the rendered map, not from this code-level audit alone. If collisions, duplicates, or weak source coverage dominate, remove the experimental `applyRailStationLabels()` call and revisit station data before redesigning the map system.

## References

- MapLibre GL JS Map API: https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/
- OpenMapTiles schema (`poi`, `class`, `name`): https://github.com/openmaptiles/openmaptiles/blob/master/layers/poi/poi.yaml
- OpenFreeMap: https://openfreemap.org/quick_start/
- SMA design principle: `docs/SGM_Visual_System_v0.2.md` (The City Stays in View).
