# SGM Experience Navigation v0.2

Base: 84be9e0c2e282b3a12e9fa10e3ac1d66870a2492

## Scope
This iteration changes only home layout and Settings placement.

- Keep the empty-query browse list in Search.
- Keep existing Search, Collection, Record, map, weather, storage and history behavior.
- Use one 56px visual control family for logo, weather height, Settings, Location and the central action bar.
- Group Discover / Visit / Record inside one 168×56 capsule with three 56px hit areas and no internal dividers.
- Keep Settings and Location as independent circles on the same baseline.
- Center the Settings dialog because its scope is application-wide, not spatially attached to the settings trigger.
- Keep the Vercel Toolbar visible during preview review.

## Rationale
Hierarchy is expressed primarily through grouping/common region rather than making the three primary actions larger than map utilities. This reduces the visual claim of the navigation over the map while preserving the three-action relationship.

References:
- Apple HIG — Toolbars: logical horizontal grouping, deliberate prioritization, avoid overcrowding.
- Apple HIG — Buttons: consistent heights improve visual consistency.

## Review targets
- 320 / 390 / 430 px: bottom row must fit without overlap.
- Check attribution clearance and iOS safe area.
- Compare perceived prominence of map vs central action group.
- Check logo/weather visual weight against bottom controls.
- Check Settings modal balance in portrait.
