# SGM Collection Experience v0.2

Base: 1904875fdd5d162997469532348f0e9893a18a25

## Core principle

SGM should create a useful personal record with the smallest possible user effort.

When a user marks a building **Visited**:
1. Visited becomes true.
2. The current local date is automatically recorded.
3. The building immediately appears in My Record in chronological context.
4. The user may later edit the date or add a personal note.

The automatically recorded date is an editable default, not an irreversible claim. This preserves low-friction collection while leaving correction under user control.

## Why the date is automatic

The value of My Record is not only a set of visited buildings. The date provides a temporal cue that helps the user reconstruct trips and sequences of visits later.

A generic Visited flag without a date loses information that the system can reasonably capture at the moment of interaction. Asking every user to enter a date shifts work back to the user and weakens the benefit of using the service.

This follows:
- Personal Informatics research: barriers in Collection cascade into later Integration and Reflection; systems should balance automation and user control.
- NN/g EAS framework: eliminate unnecessary input, automate where possible, and keep inferred/prefilled values editable.

## Interaction model

### Detail
- Want to Visit
- Visited

Both are one-tap persistent toggles.

### My Record
A newly visited building already has a usable record:
- building
- architect/category
- automatically captured visit date

Optional enrichment:
- edit the date if the automatic date is wrong;
- add or edit a personal note.

There is no separate conceptual "Visit details" step required for the record to exist.

## Motion

Keep the expressive confirmation pop only where trigger and result are directly coupled:
- add Want to Visit;
- mark Visited.

Do not add a pop simply because another save operation succeeded. In particular, saving an edited date/note should use ordinary save feedback unless a future design gives the motion a clear local semantic target.

## Existing behavior preserved

- first-time Visited automatically records the current local date;
- legacy undated visited records remain valid;
- the date remains editable and clearable;
- saved and visited remain independent;
- collection schema and localStorage format remain unchanged;
- Share Record uses the stored date when present.

## References

- Li, Dey & Forlizzi, CHI 2010 — Stage-Based Model of Personal Informatics Systems.
- Nielsen Norman Group — EAS Framework: Eliminate, Automate, Simplify.
