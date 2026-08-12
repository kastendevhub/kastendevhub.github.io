# Review summary — Veeam Kasten Fundamentals course (v1 → v3)

**For:** the human reviewer. **Current build:** v3, in the six HTML files in this folder — open `index.html` to take the course. Every version, row, and disposition is on disk (see the audit-trail list in `README.md`).

## The run at a glance

| Stage | Who | Output |
|---|---|---|
| v1 draft | LXD (6 parallel authoring turns) | 5 lessons + landing page, grounded in the Kasten 9.0.2 docs mirror; all gates clean |
| Round 1 (on v1) | Editor, Kasten Architect, Senior Kasten SE, Kasten Systems Architect | **52 rows** (3 critical) + 4 critiques |
| v2 | LXD (6 revision turns + reconciliation) | all 52 rows dispositioned — none silently dropped |
| Round 2 (on v2) | Kasten Backup Admin, Kasten Director, Kasten VDP Implementer | **29 rows** (5 critical) + **three four-part reflections** |
| v3 | LXD (5 revision turns + reconciliation) | all 29 rows dispositioned; 2 deliberate `[VERIFY]` markers ship |

**Final gates:** lint-voice 0 errors across all six files · smoke-test pass · 215 quoted commands/strings machine-verified verbatim against the 9.0.2 corpus · 446 claims extracted at v3 · naming standard clean (no "Kasten K10"/"Kasten by Veeam"; "K10" only inside verbatim CLI).

## What each reviewer drove

**Editor (26 rows — largest set).** Cross-lesson coherence after parallel drafting: standardized compliance-state terminology on the source's "SLAs" wording across three lessons; added Lesson 02's missing prerequisites panel; fixed a circular "Removed means removed" definition; retargeted a duplicated quiz question onto the untested editions objective — which took Lesson 04's knowledge check to six questions (index updated to match); numeral/style cleanups.

**Kasten Architect (14 rows, 1 critical).** Source-accuracy work: adjudicated all 17 uncited v1 claims — the KDR retention list re-anchored to the p.585 warning that actually states it, the upgrade primer's `gcr.io` internet dependency named (so air-gapped readers pick the route that works), Kubernetes version-sequencing advice grounded on the support matrix and release notes instead of asserted. Notably, one Editor proposal was *reversed* by the source: the row asked for "SLOs," the cited page says "SLAs," and the LXD applied the source's term — the grounding discipline working as designed.

**Senior Kasten SE (7 rows).** Value framing: "so what" lines where capabilities were shown without their payoff — snapshot-vs-export as a differentiator, not just a mechanic.

**Kasten Systems Architect (5 rows).** Terminology precision and analogy-safety from the expert side; no wrong-mental-model criticals survived to v2.

**Kasten VDP Implementer (13 rows, 2 critical — the new persona earning its place).** Lesson 03 rebuilt as a real runbook: prerequisites surfaced before the steps that need them, expected outputs and failure guidance added, and one honest `[VERIFY]` shipped where the docs genuinely don't say whether a failed Helm install can simply be re-run (queued for SME resolution in `DEFERRED.md`).

**Kasten Director (11 rows, 3 critical).** The accountability lens: "who can delete backups" and "who did it" moved from unanswered to cited answers (published role definitions; Kubernetes auditing and attribution, including its documented limits); immutability surfaced as the standing production choice rather than a KDR-corner detail; a deliberate ownership prompt added to the multi-tenancy hand-off. One narrowed `[VERIFY]` marks a genuine 9.0.2 documentation self-contradiction on roles.

**Kasten Backup Admin (5 rows, 0 critical).** The comprehension floor held after Round 1 — its reflection (`feedback-learner-kasten-backup-admin-v2.md`) reads as a learner who made it through; remaining rows were parallel-polish.

## Worth reading directly

The three Round-2 reflections are the richest artifacts of the run — first-person "what landed / where I got stuck / what I'd still need" from the course's three real audiences:
`feedback-learner-kasten-backup-admin-v2.md` · `feedback-learner-kasten-director-v2.md` · `feedback-learner-kasten-vdp-admin-v2.md`

## Open items (also in DEFERRED.md)

1. `[VERIFY]` Lesson 03 — failed-install retry path (undocumented in 9.0.2; needs SME).
2. `[VERIFY]` Lesson 05 — a 9.0.2 docs self-contradiction on a role capability.
3. Two optional cross-references to Lesson 05's new audit passage (polish, next round).
