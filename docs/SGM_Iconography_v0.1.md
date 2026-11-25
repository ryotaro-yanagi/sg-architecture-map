# SGM Iconography v0.1

Base: 4490aad4fa3041a377be210550b7da8234980bd2

## Current three-action set
- Discover: MagnifyingGlass
- Visit: Sneaker
- Record: Notebook

## Current decision
Keep the three glyphs for the next prototype rather than changing several variables at once.

### Discover
MagnifyingGlass is a highly conventional search/browse metaphor and is the strongest of the three.

### Visit
Sneaker is intentionally more physical than a bookmark or generic Saved icon. Its object recognizability is strong, but its interpretation is not unique: users could read it as walking, route, activity, or a place to visit. Candidate comparison for later testing: Sneaker / Footprints / PersonSimpleWalk. Phosphor provides all three.

### Record
Notebook directly supports SGM's intended personal architecture-notebook metaphor. Candidate comparison only if interpretation testing shows a problem: Notebook / Note / BookOpen-style symbol.

## Interaction state
The three actions are momentary actions, not persistent tabs. Therefore no segment receives a persistent filled background.

Pressed/hover feedback uses a transient 42px circular outline around the glyph, inside the 56px tap target. This preserves the shared capsule as the permanent common region while making the momentary target explicit.

## Evaluation
Test recognizability and interpretation separately:
1. What object do you see?
2. What do you expect it to do in this architecture-map context?
3. After one use, can you remember the meaning?

References:
- Nielsen Norman Group, Icon Usability: When and How to Evaluate Digital Icons (2024)
- Apple HIG, Icons / SF Symbols
- Phosphor Icons
