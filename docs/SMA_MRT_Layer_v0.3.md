# SMA / MRT Layer v0.3 — Six-Line Network Prototype

**Date:** 2026-11-27  
**Status:** Opt-in full-network implementation, pending browser review. Not merged or deployed to production.  
**Branch:** `experiment/mrt-network-v03`  
**Baselines:** v0.1 station names and v0.2 five-station colour-caplet pilot.

## Objective

Extend the v0.2 coloured MRT station labels to all *currently operational* MRT stations in Singapore without changing the site's original map, typography, architecture pins or palette. The label must communicate line identity; it must not make SMA a route planner.

## Data audited, 2026-11-27

- **146 physical MRT stations / 174 line-specific station codes**; derived from LTA data processed in the [MRT Kiasu station dataset](https://github.com/abhijitt/mrt-kiasu/blob/main/src/data/stations.json), source snapshot imported **2026-09-24**.
- Independent consistency comparison with `ayaka14732/singapore-hdb-map/data/mrt_network.json`: 146 matching physical station names. That reference uses obsolete `CE1/CE2` codes, while MRT Kiasu contains the post-CCL6 `CC34/CC33` codes. The two coded representations differ by exactly those two renumberings.
- One station feature per location; 121 single-line stations, 22 two-line interchanges, 3 three-line interchanges (**Dhoby Ghaut, Marina Bay, Outram Park**).
- Six MRT lines `NS, EW (including CG airport branch), NE, CC, DT, TE`. The `CG` prefix is coloured as EW. LRTs are not yet included. Mixed MRT+LRT interchange stations appear as MRT only; their LRT membership is outside this dataset.
- Includes the three Circle Line Stage 6 stations opened **2026-07-12**: `CC30 Keppel`, `CC31 Cantonment`, `CC32 Prince Edward Road`. Current codes at Marina Bay / Bayfront are `CC33/CC34`.
- Excludes planned **TE30 Bedok South, DT36 Xilin, TE31/DT37 Sungei Bedok** until their scheduled **2026-12-26** opening is verified. Static stations need periodic review as the MRT network expands.

### Geographic confidence

- **141** physical station positions: arithmetic mean of LTA station exit positions from the primary dataset. These are approximate label anchors, not platform centres or recommended entrances.
- **3** stations (CC30–32): LTA GTFS station-coordinate proxies supplied by the primary dataset.
- **2** stations (**Hume, Punggol Coast**): reference-map coordinates supplied as provisional data because the primary dataset contains no exit coordinates or station-centre fallback.
- Comparisons against an independent station-position reference yielded deviations under **80 metres** for all 146 anchors. This is a cross-check of scale and plausible coordinates, **not** surveying or accuracy certification.

## Data rights and attribution

The MRT Kiasu repository's *software* is MIT-licensed, but its `stations.json` and `exits.json` are identified as **Singapore Open Data Licence** data from LTA/DataMall and data.gov.sg. These data are not reclassified as MIT in SMA. The new file `src/data/mrtStations2026.json` retains origin and provenance metadata. In the `mrtNetwork=1` map variant the attribution control adds LTA attribution alongside OpenStreetMap/OpenFreeMap.

- Primary derivation: https://github.com/abhijitt/mrt-kiasu
- Primary open-data licence: https://data.gov.sg/open-data-licence
- LTA DataMall: https://datamall.lta.gov.sg/content/datamall/en/static-data.html
- Independent cross-check: https://github.com/ayaka14732/singapore-hdb-map/blob/main/data/mrt_network.json
- Official CCL6 opening: https://www.lta.gov.sg/content/ltagov/en/newsroom/2026/5/news-releases/circle-line-stage-6-to-open-for-public-preview-on-4-july-2026.html
- Scheduled TEL5/DTL3e opening: https://www.lta.gov.sg/content/ltagov/en/newsroom/2026/11/news-releases/tel5-dtl3e-passenger-service-26-dec-2026.html

## Implementation

- **Opt-in** via `?mrtNetwork=1`. With no flag, v0.1 is unchanged. `?mrtPilot=1` remains the five-station v0.2 reference; v0.3 takes precedence if both flags appear.
- `src/data/mrtStations2026.json`: 146 static station features including code arrays and the coordinate source category. There is no runtime network request for the stations.
- `src/mrtNetwork.ts`: MapLibre source and two zoom-dependent symbol layers, with the same SVG caplet design as v0.2 (`makeMrtCapletSvg`). Below z13.75 the custom MRT layer is hidden; z13.75–15 shows major interchange colour strips/name; z15+ shows full code caplets/name.
- **Lazy images:** a MapLibre GL JS v6 `setMissingStyleImageResolver` asynchronously decodes and adds only the icon variants needed by the current map view; avoids generating 146 × 2 appearances × 2 zoom modes upfront.
- `poi_transit`: exclude the canonical MRT names from generic railway symbols to avoid duplicate labels. Non-MRT rail POI names may remain.
- Custom MRT layers are created *before* architecture layers. Existing pin priority and colour themes are unchanged; visible-collision behaviour requires real-device review.
- Day/Night reuse the same line colours and existing v0.2 label typography. This is a controlled expansion, not a new visual redesign.
- `scripts/mrtNetwork.test.mjs`: identity/coverage/code/coordinate/date invariants. Build and publication checks in CI.

## Preview / review matrix

Open the experiment preview with one of:
- `/en/?cartographyPreview=marina-station&mrtNetwork=1` — downtown density and three lines
- `/en/?cartographyPreview=bugis&mrtNetwork=1` — dense interchange
- `/en/?cartographyPreview=orchard-station&mrtNetwork=1` — typography on mixed urban basemap
- `/en/?cartographyPreview=outram&mrtNetwork=1` — triple interchange
- `/en/?cartographyPreview=jurong&mrtNetwork=1` — western junction
- `/en/?cartographyPreview=punggol&mrtNetwork=1` — north-east network
- `/en/?cartographyPreview=tampines&mrtNetwork=1` — eastern network
- `/en/?cartographyPreview=woodlands&mrtNetwork=1` — northern network

Remove `mrtNetwork=1` for v0.1 comparison at the identical map camera.

**Validate at z13.8, z14.5, z15.5, z17; 390px and 1280px; Day/Night, EN/JA.** Confirm all three-line codes, no repeated labels, architecture symbols remain primary, smooth first load, legibility under labels and consistency after theme toggling. Test overlap near Bugis/Dhoby Ghaut/Marina Bay, absent label gaps in western/northern areas, and the full-network label count.

## Decision gate and remaining uncertainty

- The 146-position and 174-code dataset passed code-level cross-reference and status checks; production data correctness and real-device label visibility **remain unconfirmed**.
- All source variants should receive a formal rights/attribution review before main-branch release. The reference coordinates for Hume and Punggol Coast must be replaced by primary LTA station coordinates when verified.
- Monitor label-loading latency from lazy SVGs and possible conflicts with architectural text.
- **Do not merge automatically**. A successful build proves code compatibility, not cartographic usability.

### MapLibre v6 compatibility correction

The initial lazy renderer incorrectly relied on the pre-v6 `styleimagemissing` event. MapLibre GL JS v6 uses `Map#setMissingStyleImageResolver` for missing icons; the event can only report unresolved icons. The v0.3 experiment now uses the asynchronous resolver and includes a targeted regression test. Reference: https://maplibre.org/maplibre-gl-js/docs/guides/v5-to-v6-migration-guide/ .
