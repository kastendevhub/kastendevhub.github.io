# diff v3 → v4 — visual wave (Wave 2)

**Persona:** Brand Experience Designer (UX/UI) — implementation role
**Date:** 2026-08-06
**Input rows:** `review-rows-ux.json` — 18 rows (UX-v3-001…018), all human-approved for application
**Scope:** visual and structural only. No factual prose, no citations, no code-block contents, no knowledge-check logic, no Continue-gate placement. Ran **after** the content wave (`diff-v3-to-v4-content.md`), which had already edited Lessons 02/03/05 text; all `orig` anchors were re-located against the post-content-wave build.
**Files touched:** `course.css`, `Lesson01…`, `Lesson02…`, `Lesson03…`, `Lesson04…`, `Lesson05…` (6 files). `index.html`, `components.css`, `components.js` untouched.

**Disposition totals: 12 APPLIED as written / 6 ADJUSTED / 0 inapplicable-in-whole.**
One row (UX-v3-015) is **part-applied / part-inapplicable** and is counted under ADJUSTED; its gate-placement half is the only piece of any row not carried out, and it is recorded below with the reason.

---

## Per-row disposition

| Row | Sev | Target | Disposition |
|---|---|---|---|
| UX-v3-001 | significant | Lesson03 hero — 510px void beside a 5-line H1 | **ADJUSTED** — kit modifiers instead of a module-local `<style>` rule |
| UX-v3-002 | significant | course.css — running measure ~135 chars | **ADJUSTED** — 720px instead of 76ch; `.note` capped too |
| UX-v3-003 | significant | course.css — 0px above h3/h4 after a component | **APPLIED** as written |
| UX-v3-004 | significant | Lesson02 recap — blue `.btn--text` on `--ink`, 2.83:1 | **APPLIED** (removed at source per -009) + guard rule added |
| UX-v3-005 | significant | course.css — `.callout strong` `--warn` on `--warn-soft`, 2.08:1 | **ADJUSTED** — component retired (see -014), token fixed on every sibling that repeated the pattern |
| UX-v3-006 | significant | course.css — `.widget__reveal` `--paper` on green, 2.72:1 | **ADJUSTED** — extended to the two other green buttons with the same defect |
| UX-v3-007 | significant | Lesson04 — 547px `scrollWidth` at 390px | **ADJUSTED** — CSS guard applied; the markup half declined (out of scope) |
| UX-v3-008 | significant | course.css `.review-grid` + Lesson04 local patch | **APPLIED** as written |
| UX-v3-009 | significant | Lessons 02/03 — duplicate end-of-lesson CTA | **ADJUSTED** — deleted rather than replaced with new prose |
| UX-v3-010 | significant | all five `.hero__meta` — four orders, two formats | **ADJUSTED** — order and format normalised; L1's missing duration deferred to the LXD |
| UX-v3-011 | significant | Lesson03 + Lesson02 `.eyebrow` labels | **APPLIED** as written |
| UX-v3-012 | minor | course.css — unstyled focus ring on gate reveal | **APPLIED** as written |
| UX-v3-013 | minor | course.css — 101px sticky breadcrumb at 390px | **APPLIED** as written (ellipsis variant) |
| UX-v3-014 | minor | all five — `.callout` vs `.note--caution` duplication | **ADJUSTED** — green instances mapped to `.note--fact`, not `.note--caution` |
| UX-v3-015 | minor | all five — first-gate position and label | **PART-APPLIED** — label normalised; placement **inapplicable** (see below) |
| UX-v3-016 | minor | course.css + Lessons 01/03 — H1 step-down | **APPLIED** as written |
| UX-v3-017 | minor | course.css `.hero__inner` track sizing | **APPLIED** as written |
| UX-v3-018 | minor | Lesson02 `.lesson-nav` card titles | **APPLIED** as written (predicted height convergence did not occur — see below) |

---

## The adjustments, and why

### UX-v3-001 — Lesson03 hero
The row asked for the two declarations in Lesson03's module `<style>` block. Applied as **kit modifiers in course.css** instead, because the standing instruction for this pass is to prefer `course.css` over per-page overrides, and UX-v3-016 asks for the same H1 step-down as a shared class anyway. Net result is identical on the page and now reusable:

- `.hero__inner--top { align-items: start; }` (new, opt-in) — put on Lesson03's `.hero__inner`.
- `.hero h1.hero__title--long` (from -016) — put on Lesson03's H1.

