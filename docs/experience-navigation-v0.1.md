# SGM Experience Navigation v0.1 — experimental integration

Base: d11744addbff7b245cc51fea80d6461754f7a21f. Not approved for production. No data migration.

- Home: existing island logo top-left, live weather top-right, settings left below, location/conditional compass right below, three independent bottom buttons (Discover, Want to Visit, My Record).
- Main hit areas 56px; secondary 48px; 12px gap; shared Phosphor icons are provisional. No always-visible labels; localized accessible names and titles retained.
- Search opens existing search field from a button, with focus in initiating gesture and explicit close. The prior map selection is cleared as in the original search implementation.
- Existing CollectionView remains shared; `collectionTab=saved|visited` records selected tab, including browser history and direct links. Legacy `view=collection` defaults to saved; legacy `share=record` opens visited. Closing returns focus to the originating home button where available.
- Settings uses native dialog, existing appearance and locale switching. Existing collection schema, share rendering, map style, data, brand assets and loading screen untouched.

## Acceptance checks (not executed as part of this commit)
- 320/390/430/1280px, EN/JA, Day/Night; check map attribution including long/expanded attribution, safe area and browser keyboard on iOS Safari.
- Search button focuses field; type, clear, select result, close via X/Escape, tap map to dismiss; preview and detail stay consistent.
- Visit/Notebook open correct panels; change tabs, share, back, forward, refresh; old URLs still work; close restores original opener. Keyboard navigation and focus in all dialogs. Check focus after selecting a building from search/collection.
- Settings opens/closes, Escape and focus restoration; language change retains map center, zoom and selection as before; appearance persists.
- Saved/Visited/date/note/share PNG behavior unchanged, including empty and unavailable storage states.
- Run npm ci, typecheck, all existing tests, publication check, production build, inspect console. No deployment.
- Current deploy workflow only triggers on main push (or manual dispatch). Do not dispatch deployment for this experimental branch.

## References
- https://developer.apple.com/design/human-interface-guidelines/search-fields
- https://www.nngroup.com/articles/how-to-test-digital-icons/
- https://www.w3.org/TR/WCAG22/
