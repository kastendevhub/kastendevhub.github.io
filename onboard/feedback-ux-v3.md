# UX designer — v3 (Step 7, rendered-page safety net)

**Reviewer:** Brand Experience Designer (UX/UI) · **Scope this pass:** propose-only — no course
file was edited. **Course:** Veeam Kasten for Kubernetes Fundamentals (index + Lesson01–Lesson05).
**Rows:** `review-rows-ux.json` — 18 rows (0 critical · 11 significant · 7 minor).

## How this was reviewed

Headless Chromium via Playwright, `file://`, fresh browser context per page (no storage, no
service worker) so every load is a true first visit.

1. **Virgin first-visit state** at 1440×900 — count visible `[data-continue]` gates, check for
   stacked gates, hidden-content-behind-gate, and a blank first viewport.
2. **Full reveal** — click every Continue gate (real mouse clicks for the focus checks,
   programmatic clicks for the sweep), settle the smooth scroll, then full-page screenshot.
3. **Geometry sweep on the revealed page** — `document.scrollWidth` vs viewport, content blocks
   under 300px, images at 0 height / overflowing their container / broken, text clipped by
   `overflow:hidden`, `<li>` outside `OL`/`UL`, console errors, failed requests.
4. **Adjacent-sibling gap histogram** inside every `.wrap` (rhythm), **measure histogram** for
   every visible paragraph (line length), and a **WCAG 2.1 contrast sweep** computing every text
   node's effective composited background.
5. **390×844 mobile** — virgin state and one reveal per page, with a scroll-settle guard.
6. **Cross-page comparison** — class census, hero geometry, `.hero__meta` contents, eyebrow
   patterns, recap tails and `.lesson-nav` on all five lessons side by side.

Screenshots are in `smoke/`, prefixed `ux-`: `ux-<page>-virgin-desktop.png`,
`ux-<page>-reveal1-desktop.png`, `ux-<page>-revealed-desktop.png` (full page), the matching
`-mobile` set, plus `ux-<page>-recap.png`, `ux-<page>-tail.png`, `ux-L3-prose-measure.png`,
`ux-L1-check.png`, `ux-L1-recap-head.png`.

## The render defect this pass was asked about

**Clean on all five lessons.** Exactly **one visible Continue gate per lesson** in the virgin
state, nothing stacked, no content hidden underneath a gate, no blank viewport:

| Page | Gates total | Visible in virgin state | Stacked pairs | Locked-but-visible | Reveal rounds to full |
|---|---|---|---|---|---|
| index | 0 | 0 | 0 | 0 | n/a |
| L1 | 6 | 1 | 0 | 0 | 6 |
| L2 | 10 | 1 | 0 | 0 | 10 |
| L3 | 7 | 1 | 0 | 0 | 7 |
| L4 | 6 | 1 | 0 | 0 | 6 |
| L5 | 6 | 1 | 0 | 0 | 6 |

Each reveal round unlocked exactly one gate, and every page reached full reveal with zero gates
left and zero `.continue__locked` blocks unrevealed. **Zero console errors and zero failed
requests** on all six pages at both widths.

Two things I chased and cleared as **non-findings**, recorded so nobody re-opens them:

- **White bands / torn content in early mobile captures.** My first mobile pass screenshotted
  220 ms after the click, mid `scrollIntoView({behavior:'smooth'})`, and caught unpainted
  compositor regions. With a scroll-settle guard the same states render clean — see the current
  `ux-L5-reveal1-mobile.png`. Capture artefact, not a page defect.
- **11 zero-height `<svg>` per lesson and one 0×0 `<img>`.** The SVGs are icons inside inactive
  `.tabs__panel`s; the image is the empty `#lightbox` placeholder. Both expected.

## Verdict per page

| Page | Virgin state | Revealed state | Mobile 390px | Notes |
|---|---|---|---|---|
| **index** | OK | OK | OK | Hero, topics grid and module cards all hold. Only finding is `.module-card__num` at 2.72:1 (large-text threshold 3:1) — marginal, not rowed. |
| **L1** | **OK** | OK | OK | Cleanest of the five: fewest over-wide paragraphs (9), fewest zero-gap headings (2), correct long-title step-down. Carries the `.callout strong` contrast bug (UX-v3-005) and the 4+1 orphan recap row (UX-v3-008). |
| **L2** | **OK** | Significant issues | OK | Hero-only first chunk (UX-v3-015). Recap ends with a green primary button plus a **blue link at 2.83:1 on black** (UX-v3-004) and duplicates the next-module CTA a screen above `.lesson-nav` (UX-v3-009). Seven consecutive "CONCEPT · NN" eyebrows (UX-v3-011); `.lesson-nav` labels off-pattern (UX-v3-018). |
| **L3** | **OK but visually broken hero** | Significant issues | OK | The one page whose hero fails: 96px title wraps to five lines, `align-items:center` floats the objectives card 700px down, ~510px void beside the headline, hero 1884px tall (UX-v3-001). Worst prose measure in the course — 54 paragraphs at 1080px ≈ 135 chars (UX-v3-002). Eyebrows promise "SECTION N OF 6" then number 08 (UX-v3-011). `.widget__reveal` at 2.72:1 (UX-v3-006). |
| **L4** | **OK** | Significant issues | **BAD — page scrolls sideways** | One inline `<code>` PromQL query (515px, no break opportunity, no scroll ancestor) pushes `scrollWidth` to 547px at a 390px viewport, so the whole lesson scrolls horizontally (UX-v3-007). Also the only page that overrides `.review-grid` to two columns, so its recap is structurally unlike its four siblings (UX-v3-008). |
| **L5** | **OK** | Significant issues | OK | Zero contrast failures — the best-behaved page on colour. But the worst rhythm: **11 subsection headings with 0px above them** (UX-v3-003), 22 paragraphs at 1080px, and the longest first chunk in the course (6216px desktop / 22561px mobile ≈ 27 mobile screens before the first gate, UX-v3-015). Hero column split drifts 39px from its siblings (UX-v3-017). |