**Measured:** hero `1884px → 1600px`; objectives-card top `y=700 → y=169`, level with the module tag, so the ~510px void in the upper-right quadrant is gone. The row predicted ~1150px. The residual 1600px is not the title — it is content volume: three `.hero__blurb` paragraphs plus a four-item `.prereqs` list, which no sibling has. **Deferred to the LXD:** whether Lesson03's hero needs three blurb paragraphs.

### UX-v3-002 — running measure
The row proposed `max-width: 76ch`. Measured, `76ch` computes to **734px** in ES Build Neutral — which would have left a 14px mismatch against `.prose p`'s existing 720px right edge, i.e. it would have reproduced in miniature the very defect the row was raised about ("no two right edges line up"). Applied at **720px**, the kit's existing prose measure, and `.note` capped at 720px so its icon-indented body lands on the same edge.

**Measured (1440px viewport, fully revealed):** `.wrap > p:not(.lede)`, `.prose p` and `.note__body p` now all end at **x=900** on all five lessons (51/51 on L3, 20/20 on L5, 11/11 notes on L2, and so on). Before: 1080-wide running prose against 720-wide `.prose`.

Also added under this row (consequence of -014, see below): `.note { margin-bottom: 24px; }`. Consolidating filled `.callout` panels into `.note` removed the panel edge that used to separate the aside from the paragraph after it, leaving a 0px gap. The kit already gives `.note` 24px above; it now has the same below. It collapses against an adjacent `.note` (still 24px) and loses to the 40px above an h3/h4, so nothing else moved.

### UX-v3-005 / UX-v3-014 — reconciled into one change
These two rows overlap: -005 wants `.callout strong` re-tinted to `--warn-text`, -014 wants `.callout` retired in favour of `.note--caution`. Retiring the component is the superset, so **`.callout`, `.callout strong`, `.callout.green` and `.callout.green strong` are deleted from course.css** and all **11** instances converted to `.note`. `.challenge-prompt` (unused in this course, `--warn` as a border only) is kept.

The row said convert all 11 to `.note--caution`. **Adjusted:** 4 of the 11 were `.callout green` — a *green* aside with a positive message ("Why this is good news for you", "You now have a working deployment", "The two alerts to create first", "Two questions settle almost every case"). Filing those as cautions would invert their meaning, which is a content change and not mine to make. They became **`.note--fact`**, the kit's green note. Split: **7 → `.note--caution`** (L1 ×2, L2 ×2, L4 ×3), **4 → `.note--fact`** (L2, L3, L4, L5). Body text is verbatim; the bold lead-in became `.note__label`, with a trailing full stop dropped on the five labels that carried one (an uppercase mono label ending in a period reads as a typo).

The -005 token fix was then applied to **every other rule that repeated the same documented mistake** — amber `--warn` used as a text colour: `.task__num.is-challenge` (named in the row), plus `.simoutput__warn strong`, `.simoutput__verdict.is-wrong`, and the `.text-warn` utility (a text utility that used the non-text token — the same bug by definition).

Per-page callout counts before → after: L1 2→0, L2 3→0, L3 1→0, L4 4→0, L5 1→0. `smoke-test-html.py` now emits an info-level `[component-missing] callouts` line on all five lessons; that is the expected consequence, not a regression.

### UX-v3-006 — green button label colour
Applied as written on `.widget__reveal` (`--paper` → `--ink`, matching `.btn--primary`). **Extended** to the two other buttons in the kit with the identical failure on the identical green: `.toggle-group__opt.is-active` and `.wizard__nav button.is-primary`. Leaving them would have re-created the component-consistency break the row objects to, one selector over.

Correction to the row's arithmetic: the row cites 12.6:1 for ink-on-`--veeam-green` and 15.1:1 for ink-on-`--veeam-green-bright`. The measured values are **6.94:1** and **9.74:1**. Both clear AA comfortably; the row's figures were optimistic.

### UX-v3-007 — Lesson04 horizontal scroll
Two fixes were proposed, "either sufficient — take both". **Fix 1 applied** (`code { overflow-wrap: anywhere; }`, with `.code-block code { overflow-wrap: normal; }` so preformatted blocks keep their own `overflow-x: auto`). **Fix 2 declined:** moving the PromQL query out of the sentence into a code block would edit factual prose and a code block's contents, both explicitly out of scope for this wave. The CSS guard is sufficient and measured so (numbers below).

