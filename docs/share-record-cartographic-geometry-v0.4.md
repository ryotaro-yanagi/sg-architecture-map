# SGM / Share a Record — Cartographic Geometry v0.4

## Adopted source

- Dataset: **National Map Polygon**
- Agency: Singapore Land Authority (SLA)
- Source: <https://data.gov.sg/datasets/d_29f066d67df3eae91df8a42f443863c8/view>
- Dataset period: June 2025
- Source last updated: 22 October 2026
- Accessed: 24 November 2026
- Licence: Singapore Open Data Licence version 1.0 — <https://data.gov.sg/open-data-licence>
- Downloaded source SHA-256: `80791c1e271c378f26ab8c618eb019848c89d0c77306adbaf559f744c5c9048b`

Natural Earth 1:10m Land and Minor Islands were reviewed as alternatives. SLA was adopted because its named coastal features provide materially more detailed and locally authoritative geometry for the four forms required by this graphic.

## Extraction and processing

The downloaded GeoJSON contains coastal outlines, hydrographic features, parks, runways, and other polygon layers. The processor selects only `FOLDERPATH = Layers/Coastal_Outlines` and exact name/OBJECTID pairs:

| Form | OBJECTID | Source geometry |
| --- | ---: | --- |
| Singapore main island | 7394 | Polygon, including two interior rings |
| Sentosa | 7386 | Polygon |
| Pulau Ubin | 7372 | MultiPolygon with five parts |
| Jurong Island | 7374 | Polygon |

`scripts/process-share-record-coastline.mjs` removes Z values and starts Douglas–Peucker simplification at 0.00018 degrees (about 0.5 output pixel). Each ring is checked for self-intersection; its tolerance is halved until topology is preserved, with source-precision fallback for rings that cannot be simplified safely. Coordinates are rounded to six decimals, or seven for fallback rings. Polygon parts, ring order, holes, and closure are preserved. The derived static asset is `src/data/share-record-coastline-sla.json`; the browser performs no coastline request.

The renderer projects the coastline and building coordinates through the same fixed geographic transform. Typography, category rings, marker order and overlap, colors, and the 1080 × 1350 layout are unchanged from v0.3.

## Attribution and publication status

The Singapore Open Data Licence requires a conspicuous source notice in products, applications, or websites using the dataset, including a link to the current licence. Recommended notice:

> Contains information from National Map Polygon accessed on 24 November 2026 from Singapore Land Authority via data.gov.sg, made available under the Singapore Open Data Licence version 1.0: https://data.gov.sg/open-data-licence

The SVG contains non-visible provenance metadata and this repository contains the full notice. The PNG cannot carry a conspicuous clickable notice through the current screenshot export. Because v0.4 preserves the existing visible text and layout, **the standalone PNG prototype should not yet be treated as cleared for public sharing**. Before release, either add a visible notice to the image, ensure the sharing surface always presents the notice and licence link with the image, or obtain confirmation from SLA/data.gov.sg that the proposed attribution treatment is sufficient. Detached redistribution of the PNG remains the key unresolved case.

## Accuracy limits

- The source is National Map Polygon data for June 2025, not a live cadastral coastline.
- Only four named coastal features are included; other offshore islands are intentionally omitted from this graphic.
- Simplification removes sub-pixel detail while retaining characteristic form and relative position.
- Building coordinates have their own source precision and may not align perfectly with the generalized shoreline.
