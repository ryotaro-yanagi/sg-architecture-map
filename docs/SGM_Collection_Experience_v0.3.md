# SGM Collection Experience v0.3

Base: 6ad5cfee63bbc3dee95936db20758cdf0f16dd20

## Fixes

### 1. Want to Visit reflects Saved independently from Visited

Saved and Visited are independent states in SGM. A building that is both saved and visited must still appear in Want to Visit if the user has explicitly kept Want to Visit on.

This also supports revisit intent without silently deleting a user's saved state.

### 2. Record editor uses the full record width

The record summary keeps its useful two-column structure:
- date on the left;
- building information on the right.

Editing is a different task. Date and note fields now expand below the summary as a centered single-column form using the previously unused left-side space.

This follows mobile-form guidance favoring a single vertical flow and avoids squeezing form fields into the narrower content column.

### 3. Record editing scrolls vertically only

The collection list and record area explicitly prevent horizontal overflow/panning:
- child controls use border-box sizing;
- date/text fields cannot exceed their container;
- touch scrolling is constrained to the vertical axis.

Vertical scrolling remains available because the editor can exceed the viewport height.

## Research basis

- Nielsen Norman Group, Website Forms Usability: mobile forms should favor a single-column vertical flow; related labels and fields should remain visually close.
- Nielsen Norman Group, Group Form Elements Effectively Using White Space: top-aligned labels and adequate usable width improve scanning and association.
- Apple HIG, Scroll views: scroll only as much as needed and preserve spatial context.
- Apple HIG, Gestures: standard vertical scrolling should remain predictable; interface geometry should remain stable during touch interaction.