Note the anchor moved: the content wave rewrote this paragraph, and the offending inline `<code>` is now `sum(round(increase(action_ended_total{action="restore",state="failed"}[1h])))` in `#monitor` (Lesson04 line 324), a different query from the one the row quotes. Same defect, same fix.

### UX-v3-009 — one end-of-lesson CTA
The row asks to replace Lesson02's `.btn-row` and Lesson03's `a.next-btn` with "the one-sentence lede those pages' authors already wrote". **Adjusted to a straight deletion**: both recaps *already* carry a forward-look `p.lede` (L2: "…Next you install against it."; L3: "…Module 04 takes the deployment you now have and keeps it healthy."), so writing a new sentence would have been authoring prose — the LXD's remit, not mine. Deleting leaves exactly the L1/L4/L5 pattern the row standardises on: recap lede → `.review-grid` → `.lesson-nav`. This also removes the -004 contrast failure at source.

### UX-v3-010 — hero meta row
Applied: **version chip is item 3 on all five** (was item 2 on L1), **duration is item 2 wherever a duration exists**, and L4's `35–45 min` → `~40 minutes` in the majority format. Lesson02 gained `8 sections / plus a knowledge check` in slot 1 — a count verifiable from the page's own structure (8 content sections, then the knowledge check and recap) — displacing `Concepts / no cluster needed`, which the hero blurb two paragraphs above already states ("Nothing here needs a cluster in front of you"). Descriptor sub-lines were unified on "plus a knowledge check".

**Deferred to the LXD:** Lesson01 still has no duration estimate. It is the one item in this row I cannot supply — a time estimate is a fact, not a presentation choice, and inventing one is out of bounds. L1's slot 2 therefore still holds `No cluster needed`. The order and format are otherwise consistent across all five.

### UX-v3-015 — first gate
**Label applied:** Lesson02's hero-adjacent first gate read "Start the module" against "Continue" on the other four; it now reads "Continue". **Placement inapplicable:** moving Lesson03's and Lesson05's first gate is forbidden for this wave — every `[data-continue]` must stay inside its `<section>` or the smoke test hard-fails — and the row itself routes the placement decision to the LXD as a pedagogy call. Recorded, not dropped: **the opening-chunk imbalance (L2 1716px vs L5 6216px at 1440px) is unfixed and belongs to the LXD.**

### UX-v3-018 — Lesson02 nav titles
Applied verbatim. The row's *prediction* did not hold: it expected the module-number prefix to fix Lesson02's 237px `.lesson-nav` against 209px elsewhere. Measured before and after: **237px both times.** The back-card wraps because Module 01's title is the longest in the course, not because the prefix was missing. The form is now consistent across all five pages (the row's primary ask, and the orientation the card exists to give); the 28px height difference stands as a cosmetic residual.

---

## Post-fix contrast measurements

Chromium 151, 1440×900, computed colour against the nearest opaque background. Before-values re-measured on `_versions/v3/` (they match the rows exactly).

| Row | Pair | Before | After | Where measured |
|---|---|---|---|---|
| UX-v3-004 | `.review .btn--text` on `--ink` | **2.83:1** FAIL (`#1558B0` on `#0A0E0B`, 14px) | **9.63:1** PASS (`#00D344` on `#0A0E0B`, 14px) | all five recaps |
| UX-v3-005 | `.callout strong` on `--warn-soft` | **2.08:1** FAIL (`#E89B1F` on `#FCF3DD`, 14.5px) | component retired — successors below | L1/L2/L4 |
| UX-v3-005 | `.note--caution .note__label` (the label that replaced it) | — | **6.03:1** PASS (`#8A5500` on `#FBFCF9`, 11px) | live element, all five |
| UX-v3-005 | `.simoutput__warn strong` on `--warn-soft` | 2.08:1 FAIL (same rule, same tokens) | **5.62:1** PASS (`#8A5500` on `#FCF3DD`, 13.5px) | rule-level, all five |
| UX-v3-005 | `.task__num.is-challenge` on `--warn-soft` | 2.08:1 FAIL | **5.62:1** PASS (`#8A5500` on `#FCF3DD`, 13px) | rule-level (no instance in this course) |
| UX-v3-006 | `.widget__reveal` on `--veeam-green` | **2.72:1** FAIL (`#FBFCF9` on `#00B336`, 13px) | **6.94:1** PASS (`#0A0E0B` on `#00B336`, 13px) | L3 `#preflight`, L4 `#upgrades` |
| UX-v3-006 | `.widget__reveal:hover` on `--veeam-green-bright` | 2.44:1 FAIL | **9.74:1** PASS (`#0A0E0B` on `#00D344`) | computed from tokens |

