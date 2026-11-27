# SGM / Scale Balance v0.1 — modest production experiment

**Date:** 2026-11-27  
**Status:** modest size-only change for GitHub Pages; evaluate on mobile before further refinement.

## Why

The earlier draft comparison was an intentionally strong scale test (64px controls; 34×40px pins; 20–44px location character). This smaller revision is intended as a **subtle one-step enlargement** for day-to-day use, without waiting for a Vercel preview. Keep the established visual language: shapes, categories, colors, positioning, labels, interactions and features.

## Changes from main

| Component | Main | Modest experiment |
| --- | --- | --- |
| Floating main controls | 56px | 60px |
| Bottom three-action group | 168×56px | 180×60px |
| Navigation pictograms | 26px | 27px |
| Building overview dot radius | 4.5px | z9 5px, z12 5.2px, z13.5 5.6px |
| Normal architecture pin | 28×33px | 31×36px |
| Selected architecture pin | 58×68px | 62×72px |
| Normal/selected pin pictograms | 13/26px | 14/28px |
| Current-location character | 16–34px | 18–38px across z9–18 |
| MRT station caplet labels | 1× | 1.05× |

Narrow-device rule: at ≤359px viewport width, keep previous 56px top/bottom controls so three independent actions do not collide. No change to hit targets, geographic coordinates, location permission semantics, basemap layer styles, text styles, MRT collision policy, or map zoom gates.

## Mobile verification before final approval

1. Compare the live GitHub Pages site at 390px in EN and JA, Day and Night.
2. Check the island overview: slightly larger dots should still separate by area, especially CBD.
3. Zoom to SUTD/Expo: architecture pin must remain clearly more important than MRT label.
4. Tap Locate and inspect the 30px character at z14, then zoom to z16; verify anchor remains on actual position.
5. Tap an architecture pin to open Preview / Detail; ensure no clipping or missed taps.
6. Test narrow 320px and desktop 1280px; credits and compass must not overlap the larger controls.
7. Verify reduced motion and keyboard navigation remain functional.

No visual acceptance is claimed until the site is inspected on real iPhone. GitHub Actions build/validation status is tracked separately.

## Revert

Revert the single eventual squash/merge commit from PR #18 on `main` to return these size changes to the previous state.
