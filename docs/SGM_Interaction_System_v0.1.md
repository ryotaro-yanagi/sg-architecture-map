# SGM Interaction System v0.1

Status: design-system proposal. No UI code changes in this commit.

## Principle

The circular outline is a shared feedback language, not a decoration applied to every button.

Separate:
- style: what kind of control it is;
- state: enabled / hover / focus / pressed / toggled;
- semantics: navigation / command / persistent toggle.

Pressed is transient. Persistent Saved/Visited state must remain legible after the ring disappears.

## Four control families

### 1. Ring Control
Use when the glyph itself is the visual target and there is no permanent circular surface.

Examples:
- Home capsule: Discover / Visit / Record
- Close X: Search, Settings, Want to Visit, My Record, Share Record, Preview
- Search clear X
- Settings Appearance glyph

Behavior:
- default: glyph only
- hover (pointer): faint ring
- pressed: full ring
- focus-visible: accessibility focus outline remains distinct from the pressed ring
- ring disappears after activation

### 2. Surface Control
Use when the control already owns a circle/capsule surface.

Examples:
- Settings floating button
- Location / compass
- Weather capsule

Do not add an inner ring. Feedback uses the existing surface (opacity/background/scale as appropriate).

### 3. Row / Text Action
Use when the clickable area is communicated by text/row structure.

Examples:
- Back
- Return to map
- Google Maps
- building list rows
- Sources links
- record Edit / Cancel / Clear
- share/export actions while they remain conventional text buttons

Do not ring the icon alone because it would falsely imply the icon is the whole target.

### 4. Toggle Action
Persistent two-state actions embedded in content.

Detail:
- Want to Visit
- Visited

Recommended visual structure:
- remove the rectangular outline boxes;
- retain a generous two-column hit area inside the section;
- icon + stable label;
- press: ring around the icon;
- successful add: brief confirmation ring that expands/fades;
- persistent on state: filled/changed icon, not a persistent ring or gray background.

Recommended labels:
- `Want to Visit` (stable in both states)
- `Visited` (stable in both states)

This aligns Detail with the top-level destinations and avoids the current conceptual split between `Save/Saved` and `Want to Visit`.

ARIA:
- keep `aria-pressed=true|false`;
- keep the accessible name stable for each toggle.

## Why remove the boxes in Detail?

A ring inside an outlined rectangular button creates two competing containers: the rectangular button boundary and the circular feedback boundary. In SGM, the Detail section already has horizontal section rules and a two-column layout, so a second permanent box is not necessary to communicate grouping.

The intended hierarchy becomes:

```
------------------------------------------------
   bookmark   Want to Visit   |   check   Visited
------------------------------------------------
```

The clickable region remains large; only the permanent rectangular outline disappears.

## Ring scales

Keep one visual family with context-sensitive scale rather than arbitrary per-screen values.

- standard icon-only control: ~42px ring inside a 56px hit target
- embedded glyph + text toggle: ~30-34px ring around a 20px glyph
- compact clear/close glyph: ~32-40px depending on the available control size

Stroke should remain visually consistent (about 1.5px at current scale).

## Motion

Pressed feedback:
- visible within ~100ms
- small scale-in + opacity-in
- no persistent selected ring

Confirmation for adding a persistent state:
- ring appears, expands slightly, fades
- target duration roughly 300-360ms
- removal uses normal pressed feedback + persistent icon state change; no celebratory confirmation required

Reduced Motion:
- retain visible state feedback
- collapse motion to a short fade

## Application inventory

Apply Ring Control:
- Home: Discover / Visit / Record [already]
- Search: close X
- Search: clear X
- Settings: close X
- Settings: Appearance [partly implemented]
- Want to Visit surface: close X
- My Record surface: close X
- Share Record: close X
- building Preview: close X
- Detail toggles: Want to Visit / Visited [needs structural redesign]

Do not apply Ring Control:
- Settings floating circle
- Location / Compass circles
- Weather capsule
- logo/reset
- Back / Return to map
- Google Maps
- list rows and source links
- full text action buttons

## Implementation environment

Before extending the system, replace component-specific ring CSS with reusable primitives:

- `.ui-ring-control` — icon-only button feedback
- `.ui-ring-glyph` — ring around a glyph inside a larger text/toggle control
- `.ui-surface-control` — existing circular/capsule surface controls
- shared ring size/stroke/motion tokens

Avoid separate bespoke pseudo-elements for Experience Action, Appearance and Collection Toggle. One primitive should define motion and forced-colors / reduced-motion behavior.

## Research references

- Apple Human Interface Guidelines — Buttons: clear press state for custom buttons, sufficient hit region, consistent button sizing.
- Apple Human Interface Guidelines — Toggles: persistent two-state controls require clearly distinguishable current state.
- Nielsen Norman Group — Button States: pressed feedback is brief and distinct from selected state.
- WAI-ARIA APG — Button Pattern: `aria-pressed` represents persistent toggle state; semantics are independent of visual styling.
