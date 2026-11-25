# SGM Collection Experience v0.1

Base: 276f5d7e2d21ba2ef62e9d6042348e6653c12704

## Core model

Separate two concepts:

1. **Visited** — lightweight persistent status.
2. **Visit details** — optional date and personal note.

Marking a building Visited no longer invents today's date. A user may be recording a visit from today or from years ago, so the UI should not silently infer a precise date from a generic status action.

This follows the same broad separation used by Letterboxd:
- Watched = state
- Diary / Log = dated record

## Flow

Detail:
- Want to Visit
- Visited

My Record:
- every Visited building appears, even without a date;
- undated records remain valid;
- "Add visit details" progressively reveals Visit date + Personal note;
- existing details use "Edit record".

This keeps the common action lightweight and defers optional metadata until requested, following progressive disclosure.

## Confirmation motion

Saving Visit details is a meaningful accumulation event, so after a successful save:
- editor closes immediately;
- the record's date column receives one local radial confirmation pulse;
- motion does not block interaction;
- no animation on cancel or clear;
- Reduced Motion collapses the effect to a short, non-scaling indication.

## Important non-changes

- collection schema stays v2;
- localStorage format is unchanged;
- visited and saved remain independent;
- existing dated records are preserved;
- share record continues to use the stored optional visitDate;
- no automatic migration is required.

## References

- Letterboxd Help Center (2026): marking Watched is distinct from logging a dated Diary entry.
- Nielsen Norman Group: Progressive Disclosure — secondary/less frequent details should appear on request.
- Apple HIG Motion / Feedback — confirm meaningful successful actions briefly and precisely, without making people wait.