`.callout.green strong` measured **5.10:1** in v3 — already passing. Its conversion to `.note--fact` was a component-consistency move, not a contrast fix.

Two pairs are reported as **rule-level**: `.btn--text` inside `.review` (the only instance was deleted by -009, so the rule was measured by instantiating the component inside the live `.review` panel on each page) and `.task__num.is-challenge` / `.simoutput__warn strong` (`.simoutput__warn` is written by the Lesson04 planner widget at interaction time, not present at first paint). `.toggle-group__opt.is-active` could not be measured from a rendered instance — no toggle is active in the first-paint DOM — so that one is a rule change verified by inspection only.

**Every measured pair is ≥ 4.5:1. No AA text failure remains in the rendered course.**

---

## Mobile 390px — horizontal overflow

`document.documentElement.scrollWidth` at a 390×844 viewport, first paint and after clicking through every Continue gate:

| Page | v3 virgin | v3 revealed | v4 virgin | v4 revealed |
|---|---|---|---|---|
| Lesson01 | 390 | 390 | 390 | 390 |
| Lesson02 | 390 | 390 | 390 | 390 |
| Lesson03 | 390 | 390 | 390 | 390 |
| **Lesson04** | 390 | **547 BAD** | 390 | **390 OK** |
| Lesson05 | 390 | 390 | 390 | 390 |
| index | 390 | 390 | 390 | 390 |

The v3 offender is confirmed as the single inline `<code>` (515px wide, no break opportunity, no scrolling ancestor) in `#monitor`. After the fix, a full DOM sweep finds **no element on any of the six pages whose right edge exceeds the viewport without a scrolling ancestor.** The two `<code>` elements that still measure wider than 390px (L3 708px, L5 615px) sit inside `.code-block pre`, which has `overflow-x: auto` by design and does not move the page.

---

## Other measured before → after

1440px viewport:

| Metric | v3 | v4 |
|---|---|---|
| Lesson03 hero height | 1884px | **1600px** |
| Lesson03 objectives-card top | y=700 | **y=169** |
| Hero family (L1…L5) | 963 / 1346 / 1884 / 1135 / 960 | **1097 / 1346 / 1600 / 1135 / 950** |
| Objectives-card left edge (L1…L5) | 784 / 784 / 784 / 784 / **834** | **784 on all five** (UX-v3-017) |
| Hero H1 size (L1 / L3) | 62px / 96px | **74px / 74px** (one shared step-down) |
| `.review-grid` template | `minmax(240px)` ×4, **L4 patched to `repeat(2, 1fr)`** | **`minmax(320px, 1fr)` on all five** — 5 cards resolve 3 + 2, no orphan row |
| h3/h4 gap above, after a component | 0px in 18 places (L3), 19 (L5), 11 (L4), 2 (L1) | **40px everywhere** (56px where a `.lede` precedes and wins the collapse); **0 zero-gaps remain** |
| Running-prose right edge | 1080 / 720 / 640 / 818 (four measures) | **900 shared by `.wrap > p`, `.prose p`, `.note__body p`** |

390px viewport:

| Metric | v3 | v4 |
|---|---|---|
| Sticky breadcrumb height | 101px (L4 81px) | **49px on all five** — 12% of the viewport returned to content |
| `.breadcrumb__current` | wrapped to 2 lines | one line, ellipsised at 46vw (e.g. "Module 05 of 05 · Restores an…") |
| Lesson03 hero height | 2662px | **2541px** |

---

## Net change summary

