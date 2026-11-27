# SMA / MRT Layer v0.2 — Cartographic Design Specification

**Date:** 2026-11-27  
**Status:** Five-station prototype implemented on a separate experiment branch; do not merge before visual inspection  
**Baseline:** Draft PR #10 / Cartography Lab v0.1, where station names were confirmed visible by the user. No changes to main or production.

## 1. Core question

How can an architecture-first map use Singapore MRT line colours and station codes to orient visitors, without turning the map into a transit-route planner or overwhelming architecture markers?

**Visual hierarchy:** Architecture markers and selected building > MRT station labels > geographic background. Keep MapLibre + OpenFreeMap as basemap; add an independent, verified MRT station data layer.

## 2. Research and key corrections

- LTA's *RE:think – Designing for Wayfinding*, p. 47, explains its coloured station caplet: line colour + alphanumeric station code. Colour and text are complementary. Do not use colour alone.
- LTA's Wayfinding page states that consistent colours, numbers and symbols help users across language/vision differences, including third-party digital information.
- Several interchanges have **three** codes (e.g. Marina Bay NS27/CC33/TE20 and Outram Park EW16/NE3/TE17). A proposed limit of two codes would give wrong or incomplete information.
- LTA CCL6 opened on **2026-07-12**. TEL5/DTL3e (Bedok South TE30, Xilin DT36, Sungei Bedok TE31/DT37) are scheduled to open **2026-12-26**, so as of 2026-11-27 they must NOT be shown as in-service stations.
- OpenMapTiles `poi_transit` provides names but not a dependable complete station-code/interchange database. Build a small separate GeoJSON station source and trace each datum to LTA.

## 3. Selected visual grammar

**A restrained coloured code caplet next to a neutral station name.** This conveys line identity while leaving architectural markers dominant. Use SMA map typography, not LTA's custom sign font. These are content examples, not verified RGB specifications:

- `[ DT17 · blue ] Downtown`
- `[ NS22 · red ][ TE14 · brown ] Orchard`
- `[ NS27 · red ][ CC33 · orange ][ TE20 · brown ] Marina Bay`

Visual rules:
- Compact rounded-rectangular codes; **only the code field** receives the MRT line colour. Station name remains neutral and visually subordinate to architecture.
- Match existing cartographic halos, noninteractive symbol semantics and Day/Night aesthetics. Preserve each line's hue in Night; use contrast/foreground treatment to ensure legibility.
- Interchanges keep **all** relevant codes, including triple transfers. At intermediate zoom, a multi-colour stripe + name may substitute for full codes, but may not silently imply fewer lines.
- Respect collisions: hide the full station symbol if no room; do not draw over architecture markers, labels or bottom sheet. Avoid separately duplicated labels from `poi_transit`.
- Do not add train routes, railway lines, bus stops, nearest-station estimates or click interactions in v0.2.

### Zoom hypotheses (to be tested, not established usability facts)

| Zoom | Content | Purpose |
| --- | --- | --- |
| z9–13.7 | No MRT symbols | Singapore / architecture distribution |
| z13.7–15 | Major interchange names + tiny multi-colour indicator | District orientation |
| z15–18 | All verified, operational MRT stations with code caplet(s) + name | Local exploration |

Run both light/dark themes, EN/JA and 390px/1280px; test at z13.8, z14.5, z15.5 and z17.

## 4. Line identity / tokens

| Internal line | Station code prefixes | Colour identity | LTA 2019 print reference |
| --- | --- | --- | --- |
| NS | NS | Red | PMS 485 C |
| EW | EW, CG | Green | PMS 355 C |
| NE | NE | Purple | PMS 2592 C |
| CC | CC, CE | Orange | PMS 1375 C |
| DT | DT | Blue | PMS 2935 C |
| TE | TE | Brown | PMS 731 C |

The actual **sRGB hex values are not yet verified**: Pantone print colours cannot be treated as official screen values. Introduce dedicated `mrtLineColors` separate from SMA category colours; verify swatches in Day/Night and contrast of code text.

LRT remains outside the v0.2 visual experiment, but the data model must support later BP, SK and PG (and their line/codes) separately.

## 5. Proposed data contract

One station record per geographical station / interchange, **not one marker per line**.

```ts
type MRTStation = {
  id: string; nameEn: string;
  coordinates: [number, number]; // longitude, latitude
  coordinateSource: string;
  codes: Array<{ code: string; lineId: 'NS'|'EW'|'NE'|'CC'|'DT'|'TE' }>;
  status: 'operational'|'planned'|'closed';
  opensOn?: string; // ISO date; corroborated with official source
  codeSource: string;
  verifiedOn: string;
};
```

Potential authoritative inputs listed in LTA DataMall (checked 2026-11-27):
- **Train Station** — point geometry, last updated Sep 2026.
- **Train Station Codes and Chinese Names** — code table, last updated Jan 2025. It predates 2026 changes; supplement against the newest LTA official map/announcements.
- **Train Lines Codes** — list, last updated Feb 2024.

Before importing, **inspect real files** for licence, record count, CRS, coordinate convention, station duplication, current operational status and attribution. Dataset listing alone does not prove data completeness. The Singapore Open Data Licence generally allows adaptation/reuse with attribution, but check dataset-specific conditions. LTA's station exits are *not* station centroids; don't substitute them uncritically.

