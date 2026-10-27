# SGM / Visual System Handoff

**Date:** 2026-10-28  
**Source state:** main at `95b28e9`  
**Primary reference:** `docs/SGM_Visual_System_v0.2.md`  
**Purpose:** Continue Visual System research and controlled production experiments in a new chat without reopening resolved v0.1 decisions.

## 1. Where the project is now

The v0.1 phase established a high-quality functional baseline:

- full-viewport, map-first composition;
- one Search / Preview / Detail information system;
- quiet cartographic ground with architecture as the focal layer;
- Source Sans / Serif hierarchy;
- Gentle Pop architecture categories;
- coordinated selected-pin / camera behavior;
- nonmodal Detail;
- reduced-motion support;
- EN / JA parity;
- Day / Night production support;
- refined Search, utility, marker and record hierarchy.

This baseline is intentionally restrained and highly legible. The current problem is not lack of polish. It is that the interface can feel **too system-like, hard and administrative** for a product whose purpose is to make people want to go out, look around and discover architecture.

## 2. Direction change

### Retain

- **The City Stays in View** as the spatial principle.
- Map-first hierarchy.
- Flat / opaque material restraint.
- Progressive disclosure.
- Direct map interaction.
- Architecture over interface.
- Clear typography and strong accessibility.

### Supersede

Do **not** continue treating **Square** as a universal visual rule.

The new direction is not “make everything round.” It is:

> **Roundness follows freedom. Structure stays structural.**

Floating, immediate, exploratory actions may become more circular, capsule-like or softly rounded. Edge-attached reading surfaces may remain more architectural and rectilinear.

Also superseded: collecting unrelated city functions into one tidy “settings toolbar” by default.

## 3. Expressive concept

### Urban Lenses / Many Ways Into the City

SGM is a loose collection of **lenses for seeing the city**:

- architecture;
- location;
- daylight / night;
- weather;
- language;
- map scale and position.

A lens should feel like a direct instrument, not a preference panel.

Desired character:

**soft · direct · exploratory · responsive · lightly playful**

Avoid:

**administrative · rigid · dashboard-like · over-carded · generically rounded**

This concept is **Provisional**, not yet Adopted.

## 4. Translation from context to interface

Use the common SGM method:

**Context → Phenomenon → Quality → Principle → Decision → Test**

| Context | Quality | Principle | Current design implication |
|---|---|---|---|
| Walking reveals Singapore non-linearly | openness / discovery | keep many ways into the city | distribute tools by task rather than one toolbar |
| Strong changes in tropical light and weather | changeability | city conditions are lenses | Day/Night and weather should feel immediate, not buried in settings |
| Architecture is understood through overview → focus → record | depth with continuity | attention changes without spatial rupture | selected pin, camera and information surface move as one system |
| Sheltered edges, arcades and thresholds soften hard urban structure | structured softness | shape expresses mobility vs attachment | floating actions can round; attached surfaces remain structural |
| EN / JA are two readings of one city | equivalence | switch reading directly | two-state language action rather than menu |
| Outdoor mobile use is brief and glance-driven | immediacy | show effect before configuration | prefer one-tap actions with recognizable symbols |

## 5. Interaction model to test next

### Appearance

Current System / Day / Night menu feels like a settings page.

Target behavior:

1. On first entry, inherit OS preference.
2. After the person explicitly changes appearance, their explicit choice controls the site.
3. Everyday control becomes a **direct Day ↔ Night action**.
4. Prefer a familiar sun / moon symbol or similarly clear two-state icon.
5. Do not expose “System” as an everyday third option after initial entry unless research later proves it useful.

Status: **Provisional; first production experiment.**

### Language

EN ↔ JA is a simple two-state lens.

Target behavior:

- one tap changes language;
- no chevron;
- no menu;
- preserve selected building / camera / information depth.

Status: **Provisional; early experiment.**

### Weather

Weather is city information, not appearance configuration.

Target behavior:

- visually independent from appearance / language;
- icon + temperature sufficient in overview;
- tapping may open the authoritative source, but the control should read first as information.

Status: **Provisional.**

### Location

Keep as a separate map action in a thumb-reachable edge position.

### Brand / Home

