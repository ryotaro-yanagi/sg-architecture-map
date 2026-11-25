# SGM Experience Navigation v0.3

Base: 59adcf8fcddf3512cadaf5339d9f0cbee6d880e2

This iteration keeps the accepted map-first home layout unchanged.

Changes:
- Search empty-query browse list is unchanged.
- Settings now displays the current language (EN/JA), not the destination language.
- Appearance glyph now represents the current state (Sun=Day, Moon=Night), while the accessible label continues to describe the action that will occur.
- Settings initial focus moves to its static title, preventing the Close control from being visually emphasized on open while preserving modal focus management and return-to-trigger behavior.
- Visit opens a dedicated "Want to Visit" surface and Notebook opens a dedicated "My Record" surface. The shared collection data/state and URL tab parameter remain unchanged internally; the redundant Collection tab strip is removed from the visible experience.
- Share Record remains nested under My Record.

Rationale:
- Top-level launchers should lead to destinations that confirm the user's chosen area rather than reintroduce a second choice.
- Settings should expose current state to support recognition rather than recall.
- WAI-ARIA APG permits initial focus on a static element at the top of a dialog when that improves comprehension; focus still returns to the invoking Settings button on close.

No map style, database, collection schema, search algorithm, storage, share graphic, or home layout changes.
