# SGM Interaction Ring v0.2

Base: c33cf6ff738e2714d1964ad403ce9df132dfe244

## Principle
Use a circular outline as the shared feedback motion for embedded icon actions.

Pressed and persistent selected/toggled states remain semantically separate:
- Pressed: transient ring around the glyph.
- Saved / Visited: filled icon + changed label ("Saved", "Visited").
- The ring briefly confirms activation, then disappears.

This avoids using a persistent gray background to mean either "pressed" or "selected".

## Applied in this iteration
1. Home action capsule — existing transient ring.
2. Detail > Save / Mark visited — transient ring on press plus a brief confirmation ring when the state becomes active.
3. Settings > Appearance — transient ring instead of a filled gray disc.

## Deliberately not applied
- Floating Settings and Location buttons already have circular surface containers; adding another ring would duplicate the shape.
- Close / Back remain navigation controls and retain their existing feedback.
- Text links and list rows keep text/row feedback.
- Persistent Saved/Visited state is not represented by the ring.

## Research basis
- Apple HIG Buttons: custom buttons require clear press states; style rather than size should carry hierarchy.
- Apple HIG Toggles: toggled state needs a distinct persistent appearance.
- NN/g Button States: pressed and selected are different states; pressed feedback should be immediate and brief.