## 6. Implementation sequence

1. **Data verification**: download official station geometry and codes, reconcile new/changed stations (CCL6, TEL5/DTL3e); create canonical station keys and provenance; distinguish planned vs operational.
2. **Small pilot**: verify coordinates for Downtown (DT17), Bugis (EW12/DT14), Orchard (NS22/TE14), Marina Bay (NS27/CC33/TE20), Outram Park (EW16/NE3/TE17). Generate one GeoJSON station feature per interchange.
3. **MapLibre implementation**: implement an independent GeoJSON source and one collision-aware symbol layer, rendering the code caplet(s) as a high-density icon and the name as neutral text; preserve colour on both Day/Night. Ensure pilot station names are not also shown by the Liberty `poi_transit` label.
4. **Test in an independent preview**: compare exact camera/zoom and state against v0.1 at Downtown/Marina Bay, Orchard, Bugis and a western location, day/night EN/JA on 390px/1280px.
5. **Decision gate**: adopt only if station identities are correct, no architecture labels are obscured, and line colours help orientation. Otherwise revise or roll back. No merge or production push without rendered-map confirmation.

The near-station panel and full coloured railway line geometry are separate later decisions; distance by straight line does not justify "nearest station" walking claims.

## Sources

- LTA: https://www.lta.gov.sg/content/ltagov/en/getting_around/public_transport/rail_network.html
- LTA Wayfinding: https://www.lta.gov.sg/content/ltagov/en/getting_around/public_transport/a_better_public_transport_experience/wayfinding.html
- LTA *RE:think* pp. 46–47: https://www.lta.gov.sg/content/dam/ltagov/who_we_are/statistics_and_publications/books/pdf/REthink_190918web.pdf
- LTA DataMall datasets: https://datamall.lta.gov.sg/content/datamall/en/static-data.html
- LTA CCL6: https://www.lta.gov.sg/content/ltagov/en/upcoming_projects/rail_expansion/circle_line_6.html
- LTA TEL5 / DTL3e opening date (as announced): https://www.lta.gov.sg/content/ltagov/en/newsroom/2026/11/news-releases/tel5-dtl3e-passenger-service-26-dec-2026.html
- LTA open data licence: https://datamall.lta.gov.sg/content/datamall/en/SingaporeOpenDataLicence.html
- OpenMapTiles schema: https://openmaptiles.org/docs/schema/
- MapLibre style: https://maplibre.org/maplibre-style-spec/


## 8. Pilot implementation notes (2026-11-27)

A separate branch `experiment/mrt-caplets-v02` builds on the v0.1 draft. Opt-in preview: `?cartographyPreview=marina&mrtPilot=1` (also `orchard` or `west`). The default view on this branch still uses v0.1 station text. **The public main site is unchanged.**

- 5 pilot GeoJSON stations: Downtown DT17, Bugis EW12/DT14, Orchard NS22/TE14, Marina Bay NS27/CC33/TE20, Outram Park EW16/NE3/TE17.
- **Important code update:** operator SMRT and LTA Art in Transit currently say **CC33** for Marina Bay, while some LTA PDFs still show the older **CE2**. For pilots we use CC33. Upstream LTA mixed references warrant explicit future verification.
- Code colours are custom provisional display approximations with WCAG contrast-aware white/black caplet text; they are **not** claimed as official LTA digital HEX values.
- Coordinates are approximate **station address points** obtained from an older OneMap-derived address dataset mirror: https://github.com/xkjyeah/singapore-postal-codes/blob/master/mrt_stations.json. These are for visual tests, **not** platform/exit centroids, pedestrian directions or precision location services. The newest September 2026 LTA station shapefile is **not yet integrated**.
- The normal OpenFreeMap `poi_transit` station labels are retained for non-pilot stations; the 5 pilot names are suppressed in the generic layer while the new caplets render to avoid duplication.
- At z13.75–15, only interchange stations show thin multi-colour stripes and a name; at z15+, all 5 show full codes + name. Neither stage is a navigation UI. Architecture layers render after MRT layers.
- Pilot toggling is via URL only; there is no extra public setting or button. Day and Night label images are preloaded separately.
- The December 2026 TEL5/DTL3e openings remain absent from this five-station pilot.

### Review gate

Confirm: (a) actual icons render in browser; (b) Marina Bay and Outram display all 3 codes; (c) no duplicate text at five stations; (d) building pins remain primary; (e) small 390px screen and Day/Night; (f) no performance or accessibility regressions. Do not auto-merge on green unit tests alone.

### Current-code reference

- `src/mrtPilot.ts` holds the self-contained station data, SVG label generator, filtered fallback rail labels and MapLibre layers.
- `src/App.tsx` installs the pilot only if `mrtPilot=1`.
- `scripts/mrtPilot.test.ts` validates station uniqueness, current codes, contrast, SVG content and opt-in behavior.

### Direct station review URLs

Add `&mrtPilot=1` to each camera URL to see caplets; omit it for the v0.1 station-name baseline:

- `?cartographyPreview=downtown&mrtPilot=1`
- `?cartographyPreview=bugis&mrtPilot=1`
- `?cartographyPreview=marina-station&mrtPilot=1`
- `?cartographyPreview=orchard-station&mrtPilot=1`
- `?cartographyPreview=outram&mrtPilot=1`

All stations open at z16 for comparable inspection.
