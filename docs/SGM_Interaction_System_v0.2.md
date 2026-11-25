# SGM Interaction System v0.2

Base: dcc7efdfdd4e6c8da107cba9ee8b4be545e737f5

## Implemented families

### Grouped Action — transient black ring
- Discover
- Want to Visit
- My Record

The capsule stays unchanged. Only the activated glyph receives a transient ring.

### Standalone Icon — transient surface
- Close X controls
- Search clear
- Settings Appearance

These controls already occupy independent icon hit areas, so press/hover reveals a light circular surface instead of drawing a black ring.

### Surface Control — surface change
- Settings
- Location
- Compass
- Weather

No inner ring is added because the control already owns a visible circle/capsule.

### Persistent Toggle — transient ring + persistent glyph fill
Detail now uses:
- Want to Visit
- Visited

The two rectangular button outlines are removed. Each half keeps a large hit area inside the section. Pressing rings the glyph; successful activation briefly confirms with an expanding/fading ring; the persistent state is the icon fill and aria-pressed state.

The Detail label "Save/Saved" is replaced by the stable concept name "Want to Visit" to match the top-level destination. The same Sneaker metaphor is reused for that concept. "Visited" remains a check-circle state because it records an event/status, while My Record is the destination that contains those records.

## Accessibility

- Toggle labels remain stable while `aria-pressed` changes, following WAI-ARIA APG guidance.
- Focus-visible remains separate from pressed feedback.
- All existing hit targets remain at least their prior size.
- Reduced Motion retains visible feedback while shortening confirmation motion.

## References
- Apple HIG — Buttons
- Apple HIG — Toggles
- Nielsen Norman Group — Button States: Communicate Interaction (2025)
- WAI-ARIA APG — Button Pattern