**`course.css`** — 858 → 960 lines. Value edits in place: `.hero__inner` track sizing, `.review-grid` minmax, `.widget__reveal` / `.toggle-group__opt.is-active` / `.wizard__nav button.is-primary` label colour, `.task__num.is-challenge` / `.simoutput__warn strong` / `.simoutput__verdict.is-wrong` / `.text-warn` amber token. Deletions: the whole `.callout` family (4 rules). Additions: `.hero__inner--top`, `.hero h1.hero__title--long`, the gate-heading `:focus-visible` group, and a commented "v4 VISUAL PASS" block at the end carrying the running measure, the h3/h4 rhythm, the long-token guard, the `.review .btn--text` guard and the ≤760px breadcrumb rule. Every rule cites its row id.

**Per page:**

| File | What changed |
|---|---|
| Lesson01 | module `<style>`: local `.hero h1` clamp deleted (promoted to the kit); H1 gains `hero__title--long`; hero meta reordered; 2 callouts → `.note--caution` |
| Lesson02 | hero meta reordered + sections item; first-gate label → "Continue"; 7 `Concept · NN` eyebrows → topic labels; 2 callouts → `.note--caution`, 1 → `.note--fact`; recap `.btn-row` deleted; both `.lesson-nav` titles gain `Module NN ·` and title case |
| Lesson03 | `.hero__inner` gains `--top`, H1 gains `hero__title--long`; 6 `Section N of 6 · Topic` eyebrows → `Topic · NN`; 1 callout → `.note--fact`; recap `a.next-btn` deleted |
| Lesson04 | module `<style>`: local `.review-grid` patch deleted; hero meta reordered + `~40 minutes`; 3 callouts → `.note--caution`, 1 → `.note--fact` |
| Lesson05 | 1 callout → `.note--fact` (its hero meta was already the canonical order) |
| index.html | untouched — inherits the course.css changes only |

Line endings were preserved per file (LF on `course.css`/L02/L03/L04, CRLF on L01/L05), so the diffs contain only real changes: 124 changed lines in `course.css`, 38 in L01, 13 in L05, and 38–55 each in L02/L03/L04 including the content wave's own edits.

**Component vocabulary:** one component retired (`.callout`), none added. Two named modifiers added to the kit (`.hero__inner--top`, `.hero__title--long`) replacing one module-local invention. Zero new inline `style=` attributes; two module-local overrides removed (L01's H1 clamp, L04's `.review-grid`).

---

## Gates

| Gate | Result |
|---|---|
| `render_check.py` (virgin state, exactly one visible Continue gate per lesson) | **exit 0** — L1 1/6 · L2 1/10 · L3 1/7 · L4 1/6 · L5 1/6 visible/hidden gates; every `[data-continue]` still inside its `<section>` |
| `lint-voice.py` × 6 files | **exit 0** on all six. 0 errors. Warning counts unchanged from v3 except L03 +1 (`filler: just`) and L05 +1 (`vague-qualifier: typically`) — both in prose introduced by the **content wave**, not by this pass. This wave introduced **zero** new lint findings. |
| `smoke-test-html.py` × 6 files | **exit 0** on all six, `[headless-ok] headless render clean` on every page. New info-only line: `[component-missing] callouts` (expected — the component was retired). |
| Mobile 390px | no page scrolls horizontally, virgin or revealed |
| Contrast | every measured pair ≥ 4.5:1 |

**Screenshots** (all regenerated 2026-08-06): `smoke/<page>.png` × 6 full-page from `smoke-test-html.py`, plus `smoke/ux-{L1…L5,index}-v4-{virgin,revealed}-{desktop,mobile}.png` — 24 fresh images at 1440px and 390px. The v3 evidence images (`ux-*-virgin-*.png`) are deliberately left in place so the rows' cited before-shots survive.

---

## Left for the next persona

1. **Lesson01 has no duration estimate** in its hero meta (UX-v3-010). LXD call — a time figure is a fact.
2. **Opening-chunk imbalance** (UX-v3-015): L3 and L5 still put 17k–22k mobile pixels in front of the first Continue. Gate placement is an LXD/pedagogy decision and this wave is forbidden from moving gates.
3. **Lesson03's hero is still the tallest at 1600px** — three `.hero__blurb` paragraphs plus a four-item prereqs list. Content volume, not layout.
4. **Two component measures coexist by design**: running text ends at 720px, framed components (`.screenshot`, `.try-it`, `.supp`, `.task__body`) at 820px. UX-v3-002 explicitly said to leave figures alone, so this is recorded rather than changed — worth a decision next pass.
5. **Lesson02's `.lesson-nav` is 237px against 209px elsewhere** — Module 01's title is simply the longest in the course.