Keep identity + reset function distinct.

**Do not redesign the mark in the Visual System chat.** Hand brand / home-form exploration to Iconography / Identity.

## 6. Shape grammar — do not reduce this to “round vs square”

Develop a **role-based shape system**.

Candidate logic to validate, not final tokens:

- **Point action / map tool:** circular or near-circular.
- **Two-state lens:** compact capsule or soft compact control.
- **Search:** soft floating field; should invite entry without becoming a generic giant pill.
- **Preview:** floating information surface with softer corners because it remains spatially mobile.
- **Detail:** stronger edge attachment and more structural geometry.
- **Popover / menu:** only where a menu is semantically justified.
- **Brand:** own geometry.

Test the relationship between shapes, not isolated radius values.

## 7. Control placement

Do not group controls merely because a row looks tidy.

Ask for every control:

1. What does it act on?
2. How often is it used?
3. Does it change the city view, provide city information, navigate, or configure?
4. What nearby screen region makes that role most obvious?
5. Can the result happen immediately on tap?

Reference direction from Apple Maps should be understood as **interaction grammar**, not visual imitation:

- controls sit where their role is understandable;
- familiar symbols communicate quickly;
- the map remains interactive;
- information surfaces preserve map context.

Do not copy Apple Maps’ visual skin.

## 8. Motion concept

Current Preview / Detail transitions are technically polished but still need stronger semantic reason.

Use four verbs:

### Toggle
A state changes **in place**.

Examples:
- Day ↔ Night;
- EN ↔ JA.

Motion should be short and direct. Avoid a menu animation for a binary state.

### Focus
Attention moves to one building.

Examples:
- marker transition;
- minimal camera reframe only when needed.

The selected place remains spatially anchored.

### Reveal
More information appears from the same place / surface.

Examples:
- Preview → Detail.

The user should perceive “looking deeper,” not “a new card arrived.”

### Release
Information territory contracts and returns space to the city.

Examples:
- Detail → Preview;
- Preview → Map.

Do not simply reverse every entrance mechanically; the return may be quieter or faster.

Use expressive motion only where the movement itself communicates an important spatial change. Routine micro-feedback stays productive and fast.

## 9. Production experiment order

Do not change all visual axes simultaneously.

Recommended order:

1. **Direct Appearance action**
   - remove everyday three-option menu;
   - keep first-load System inheritance;
   - test sun / moon direct action.
2. **Direct Language action**
   - remove menu / chevron;
   - EN ↔ JA in one action.
3. **Weather separation**
   - remove the idea that Weather / Appearance / Language are one settings cluster.
4. **Distributed placement**
   - establish spatial role before final radii.
5. **Role-based shape grammar**
   - test 2–3 component roles at a time.
6. **Semantic motion**
   - Toggle / Focus / Reveal / Release.
7. **Integrated mobile review**
   - only then refine exact radii, spacing and timings.

Production must show only the chosen experiment. No permanent A/B UI.

## 10. Important current technical / visual issue

### Debugging handoff — iOS software keyboard

This is **not** a Visual System debugging task.

**Symptom**  
On iPhone Safari, tapping Search opens the software keyboard and the whole composition is pushed upward.

**Reproduction**  
Overview state → tap bottom Search field → iOS keyboard appears → map / top controls / bottom surface shift upward together.

**Recent relevant changes**  
Search interaction hierarchy was refined in commit `30b74d1`, but the viewport problem should be investigated independently rather than blamed on that commit without evidence.

**Intended Visual System state**  
Opening the keyboard must not make the entire map composition feel displaced. Search should remain usable above the keyboard while the city/map retains spatial stability. Any necessary movement should belong to the Search surface, not read as the entire application being shoved upward.

**Owner:** SGM / Debugging.

## 11. Other handoffs

### Iconography / Identity
Investigate the top-left SGM home/reset mark separately:
- recognizability;
- relation between identity and map reset;
- whether current container/form is too hard;
- icon/mark geometry.

Do not solve this incidentally while changing general UI radii.

### Fundamentals
Audit:
- hit areas;
- focus visibility;
- Reduced Motion;
- direct-control accessibility names;
- Day/Night contrast;
- EN/JA text expansion.

