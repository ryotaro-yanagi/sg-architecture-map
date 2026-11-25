# SGM Motion System v0.1

Status: experimental motion language

## Core idea

SGM uses motion for two different jobs:

1. **Utility motion** — explain structure, navigation and direct manipulation.
2. **Micro-delight** — briefly reward a meaningful state change.

The second category is intentionally rare. The goal is not to make every tap playful; it is to make a few meaningful moments feel alive.

## A. Direct feedback

Purpose: confirm that the interface received the touch.

Examples:
- Home Discover / Want to Visit / My Record ring on press
- standalone X / Appearance surface response
- button press states

Timing:
- about 80–120ms
- immediate
- no bounce after the action

## B. Confirmation pop

Purpose: acknowledge that something meaningful has successfully become true.

Current uses:
- Add Want to Visit
- Mark Visited
- Successfully locate the user on the map

Visual character:
- local to the touched/affected object
- circular/radial
- one-shot
- slight overshoot
- disappears completely
- action remains immediately usable; motion never blocks interaction

Timing:
- ~340ms
- easing: cubic-bezier(.22, 1, .36, 1)

This is the characteristic "pop" / "ポポン" motion of SGM.

### Addition vs removal

Addition can receive the expressive confirmation pop because the user has accumulated something: a place to visit, a visited record, or their position on the map.

Removal should be quieter:
- normal pressed feedback
- persistent state changes immediately
- no celebratory expanding ring

This asymmetry gives the motion meaning instead of turning it into decoration.

## C. Spatial motion

Purpose: explain where a surface comes from and preserve context.

Examples:
- map Preview / Detail depth
- opening or dismissing panels
- Search surface

Character:
- calm, direct, physically coherent
- generally ~180–300ms depending on travel distance
- no playful bounce unless it communicates actual state

## D. Ambient / identity motion

Reserved for:
- dynamic island identity / loading
- climate-related expression if developed later

This motion must never compete with map reading or interaction feedback.

## Deliberately static / restrained

- Back / Return to map
- list row selection
- Sources and external links
- routine close operations beyond their immediate press feedback
- scrolling

Frequent actions should remain quick and quiet.

## Accessibility

- Respect `prefers-reduced-motion`.
- Never communicate saved/visited/location success only through animation; persistent icon state, marker presence and text/status remain.
- Reduced Motion removes scale/expansion while retaining the final state.
- Motion must not delay the next interaction.

## Research basis

- Apple HIG Motion: motion should be purposeful; brief and precise feedback feels lightweight; avoid unnecessary motion in frequent interactions.
- Apple HIG SF Symbols: Bounce can confirm that an action occurred; symbol animation should reinforce meaning and fit the product's tone.
- Nielsen Norman Group, The Role of Animation and Motion in UX: motion works best as subtle feedback for microinteractions and state change, not as decoration.
- Nielsen Norman Group, Executing UX Animations: simple feedback is typically around 100ms; larger transitions can be 200–300ms.

## Next candidates — not yet implemented

Only test after the current system settles:
- first-ever visited building: slightly richer confirmation on the My Record count
- successful save of date/note: local confirmation in the edited record
- dynamic logo motion: separate identity system

Do not automatically extend the pop to Share, Close, Back, or every tap.
