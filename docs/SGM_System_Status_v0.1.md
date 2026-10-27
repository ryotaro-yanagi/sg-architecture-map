# SGM / System Status

**Version:** v0.1  
**Status:** Cross-system integration ledger — not a specialist specification  
**Implementation snapshot:** main at `95b28e9`  
**Scope:** Reconcile documented decision status with current production use. Detailed tokens and domain decisions remain in each specialist System MD.

## 1. Status Rule

- **Adopted:** Stable principle or role that is established across the system.
- **Provisional:** Used in production as the current baseline, but still subject to visual or empirical validation.
- **Open:** Decision is intentionally unresolved.
- **Implementation is evidence, not adoption.** A value can be live in production while remaining provisional.
- When documentation and code differ, update the owning specialist System MD rather than duplicating its detailed tokens here.

## 2. Cross-System Status

| System | Documented / established | Current production state | Sync status |
|---|---|---|---|
| **Typography** | Sans identity/actions; Serif attribution/records; shared Latin typography across EN/JA; Compact vs Detail reading roles | Source Sans 3 / Source Serif 4 and Japanese Source Han subsets are active; light Serif metadata and edited Compact credits are in use | **Aligned.** Exact light weights, micro-spacing and Compact credit editing remain **Provisional** despite production use |
| **Cartography** | Map-first, flat/borderless ground; zoom-based disclosure; architecture over geographic detail | Warm Day palette, restrained boundaries, staged road/building/label disclosure and Singapore overview label are active; Day/Night switching exists | **Mostly aligned.** Current palettes, label balance, footprint prominence and Night treatment remain **Provisional** |
| **Color** | Neutral UI / Responsive Interaction / Gentle Architecture / Illustrated Geography | Neutral + interaction roles are active; six architecture category hues are mapped to categories; illustrated geographic palette is active; Day/Night UI tokens exist | **Documentation lags production.** Category mapping, geographic palette and Night palette should be recorded as **Provisional production baselines**, not yet Adopted |
| **Visual System** | Full-viewport map ground and information continuity are retained; v0.2 introduces **Urban Lenses** as a provisional expressive concept and removes Square as a universal rule | Current production still reflects much of the v0.1 toolbar / square geometry; v0.2 direct controls, role-based roundness and distributed placement are not yet implemented | **Concept transition.** Keep v0.1 production stable while validating v0.2 through small reversible changes |
| **Iconography** | Specialist status not available in the provided System MD set | Category pictograms, marker shape/state hierarchy and category-colored pins are active | **Needs specialist sync.** Do not infer Adopted status from code alone |
| **Fundamentals / Refinement** | Specialist status not available in the provided System MD set | 44px minimum controls, focus states, reduced motion and responsive rules are present | **Needs specialist audit** rather than status promotion here |

## 3. Cross-System Alignment

1. **Map → Architecture → Record is the shared hierarchy.** Cartography supplies context; marker color/icon establishes discovery; Typography establishes identity and record depth; Visual System preserves continuity between them.
2. **Color and Iconography must remain redundant, not dependent.** Architecture category meaning should survive without hue alone; category color, pictogram and selected-state scale work together.
3. **Compact and Detail share content identity but not information density.** Typography owns the reading hierarchy; Visual System owns the geometry that reveals it.
4. **Day/Night is one experience, not two themes.** Cartography, Color, Iconography and Visual surfaces should preserve semantic hierarchy while changing contrast and apparent brightness.
5. **Production comparison controls are not part of the design language.** Experiments remain reversible and outside the normal user interface.

## 4. Priority Sync Actions

1. **Color System:** change category mapping, illustrated geographic palette and Day/Night from “Open production adoption” to **Provisional production baseline**; keep final contrast and mapping validation open.
2. **Cartography System:** record that Day/Night, Singapore-label treatment and current zoom disclosure are implemented baselines, while their optical values remain provisional.
3. **Iconography System:** reconcile the live category pictograms, pin geometry and selected-state behavior with its own Adopted / Provisional / Open decisions.
4. **Visual System:** validate v0.2 **Urban Lenses** in this order: direct appearance/language actions → distributed utility placement → role-based shape grammar → semantic motion. Do not round every component at once.
5. **Integration review:** validate one complete flow — **Explore → Search → Preview → Detail → Map** — in EN/JA, Day/Night and mobile/desktop before promoting provisional values.

## 5. Working Principle

Prefer a small number of stable shared roles over duplicated component rules. Keep systems **consistent, not uniform**: the map, markers and information surfaces may look different because they serve different roles, but their hierarchy and behavior should remain coherent.

**References:** GOV.UK Government Design Principles — *Be consistent, not uniform; Iterate* · Design Tokens Community Group — stable shared design decisions and semantic reuse