## 12. What not to do next

- Do not rebuild the whole interface around circles.
- Do not copy Apple Maps visually.
- Do not add glassmorphism because Apple uses it.
- Do not reintroduce a design-lab switcher into production.
- Do not add decorative spring motion everywhere.
- Do not reopen settled Typography / Cartography / Color decisions unless the new concept exposes a real cross-system conflict.
- Do not debug the keyboard issue in Visual System.
- Do not redesign the brand mark here.

## 13. Validation questions

For every experiment ask:

- Does the interface make me more willing to explore the city?
- Can I understand the action before tapping?
- Does one tap create the expected change?
- Is the map still the largest perceptual field?
- Does shape communicate role, or is it only decoration?
- Does motion explain a change in attention / depth / state?
- Does it feel authored for SGM rather than borrowed from Apple, Google or an AI UI pattern?
- Does EN / JA remain equally coherent?
- Does Day / Night preserve hierarchy?
- Would removing this element make the experience clearer?

## 14. Research anchors

### Apple Human Interface Guidelines
Use as interaction and platform calibration:
- Maps: interactive map, preserve selected location while showing place information, custom UI should match the app rather than imitate Apple Maps.
- Buttons: familiar actions should use recognizable symbols; hit targets should remain comfortably selectable.
- Menus: menus are for revealing meaningful sets of options, not for every simple state change.
- Motion: motion must be purposeful and optional.

### Material 3 Expressive
Use as evidence that expressive UI can improve usability, not as a style kit:
- color, shape, size, motion and containment can direct attention;
- expressive design is contextual, not universal;
- flexible shapes and shape change can communicate state;
- functionality and accessibility remain primary.

### IBM Carbon
Use for motion discipline:
- **productive motion** for routine controls and micro-feedback;
- **expressive motion** for occasional important transitions where movement carries meaning;
- related semantic actions should share related choreography.

## 15. Prompt for the next Visual System chat

Paste the prompt below into a new project chat.

---

This chat is **SGM / Visual System v0.2**.

Read these first:
- `docs/SGM_Design_System_v0.1.md` or the latest shared Design System document available in the project
- `docs/SGM_Visual_System_v0.2.md`
- `docs/SGM_Visual_System_Handoff_2026-10-28.md`
- `docs/SGM_System_Status_v0.1.md`
- the latest Typography / Color / Cartography / Iconography System MDs when relevant

The v0.1 interface reached a strong functional and optical baseline, but it became too rigid and system-like for SGM’s purpose of encouraging architectural exploration in the city.

The provisional expressive concept is **Urban Lenses / Many Ways Into the City**.

Keep **The City Stays in View** as the spatial principle.

Important direction:
- do not make everything round;
- remove Square as a universal rule;
- use role-based shape: freer floating actions can be rounder, attached reading surfaces can remain structural;
- prefer direct one-tap actions over settings-like menus when the state is simple and predictable;
- treat appearance, weather, language, location and search as different city/map roles, not one administrative toolbar;
- first entry may follow OS appearance, but after an explicit Day/Night change the user choice should persist;
- test Day ↔ Night and EN ↔ JA as direct controls;
- motion must express **Toggle / Focus / Reveal / Release** rather than exist decoratively;
- preserve map context and architecture as the visual priority;
- Apple Maps is an interaction reference, not a visual template;
- Material 3 Expressive is a research reference for functional expressiveness, not a component style to copy;
- Carbon is a reference for productive vs expressive motion.

Do not debug functional faults here. If a bug appears, prepare a Debugging handoff with symptom / reproduction / recent change / intended Visual System state.

Known Debugging handoff:
On iPhone Safari, focusing Search opens the software keyboard and pushes the whole composition upward. This belongs to **SGM / Debugging**.

Brand / home mark exploration also belongs to a separate Iconography / Identity study.

Start with the smallest useful v0.2 experiment:
**direct Day/Night interaction → direct EN/JA interaction → weather separation → distributed control placement → role-based shape grammar → semantic motion.**

Do not add permanent comparison controls to production. Use reversible commits and screenshots for comparison.

Use relevant professional research and examples, but translate their principles into SGM rather than copying their appearance.

---

