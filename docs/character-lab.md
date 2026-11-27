# Character Lab — development map preview

This is an isolated visual experiment for the proposed SGM current-location character. It is **not the live user-location marker**.

## Open on iPhone via Vercel GitHub Preview

The GitHub-connected Vercel projects publish a Preview Deployment for this PR branch. Open [PR #16](https://github.com/ryotaro-yanagi/sg-architecture-map/pull/16), follow the deployment's **Visit** link, and append `/en/?lab=character` (or `/ja/?lab=character`) after the preview hostname.

The dedicated `feature/character-lab-preview-v1` Vercel branch preview **automatically shows the Character Lab**, even without a query string. On other Vercel preview branches, `?lab=character` enables it using `VERCEL_ENV === 'preview'`. The regular production build remains unchanged. The preview map is interactive on mobile, without geolocation permission.

If the Vercel project has Deployment Protection enabled, log in to Vercel before visiting the preview.

## Launch locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173/en/?lab=character` (or `/ja/?lab=character`).

The lab is enabled in Vite development. It is not mounted in normal production browsing. Vercel GitHub Preview builds are auto-enabled; only private custom production builds need `VITE_ENABLE_CHARACTER_LAB=true`. Do not enable that flag for the ordinary public deployment.

## Compare

- Shapes: **Long, Rise, Steps, Sway**, using the silhouette and eye placements from v10.
- View mode: **Single** (one selected shape) or **All four** (same settings in a 2×2 array on the actual map). Tap the panel's minus button to reveal more of the map, and the plus button to reopen controls.
- Size: the live SGM zoom-based scale (16–34 CSS px), or fixed 16 / 26 / 34 px. Initial test baseline is fixed 34px, matching the approved screenshot.
- Edge: none, ambient shadow, or 0.68 CSS px dark micro-keyline.
- Color: Soft Coral / Warm Ochre / Sage.
- Face: Neutral / Look / Rest. Neutral and Look retain white eyes with dark pupils.
- **16px optical correction**: v14 adjustments for Long and Steps silhouettes and adjusted eyes for all four shapes.
- Day / Night changes the **real map palette**, not a simulated screenshot.
- Click on the map to place the **sample** marker. Or use **Place at map center**; **Zoom to 14** can help compare large-scale pins.

The initial settings match the shared iPhone screenshot: **Steps / Warm Ochre / Shadow / Look / 34px / optical correction on**. 

No geolocation permission is requested by the lab. Its sample marker starts at the current map camera center. Real device geolocation is unaffected. The panel’s theme changes do not persist to localStorage.

## Test matrix

1. Select **All four**, collapse the panel, and compare four silhouettes on the same region of the real map. Then inspect each shape at 16 / 26 / 34 px against roads, buildings, parks and water.
2. Repeat Day / Night and three body colors.
3. Compare shadow vs keyline near architecture category markers.
4. Verify white-eye / dark-pupil separation at 16 px at device pixel ratios 1 and 2.
5. Confirm that ordinary `/en/` and `/ja/`, without the query, show no lab marker or controls.
6. Confirm `prefers-reduced-motion` is unchanged: the lab does not run automatic morphs or blink animations.

## Known limits

- The lab places a single sample marker or a 2×2 comparison group. These are visual references only; they do not test automatic morph timing or replace the actual current-location marker.
- The user may still select a building when tapping near a building pin; that is the existing map behavior.
- This preview is only a visual candidate tool. It is not evidence of full accessibility compliance; contrast checks must use the real background under each marker.
- The current UI marker remains the existing red circle with a white border until a separate implementation is explicitly approved.
