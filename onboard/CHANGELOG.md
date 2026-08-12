# Changelog

Per-version log of intent for this module (8-step workflow). The LXD updates
this inside every revision step (3, 6, 8). Pairs with diff-*.md: the diff is
the WHAT, this is the WHY and which reviewer/human decision drove it.

Format:

```
## vN — YYYY-MM-DD (Step N, LXD)
- <what changed> (RT-v1-003 / ED-v2-005 applied by human / …)

### Declined by human
- ED-v2-007: <human left Include? blank>
```

---

(no entries yet — first entry is logged at Step 3 when v2 is produced)

## v2 — 2026-08-06 — Round-1 SME review applied (custom cycle)

52 reviewer rows (ED 26 / KA 14 / KS 7 / KSA 5; 3 critical) applied across all six files by
per-file LXD revision turns + orchestrator reconciliation of 4 cross-file handoffs. Highlights:
Lesson04 knowledge check grew to 6 questions (objective 4 finally assessed); the 17 uncited v1
claims are now cited or corrected (KDR retention list re-anchored to p.585, upgrade primer's
gcr.io dependency named, Kubernetes version-sequencing advice grounded on p.861/862/1098/1099);
compliance-state terminology standardized on the source's "SLAs" wording; Lesson02 gained its
missing prerequisites panel. v1 snapshotted to _versions/v1/. Full row dispositions:
diff-v1-to-v2.md. Gates at close: lint-voice 0 errors, smoke-test pass, verify-quotes clean
per file.

## v3 — 2026-08-06 — Round-2 audience review applied (custom cycle) — FINAL pending human review

29 rows from the three Kasten audience personas (KBA 5 / KDO 11 / KVA 13; 5 critical) applied
across five lessons (index drew no rows). Highlights: Lesson03 gained the implementer's missing
runbook scaffolding (prerequisites surfaced, expected outputs, failure guidance) and the
Director's governance answers; Lesson05's two criticals moved "who can delete" and "who did it"
from raised questions to cited answers (role definitions + Kubernetes auditing/attribution with
its limits); Lesson04 gained the remaining accountability surfacing. Two deliberate [VERIFY]
markers ship in v3 — an undocumented install-retry path and a genuine 9.0.2 documentation
self-contradiction on roles — both queued for SME resolution. v2 snapshotted to _versions/v2/.
Full dispositions: diff-v2-to-v3.md. Gates at close: lint-voice 0 errors, smoke-test pass,
verify-quotes clean per file (215 verified quotes course-wide).

## v3 hotfix — 2026-08-06 — Continue-gate placement defect in Lessons 01 and 05

Human review caught a first-visit render failure: Lessons 01 and 05 placed all six Continue
gates BETWEEN sections instead of inside them, so every section after the first was hidden
while all six gate buttons stayed visible — a stack of Continue buttons over blank content.
(Lessons 02/03/04 used the correct in-section pattern.) Fix: 12 gates relocated to be the
last child of their preceding section; verified with a headless post-JS DOM check (all five
lessons now show exactly one visible gate on first visit) and full render-level smoke tests
(Playwright now installed; screenshots in smoke/). Root cause of escape: the review rounds
read source only, and smoke-test ran static checks (no headless browser). Pipeline hardened:
smoke-test-html.py gained a blocking continue-gate-outside-section static check (proven
against the defective v2 snapshot), and Playwright+Chromium are installed so render-level
checks run from now on.

## v4 — 2026-08-06 — Final safety reviews applied — SHIPPED

Human-approved application of all 27 rows from the two post-hotfix safety reviews. Content wave
(Kasten Architect, 9 rows): both shipped [VERIFY] markers resolved from source — the roles
question answered by the k10-basic ClusterRole grant (p.264, p.273-274; marker removed) and the
install-retry path grounded in the documented reinstall cleanup (p.605/p.503/p.865; marker
narrowed to the bare-retry edge case) — plus citation and practicality fixes in Lessons 02/03/05.
Visual wave (UX Designer, 18 rows): three WCAG AA contrast failures fixed (2.08-2.83:1 →
5.62-9.63:1 measured post-fix), Lesson04's 390px horizontal overflow eliminated (scrollWidth
547→390), Lesson03 hero void closed, cross-page rhythm/component consistency aligned. All gates
green at close: lint-voice 0 errors x6, smoke-test [headless-ok] x6 (render checks now live),
verify-quotes clean, virgin-state gate check exit 0. v3 snapshotted to _versions/v3/.
Dispositions: _sources/diff-v3-to-v4-content.md + diff-v3-to-v4-visual.md.
**v4 is the shipped version (human accepted 2026-08-06).**
