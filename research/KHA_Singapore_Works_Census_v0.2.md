# SGM / Kerry Hill Architects — Singapore Works Census v0.2

Updated: 2026-10-27. Research scope: documented built works located in Singapore; historical and demolished works remain in the census but do not automatically receive live map pins.

## Working distinctions

- `mapped`: already in `src/data/buildings.json`; coordinates are provisional unless separately surveyed.
- `historical-only`: demonstrably demolished; record in this census but do not pin at the replacement building.
- `needs-current-site-verification`: authorship and historical work established; current footprint/preservation not sufficiently established for a reliable SGM pin.
- `excluded-other-country`: outside Singapore regardless of association with a Singapore-based architect.
- `research-candidate`: identified in a practice CV or contents list, but identity, status or role is not fully reconciled.

## Mapped works (6)

| SGM ID | Project | Result |
|---|---|---|
| SGM-0131 | Martin No. 38 | mapped; publicAccess unverified |
| SGM-0132 | Seven Palms Sentosa Cove | mapped; publicAccess unverified |
| SGM-0133 | Urban Suites | mapped; publicAccess unverified |
| SGM-0139 | HANA | mapped; publicAccess unverified |
| SGM-0142 | The Beaufort Sentosa (now Sofitel Singapore Sentosa) | mapped; publicAccess unverified |
| SGM-0143 | Genesis Building | mapped; publicAccess unverified |

## Outstanding and excluded cases

