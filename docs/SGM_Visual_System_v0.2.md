# SGM / Visual System

**Version:** v0.2  
**Status:** Concept direction provisional — spatial principles retained; expressive language under validation  
**Scope:** Composition, surfaces, spatial hierarchy, responsive layout, map–UI coordination, motion language and cross-system integration. Typography, color, cartography and iconography keep ownership of their specialist decisions.

## 1. Concept

### Spatial principle — The City Stays in View

SGM should let people move from city → place → record without losing spatial context. The map remains the primary ground.

### Expressive concept — Urban Lenses / Many Ways Into the City

SGM is not a settings panel placed over a map. It is a loose set of **lenses for seeing the city** — through architecture, location, climate, time and language.

Each control should feel like a direct instrument: easy to recognize, placed near the task it serves, and capable of changing the view without first opening an administrative layer.

The desired character is **soft, direct, exploratory and responsive** rather than rigid, aggregated and system-like.

## 2. Translation

Use **Context → Phenomenon → Quality → Principle → Decision → Test**.

| Context / observation | Quality | Visual principle | Test |
|---|---|---|---|
| The city is discovered non-linearly while walking | Openness; choice | Distribute controls by spatial role instead of collecting unrelated utilities into one toolbar | Does the map feel like a field to explore rather than a dashboard? |
| Singapore changes strongly through daylight, weather and shade | Changeability | Treat time / appearance and weather as direct lenses on the city | Can a person understand and change the current view in one action? |
| Architecture is understood by shifting from overview → focus → record | Depth without rupture | Focus a place, reveal information, then release back to the city | Does motion explain the change in attention? |
| Public space combines hard structure with softer sheltered edges | Structured softness | Use roundness according to freedom and mobility, not as universal decoration | Do floating tools feel approachable while attached reading surfaces remain clear? |
| English / Japanese are two ways of reading the same city | Immediate switching | Prefer a direct two-state language action over a menu | Can language change without entering a settings-like flow? |

## 3. System Rules

1. **Keep the map as the ground.** UI supports the city and should not become the dominant foreground.
2. **Tools, not settings.** Prefer a direct action or direct state change when the result is simple and predictable. Use a menu only when multiple choices genuinely need to be compared.
3. **Roundness follows freedom.** A freely floating point action may be circular; a compact state can be capsule-like; a floating information surface can use soft corners; a surface attached to an edge can remain more structural. Do not round everything equally.
4. **Place controls by role, not by neatness.** Group controls only when they form one task. Weather, appearance, language and location do not need to become one administrative toolbar merely because they fit in one row.
5. **Motion follows meaning.** Use four verbs:
   - **Toggle:** a state changes in place.
   - **Focus:** a selected architecture marker gains emphasis and the map reframes only if needed.
   - **Reveal:** Preview / Detail grows from the information surface that already exists.
   - **Release:** the surface contracts and gives visual territory back to the city.
6. **Preserve one information surface grammar.** Explore → Search → Preview → Detail remain related states, even if their edge treatment becomes softer.
7. **Keep hierarchy explicit.** Geography → Architecture → Building identity → Metadata → Utilities.
8. **Stay materially restrained.** Opaque surfaces, line separation and controlled contrast remain the baseline. Roundness is not permission for decorative cards, gradients or unnecessary depth.
9. **Keep experiments outside production UI.** Compare changes through reversible implementations and screenshots, not runtime A/B controls.

## 4. Interaction Direction

- **Appearance:** Follow the operating-system preference on first entry. After the person explicitly changes appearance, keep that choice. The primary control should become a direct Day ↔ Night action using a clear sun / moon symbol rather than opening System / Day / Night as a settings menu.
- **Language:** EN ↔ JA is a two-state reading lens. Prefer one direct action without a chevron or menu.
- **Weather:** Weather is city information, not a setting. Keep it visually independent from appearance and language; icon + temperature is sufficient at the overview level.
- **Location:** Keep current location as an independent map action near the map edge / thumb-reachable zone.
- **Brand / Home:** Preserve a distinct reset / identity role. The mark itself should be developed in the relevant identity or iconography study rather than solved through generic UI rounding.
- **Search:** Keep search anchored to exploration. Keyboard entry should not cause the entire map composition to relocate.
- **Preview / Detail:** Treat Detail as a deeper look at the same place, not a new screen. Preserve building identity through the transition and let the map remain perceptible.

## 5. Decisions

- **Retained / Adopted:** Full-viewport map as spatial ground; map context retained during place reading; flat, opaque material baseline; one Search / Preview / Detail information system; direct map interaction; production UI without comparison controls.
- **Provisional:** **Urban Lenses** as the expressive concept; distributed controls; role-based roundness; direct Day ↔ Night control; direct EN ↔ JA control; weather as independent city information; motion grammar of Toggle / Focus / Reveal / Release.
- **Superseded from v0.1:** Square as a universal visual direction; unrelated top utilities collected by default into one toolbar; menu-based System / Day / Night as the primary everyday appearance interaction.
- **Open:** Exact radii and control positions; mobile / tablet breakpoint geometry; final Preview and Detail corner treatment; amount of expressive motion; final brand/home form.

## 6. Validation

Validate the concept on real mobile first.

Check:
- Can each control be understood before tapping?
- Does one tap usually produce the expected result?
- Does the map feel larger and less administrated?
- Do rounded elements feel intentional rather than generically friendly?
- Does every motion have a spatial reason?
- Does EN / JA preserve the same visual rhythm?
- Does Day / Night preserve the same hierarchy?
- Does Search remain spatially stable when the keyboard appears?

**Handoff:** Typography owns textual hierarchy; Color owns semantic colors and Day/Night palettes; Cartography owns the geographic ground; Iconography owns symbols and marker forms; Fundamentals audits accessibility; Debugging owns keyboard / viewport regressions and other faults.

**References:** Apple Human Interface Guidelines — Maps / Buttons / Toggles / Motion / Search · Material 3 Expressive — shape, size, motion and containment as functional expression · IBM Carbon — productive vs expressive motion and semantic choreography
