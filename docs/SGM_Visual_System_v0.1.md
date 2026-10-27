# SGM / Visual System

**Version:** v0.1  
**Status:** Working standard — spatial principles adopted; geometry and motion provisional  
**Scope:** Composition, surfaces, spatial hierarchy, responsive layout, map–UI coordination, motion language and cross-system integration. Typography, color roles, basemap styling and marker symbols belong to their specialist systems.

## 1. Concept

**The City Stays in View**

SGM should let people move from city → place → record without losing spatial context. Interface elements support this movement as a quiet, continuous tool rather than a sequence of separate cards or screens.

## 2. Translation

Use **Context → Phenomenon → Quality → Principle → Decision → Test**.

| Singapore observation / actual use | Extracted quality | Design principle / decision | How to test |
|---|---|---|---|
| Architecture is encountered while moving through a dense city | Continuity; orientation | Keep the map as the persistent ground; reveal information without unnecessarily replacing it | Can users select, read and return while still understanding where the building is? |
| Sheltered walkways and layered transitions connect different urban conditions | Continuity through change | Treat Explore, Search, Preview and Detail as states of one spatial system rather than unrelated overlays | Does each state feel like a transformation of the same tool? |
| Strong daylight and brief mobile attention | Immediate legibility; material clarity | Prefer opaque, flat surfaces, clear boundaries and restrained depth over translucency or decorative layering | Are controls and records readable outdoors without overpowering the map? |
| Building identity and urban context must be read together | Spatial memory; selective attention | Keep selected architecture visible and move the camera only when UI would obscure it | Does selection preserve both the building and enough surrounding geography? |
| Mobile exploration and desktop research have different physical conditions | Adaptation; reachability | Preserve roles across viewports, but allow different geometry instead of forcing identical layouts | Is the same interaction understandable on phone and desktop without wasting map area? |

## 3. System Rules

1. **Keep the map as the ground.** The viewport map is the primary spatial layer. UI occupies only the area needed for the current task and should not become a decorative foreground.
2. **Use one surface grammar.** Explore → Search → Preview → Detail belong to one Bottom Surface system. Search is an exploration state; Preview → Detail is information depth.
3. **Disclose progressively.** Compact Preview is content-fit and supports quick identification; Detail provides full reading. Preserve visible map context whenever the task does not require full modal focus.
4. **Stay flat and structural.** Use opaque neutral surfaces, borders, spacing and proportion as the default separation language. Shadow, translucency or extra layering require a functional reason.
5. **Coordinate surface and map.** Selected pins, camera position and map controls respond to occupied UI space. Avoid recentering when the selected place is already comfortably visible.
6. **Use motion to explain continuity.** Transitions should clarify that a surface changed state, not announce a new object. Respect reduced-motion preferences. Do not show drag/grabber affordances until dragging is actually supported.
7. **Be adaptive, not uniform.** Mobile may use bottom-attached states while desktop can use lateral reading space. Preserve hierarchy and behavior rather than identical dimensions.
8. **Integrate by visual weight.** Cartography establishes context; architecture markers provide focal discovery; building identity leads the information surface; metadata and controls remain subordinate. Specialist systems own their detailed tokens.
9. **Keep experiments outside production UI.** Compare alternatives through reversible commits, branches, screenshots or controlled review—not permanent runtime comparison controls.

## 4. Decisions and Open Questions

- **Adopted:** Full-viewport map as spatial ground; Square / Flat material direction; opaque surfaces with line-based separation and no default decorative shadow; one Bottom Surface grammar for Explore / Search / Preview / Detail; content-fit Compact Preview; preservation of map context during selection; production UI remains free of comparison controls.
- **Provisional:** Exact mobile and desktop surface geometry; current Search and Detail extents; map-control displacement; camera safe-area calculations; transition timing; desktop Detail as a right-side reading surface; optical integration of Day/Night surfaces.
- **Open:** Whether Preview ↔ Detail should support drag/swipe; final nonmodal behavior while Detail is open; tablet/intermediate layouts; final camera coordination across all surface states; whether any additional material depth is ever necessary.

## 5. Validation and Handoff

Test the complete sequence **Explore → Search → Preview → Detail → Map** on real mobile and desktop, in EN/JA, with short/long names, Day/Night and reduced motion. Check map visibility, selected-pin visibility, one-handed reach, surface continuity, wrapping, focus visibility and return to exploration. Change one spatial variable at a time.

**Handoff:** Typography owns textual hierarchy inside surfaces; Color owns surface/interaction color roles; Cartography owns the geographic ground and zoom hierarchy; Iconography owns marker and action symbols; Fundamentals audits accessibility and consistency; Debugging owns regressions and functional faults.

**References:** Apple Human Interface Guidelines — Sheets / Modality · Mapbox Search SDK — Search UI / Place Card / Maps integration · WCAG 2.2 — Animation from Interactions
