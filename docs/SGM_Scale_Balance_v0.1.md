# SGM / Scale Balance v0.1 — More discoverable, less tool-like

**Date:** 2026-11-27  
**Status:** visual experiment, draft PR; not production-approved.

## Intent

Keep the established SGM shapes, typography, palette, interaction states, information architecture, and map semantics. Adjust **size and hierarchy only**, so a visitor sees *a small set of things to explore* rather than *a dense toolbox with many functions*.

Reference comparisons supplied by the designer: the current SGM map, Waze's bold controls and moods, a character-collection interface, and a map/list interface with generous type and spacing. The point is not to imitate their illustration styles or feature sets, but to align visual scale with the simplicity of the proposed experience.

## Size changes

| Component | Previous | v0.1 test |
| --- | --- | --- |
| Top brand and weather control | 56px | 64px (56px on narrow devices) |
| Bottom three-action group | 168 × 56px | 192 × 64px (168 × 56px at ≤359px) |
| Bottom standalone circular controls | 56px | 64px (56px at ≤359px) |
| Main navigation glyphs | 26px | 28px |
| Overview architecture-dot radius | 4.5px | interpolate: z9 5.4px; z12 6.2px; z13.5 7px |
| Normal building pin | 28 × 33px | 34 × 40px |
| Selected building pin | 58 × 68px | 66 × 77px |
| Normal / selected category pictogram | 13px / 26px | 15px / 30px |
| Live location character | 16–34px over z9–18 | 20–44px over z9–18 |
| MRT station caplet icons | 1× | 1.1× on all 3 zoom stages |

Shapes, colors, symbol semantics, map zoom gates, category content, station prioritization, and label/collision rules remain unchanged. The existing invisible architecture hit-target circle remains at 26px radius. Geolocation is still opt-in.

The map controls need a 320px-wide fallback: 192 + 64 + 64 + margins would collide. At widths ≤359px the earlier 56px control geometry is preserved; **larger is not automatically better if it causes overlap**.

## Why sizes are different

- **Navigation = large, stable framing**. The few persistent actions read as approachable single-purpose tools.
- **Building symbols = things to go explore**. A modest size increase gives content presence while preserving map visibility.
- **Location character = protagonist**. At the typical location-reveal zoom (z14+) it should be distinctly recognizable as a character, not a tiny GPS speck.
- **MRT = secondary contextual landmark**. 1.1× gives readability without competing visually with the selected architecture pin.
- **Selection = exception**. The selected building pin remains substantially larger to preserve focus.

## Manual approval checklist

- Device widths: 320, 360, 390, 430px; desktop 1280px; both Day and Night; EN and JA.
- Island overview: no incomprehensible clump of architecture dots over the CBD; category colors still distinguishable.
- Neighborhood around SUTD/Expo: MRT labels remain legible; no major increase in missing names due to symbol collision.
- At z13.4–15.5 and z16+, station caplets and architecture pins do not become indistinguishable.
- Current location at zoom 9, 13, 14 and 16: centered GPS position; eyes and silhouette legible; no flash or scale jump after morphs.
- Selected pin in search, preview and detail: accurate click detection, no clipping behind top controls or sheets, camera preserves selection.
- Compass reveal and collapse: no overlap with footer, credits or large locate control.
- Reduced motion, forced colors and keyboard focus remain intact.

**Pass criteria:** users can explain the primary experience in one sentence, tap the three main actions easily, distinguish themselves from architecture and transit markers, and still explore the dense centre without losing information. Numbers are hypotheses until visually tested on iPhone.

**Scope guard:** no navigation redesign, no new features, no map style/color changes, no cluster algorithm, no adjustment to geographic basemap labels.