| Work | Approx. historical year | Decision | Required next check | Evidence |
|---|---|---|---|---|
| Singapore Cricket Association Pavilion | 1999 | needs-current-site-verification | Confirm original pavilion footprint at Kallang Playing Fields and whether any original building survives; do not confuse with Singapore Cricket Club at Padang | [Shinkenchiku](https://data.shinkenchiku.online/en/projects/articles/AU_2009_11_082-0); [ArchitectureAu](https://architectureau.com/articles/a-s-hook-address/); [Kerry Hill practice CV](https://archive.abp.unimelb.edu.au/objects/pdfs/Design%20competition/Entries/Eligible/KHA%26LC_EOI.pdf) |
| Singapore Zoological Gardens New Entrance Plaza | 2003 | needs-current-site-verification | Compare historical plan and photographs against current Mandai/Singapore Zoo entrance; later remodeling does not prove the original architecture remains | [a+u issue contents](https://au-magazine.com/shop/architecture-and-urbanism/au-200911/); [Kerry Hill practice CV](https://archive.abp.unimelb.edu.au/objects/pdfs/Design%20competition/Entries/Eligible/KHA%26LC_EOI.pdf); [historical photo](https://www.zoochat.com/community/media/singapore-zoo-entrance-plaza.140740/) |
| Cluny Hill House | 1997 | historical-only | Do not place a current-site pin; original was demolished and replaced by another architect's house | [Geoffrey London, Kerry Hill essay](https://www.leomalinow.com/wp-content/uploads/2016/05/KERRY-HILL.pdf) |
| Garlick Avenue House (Kerry Hill) | 2005 occupancy | needs-current-site-verification | Identify whether original house remains; unrelated later 'Garlick Avenue House' project by Craft Architecture Studio must not be misattributed | [P*DA Kerry Hill](https://pda.designsingapore.org/award-recipients/2010/kerry-hill/); [ArchitectureAu](https://architectureau.com/articles/a-s-hook-address/); [Craft separate project](https://www.archify.com/sg/project/garlick-avenue-house) |
| 8 King Albert Park | 1992 award reference | research-candidate | Confirm original architect role and whether the original dwelling survives; address now also appears in newer construction references | [Kerry Hill practice CV](https://archive.abp.unimelb.edu.au/objects/pdfs/Design%20competition/Entries/Eligible/KHA%26LC_EOI.pdf) |
| Black Pavilion | early 2000s (not verified) | research-candidate | Confirm country, precise building identity, construction status | [a+u contents](https://au-magazine.com/shop/architecture-and-urbanism/au-200911/) |
| Ooi House | 1997 | excluded-other-country | Built in Margaret River, Western Australia | [Geoffrey London, Kerry Hill essay](https://www.leomalinow.com/wp-content/uploads/2016/05/KERRY-HILL.pdf); [Wesley College biography](https://www.wesley.wa.edu.au/gallery-of-honour/kerry-hill/) |
| Sukhumvit Soi 53 Apartments | 2004–2006 | excluded-other-country | Built in Bangkok, Thailand | [ArchitectureAu](https://architectureau.com/articles/international-award-1/) |

## Findings from 2026-10-27 follow-up (v0.2)

**No new present-day map markers are justified by this follow-up.** Documenting the original commission does not establish survival of the original fabric or a location precise enough for a currently navigable building.

| Work | New evidence | Decision after follow-up |
|---|---|---|
| Singapore Cricket Association Pavilion | The Australian Institute of Architects' 2006 Kerry Hill Gold Medal citation identifies the pavilion as a built Singapore commission. Singapore government material establishes extensive rebuilding of the National Stadium/Sports Hub precinct, **not** demolition of this specific pavilion. | Remains `needs-current-site-verification`. Determine whether Kallang Playing Fields pavilion site overlaps with later works using historical site plans; cannot infer demolition from stadium demolition. |
| Singapore Zoological Gardens Entrance Plaza | The same 2006 Gold Medal citation confirms KHA's entrance plaza. Mandai's 2026 opening statement chronicles substantial subsequent redevelopment, but does not identify which parts of the 2003 plaza survive. | Remains `needs-current-site-verification`. Require dated original entrance plans/photos and current entrance plans before a live map pin. |
| Garlick Avenue House | President's Design Award 2010 confirms the KHA house in Singapore and a 2005 date. Archify independently describes a **Craft Architecture Studio** project with the same name but does not establish it is a renovation of the KHA house. | Remains `needs-current-site-verification`. Never merge same-name works without parcel/architect continuity evidence; do not publish residential address merely from uncorroborated document listings. |
| Ooi House | External architectural Gold Medal citation describes Ooi House at Margaret River, Australia. | `excluded-other-country` remains confirmed. |
| Cluny Hill House | Existing architectural essay reports the original demolished. | `historical-only`, no live pin. |

### Source references added

- [Australian Institute of Architects / ArchitectureAu, Kerry Hill RAIA Gold Medallist (2006)](https://architectureau.com/articles/kerry-hill-raia-gold-medallist/) — KHA attribution for pavilion and entrance plaza, and Margaret River location of Ooi House
- [Mandai Wildlife Group, Mandai Wildlife Reserve Grand Opening (2026)](https://www.mandai.com/en/about-mandai/media-centre/A-decade-in-the-making-The-Mandai-Wildlife-Reserve-marks-Grand-Opening-as-Singapores-wildlife-and-nature-destination.html) — dated changes in the contemporary wildlife precinct, **not** proof of the original KHA plaza's survival/demolition
- [Singapore Government, National Stadium history](https://www.sg101.gov.sg/resources/archives/national-stadium/) — demolition of the **former National Stadium**, not direct evidence concerning KHA's cricket pavilion
- [President's Design Award, Kerry Hill (2010)](https://pda.designsingapore.org/award-recipients/2010/kerry-hill/) — original Garlick Avenue House attributed to KHA
- [Archify, Garlick Avenue House / Craft Architecture Studio](https://www.archify.com/sg/project/garlick-avenue-house) — different architectural attribution; identity cannot be merged without additional site evidence

### Decision gate

A historic work is **eligible for the research census** once original attribution and Singapore geography are established. It is **eligible for the live contemporary architecture map** only after the object/site being pinned is identified and its relation to the KHA design is established. A current venue name or approximate precinct centre is not sufficient. Public access remains a separate field.

Priority for the next pass: obtain original archival drawings and map extents for Pavilion and Zoo Plaza, then check them against present-day base maps; systematically inspect each project and project credit in KHA's 2022 monograph and the practice chronology for Singapore works missing from the six already mapped.

## Source-coverage and remaining work

Primary cross-checks: SIA [2023 gold medal](https://sia.org.sg/awards/sia-gold-medalists/tenth-gold-medal-recipient-kerry-hill-2023/), [President's Design Award 2010](https://pda.designsingapore.org/award-recipients/2010/kerry-hill/), [a+u 2009:11](https://au-magazine.com/shop/architecture-and-urbanism/au-200911/), [practice CV](https://archive.abp.unimelb.edu.au/objects/pdfs/Design%20competition/Entries/Eligible/KHA%26LC_EOI.pdf), and the [KHA selected works contents](https://www.gbv.de/dms/tib-ub-hannover/1799978958.pdf). This is not yet a certified exhaustive practice catalogue: examine the chronologies and credits in the monograph and later KHA projects.

Next steps: (1) reconcile pavilion and zoo entrance via archived plans and today's site; (2) resolve Garlick Avenue original structure vs similarly named later project; (3) screen the book chronology for further Singapore works; (4) only then declare a closed KHA census. Do not substitute random geocoded points or publicize assumed access to private homes.