**Mobile verdict overall: 5 of 6 pages OK, L4 BAD** (horizontal page scroll). Everything else
holds at 390px — no clipped text, no narrow blocks, no overflowing images, tables and code blocks
all scroll inside their own containers as designed. The one systemic mobile cost is the sticky
breadcrumb at 101px, 12% of the viewport, on every lesson (UX-v3-013).

## What the render told me that the source could not

- **Line length.** The markup looks fine; the rendered measure is 135–150 characters per line
  across all five lessons, because `.wrap` is 1080px and body prose is never capped. The same
  column also renders `.lede` at 640px, `.prose p` at 720px and figures at 818px — four measures,
  no shared right edge (`ux-L3-prose-measure.png`). This is the highest-impact single fix in the
  set (UX-v3-002).
- **Zero-gap headings.** No stylesheet says "0px above h3". It happens because components
  (`.note`, `.stepper`, `.flow`, `.widget`, `figure`) carry no bottom margin and `h3` carries no
  top margin — 11 occurrences on L5, 5 on L3. Only a geometry sweep sees it (UX-v3-003).
- **Contrast, computed not guessed.** Three measured AA failures, all on tokens the kit already
  documents correctly: `.callout strong` at **2.08:1** (course.css line 82 literally says "never
  use `--warn`" for text), `.widget__reveal` at **2.72:1** (the kit's own `.btn--primary` gets
  this right on the same green), and L2's recap link at **2.83:1**.
- **The keyboard-only artefact.** `components.js` focuses the revealed section's heading, and that
  heading is not in the focus-visible list, so keyboard learners get Chromium's default white ring
  around a 1080px-wide heading 6–10 times per lesson. Mouse users see nothing — I verified with
  real mouse clicks (`ux-L1-recap-head.png` shows the ring, `ux-L1-recap-head-realmouse.png` shows
  it absent). Easy to mistake for a rendering fault (UX-v3-012).

## Cross-page consistency (five parallel authors, one kit)

The kit held better than I expected — `.flow`, `.compare`, `.data-table`, `.code-block`,
`.check-section`, `.review`, `.lesson-nav`, `.breadcrumb` and the progress rail are present and
identical on all five lessons, and the module `<style>` blocks are small, commented and properly
scoped (one inline style attribute per page, and it is the JS-driven progress bar). Where the
pages diverge visibly:

1. **`.hero__meta`** — four different item orders and two duration formats; L1 has no time
   estimate at all (UX-v3-010).
2. **Section eyebrows** — L3's "SECTION N OF 6" against everyone else's "TOPIC · NN", and it
   contradicts itself by section 07 (UX-v3-011).
3. **Recap grid** — 4×258px on four pages, 2×532px on L4 (UX-v3-008).
4. **Recap tail** — a lede sentence, a two-button row, or a full-width next button, depending on
   the page (UX-v3-009).
5. **Caution asides** — `.callout` and `.note--caution` both in use, on the same pages, doing the
   same job with different visual languages (UX-v3-014).
6. **Hero title size** — 62px on L1, 96px on the four others, including the one page that needed
   the step-down more than L1 did (UX-v3-016).
7. **First-gate pacing** — hero-only on L2 versus 4800px of content on L5 (UX-v3-015).

## Ship call

**Ship with fixes — do not ship as-is.** Nothing here makes a page unusable and the gate
mechanism (the reason this pass exists) is clean on all five lessons, so there is no critical row.
But there is one responsive break and three measured WCAG AA failures, and those are not
polish items:

- **Must fix before ship (5 rows):** UX-v3-007 (L4 horizontal page scroll at mobile),
  UX-v3-004, UX-v3-005, UX-v3-006 (the three AA contrast failures), UX-v3-001 (L3's broken hero —
  the first thing a learner sees on module 03).
- **Should fix in the same pass (6 rows, all cheap and mostly one-line in `course.css`):**
  UX-v3-002 (measure), UX-v3-003 (heading rhythm), UX-v3-008, UX-v3-009, UX-v3-010, UX-v3-011.
- **Nice to have (7 minor rows):** UX-v3-012 through UX-v3-018.

Nine of the eighteen rows are single-declaration changes in `course.css` and fix all five lessons
at once. If the human accepts only the "must fix" and the `course.css` half of the "should fix",
the course ships visually sound.

## Handoff notes

- I did **not** edit `course.css`, `components.css` or any lesson file this pass, per the
  propose-only scope override — every recommendation is a row for the human to decide.
- Rows UX-v3-010, UX-v3-011, UX-v3-015 and UX-v3-018 change rendered **wording** (meta labels,
  eyebrow text, gate labels, nav card titles). They are presentation patterns, but the text edits
  belong to the LXD.
- UX-v3-015's gate *placement* is partly a pedagogy call — worth a second opinion from the LXD
  before moving L3's and L5's first gates.
- After any accepted `course.css` change, re-run the render pass: the measure cap (UX-v3-002) and
  the heading margin (UX-v3-003) both change page heights, which shifts gate positions and the
  progress-rail geometry. Verify rendered geometry, not just that the CSS is present.
- Front-End Engineer: UX-v3-007's guard (`code { overflow-wrap: anywhere; }`) and UX-v3-017's
  `minmax(0, …)` track fix are both in your lane too — coordinate so we don't ping-pong the same
  selectors.
