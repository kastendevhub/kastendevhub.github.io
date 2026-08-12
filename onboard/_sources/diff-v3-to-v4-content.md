# diff v3 → v4 — content wave (Wave 1)

**Persona:** Persona 1 — Senior Learning Experience Designer (LXD)
**Date:** 2026-08-06
**Input rows:** `review-rows-kasten-architect-v3.json` — 9 rows (KA-v3-001…009), all human-approved for application
**Scope:** content only. A visual/CSS wave runs after this one; no CSS, no `index.html`, no gate markup, no Continue-gate logic, no section restructuring was touched.
**Files touched:** `Lesson02_Kubernetes_Foundations_for_Backup_Admins.html`, `Lesson03_Deploying_and_Configuring_Veeam_Kasten.html`, `Lesson05_Restores_and_Day_to_Day_Administration.html`

**Disposition totals: 8 APPLIED verbatim / 1 ADJUSTED / 0 declined / 0 impossible-as-grounded.**

---

## Per-row disposition

| Row | Sev | File · location | Disposition |
|---|---|---|---|
| KA-v3-001 | significant | Lesson03 · §1 Prerequisites, version-context paragraph | **APPLIED** verbatim |
| KA-v3-002 | significant | Lesson03 · §2 readiness checklist, blocking item `rdy2` | **APPLIED** verbatim |
| KA-v3-003 | minor | Lesson03 · §5 VolumeSnapshotClass caption | **APPLIED** verbatim |
| KA-v3-004 | significant | Lesson05 · roles table, `k10-basic` "What it allows" ([VERIFY] a) | **ADJUSTED** — see below |
| KA-v3-005 | significant | Lesson03 · §3 "Before you tear it down", 2nd paragraph ([VERIFY] b) | **APPLIED** verbatim |
| KA-v3-006 | significant | Lesson03 · §6 "Five things to know…", first list item | **APPLIED** verbatim |
| KA-v3-007 | minor | Lesson03 · §6 immutability-toggle paragraph | **APPLIED** verbatim |
| KA-v3-008 | minor | Lesson02 · Concept 06 VolumeSnapshots, three-requirements paragraph | **APPLIED** verbatim |
| KA-v3-009 | minor | Lesson05 · "Where the boundaries land in practice", 1st paragraph | **APPLIED** verbatim |

### The single adjustment — KA-v3-004

**What changed vs the proposal.** The proposal's phrasing was `the published <code>k10-basic</code> ClusterRole carries <code>verbs: '*'</code> on the action resources…`. Applied instead as:

> the published `k10-basic` ClusterRole sets `verbs:` to `'*'` — every verb — on the action resources, on `restorepoints` and `applications`, on `policies`, and on `filerecoverysessions` [Src: Kasten Docs 9.0.2 p.273, p.274]

**Why.** The string `verbs: '*'` does not exist verbatim anywhere in the source. In the published manifest on p.273–274 the key and the value are on separate YAML lines:

```
     verbs:
     - '*'
```

A single `<code>verbs: '*'</code>` span would therefore be a paraphrase of a technical string presented as a quote — it fails the quote-don't-paraphrase rule and it fails `verify-quotes.py`. Splitting it into two verbatim spans (`verbs:` and `'*'`) with the plain-English gloss "every verb" keeps both quotes literal and keeps the sentence readable. **The row's intent is fully preserved:** all-verbs grant, therefore delete is included, therefore the tenant blast radius is what the row says it is. Everything else in the proposal — the p.264 RBAC-governs framing, the resource list, "All verbs includes `delete`", the blast-radius instruction, the immutable-profile-not-the-role advice — is verbatim as proposed.

Two field notes the Architect deliberately kept out of the proposal (dashboard delete controls may not exist for every object; the 8.5.x note that basic users need specific permission to view each action type in the dashboard) were likewise **not** added — they are not 9.0.2-guide claims, and the row asks for SME confirmation on that half.

---

## [VERIFY] resolution status

**(a) Lesson05 `k10-basic` roles question — RESOLVED, marker removed.**
The shipped marker asked whether a `k10-basic` holder can delete a restore point or a policy. It is gone from the build. The cell now answers the question with citations: RBAC is Kubernetes ClusterRoles and Bindings [p.264], and the published ClusterRole grants all verbs on the action resources, `restorepoints`/`applications`, `policies`, and `filerecoverysessions` [p.273, p.274] — so yes, a bound holder can delete both. The p.272 prose list is framed as a summary, not a limit. Verified in the text cache: p.264 carries "For facilitating role-based access for users, Veeam Kasten leverages Kubernetes ClusterRoles and Bindings."; p.273 opens the `K10-Basic ClusterRole` manifest; p.274 carries the four `verbs:` / `- '*'` blocks over exactly those resource groups plus `get` on `namespaces`. Lesson05 `[VERIFY]` count: **1 → 0**.

**(b) Lesson03 install-retry question — PARTIALLY RESOLVED, marker narrowed exactly as proposed.**
The shipped marker claimed the 9.0.2 guide does not address the subject at all. That was too strong and is now corrected: the guide does publish reinstall-on-same-cluster cleanup — "When reinstalling Veeam Kasten on the same cluster, it is important to clean up the namespace in which Veeam Kasten was previously installed" with `kubectl delete namespace kasten-io` [p.605] — the DR workflow opens with the same instruction [p.503], and read with the uninstall page [p.865] that yields a documented order (helm uninstall first, then remove the namespace if it survives, then install again). The remaining marker is narrowed to the genuinely undocumented edge case only: whether a bare `helm install` re-run **without** that cleanup is safe after a *failed* install specifically, Kasten SME to confirm. Lesson03 `[VERIFY]` count: **1 → 1** (same count, different and much narrower question).

No new `[VERIFY]` markers were introduced. Course-wide `[VERIFY]` total across the three touched files: **2 → 1**.

---

## Net-change summary

| File | Lines | Words | [VERIFY] | Continue gates | Rail dots |
|---|---|---|---|---|---|
| Lesson02 | 827 → 827 (+0) | 6,029 → 6,100 (**+71**) | 0 → 0 | 10 → 10 | 11 → 11 |
| Lesson03 | 1,207 → 1,207 (+0) | 10,240 → 10,643 (**+403**) | 1 → 1 | 7 → 7 | 9 → 9 |
| Lesson05 | 874 → 874 (+0) | 11,438 → 11,532 (**+94**) | 1 → 0 | 6 → 6 | 8 → 8 |

Net **+568 words, 0 lines**. Every edit is an in-place replacement inside an existing `<p>`, `<li>`, `<label>` or `<td>` — no element added or removed, so structure, gate count, rail-dot count and knowledge-check counts are all unchanged, and the CSS wave inherits the same DOM it reviewed.

New citations introduced (all verified against `.text-cache-veeam_kasten_9.0.2_user_guide.txt`, page = 1 + count of `\f` before hit): **p.862** (support matrix — Lesson02 and Lesson03), **p.605** and **p.503** and **p.865** (reinstall cleanup / uninstall — Lesson03), **p.127** and **p.129** (block-mode-capable provisioner — Lesson03), **p.341** (immutability's GSB/shareable-volume exception — Lesson03, second use on the same page), **p.264** and **p.273** (RBAC governance and the `k10-basic` manifest — Lesson05). One citation was **removed**: the old Lesson03 §1 and `rdy2` claim that supported versions "begin at Kubernetes 1.29" — the p.862 anchor stays, the wrong reading of it is gone.

Naming clean on all three files: 0 × "Kasten K10", 0 × "Kasten by Veeam", no bare "K10" outside verbatim technical strings (`k10-basic`, `k10-admin`, `k10-config-view`, `helm uninstall k10 --namespace=kasten-io`, `k10:admins`, `K10ManualBackup`).

---

## Gates — all clean on all three touched files

| File | `lint-voice.py` | `smoke-test-html.py` | `verify-quotes.py --product K10` |
|---|---|---|---|
| Lesson02 | exit 0 (advisories only, all pre-existing) | exit 0 · **headless-ok**, screenshot written | exit 0 · **17/17** verbatim |
| Lesson03 | exit 0 (advisories only, all pre-existing) | exit 0 · **headless-ok**, screenshot written | exit 0 · **95/95** verbatim (94 at v3) |
| Lesson05 | exit 0 (advisories only, all pre-existing) | exit 0 · **headless-ok**, screenshot written | exit 0 · **40/40** verbatim (37 at v3) |

Render checks ran for real this time (Playwright installed) — each lesson reports `[headless-ok] headless render clean` with a screenshot in `smoke/`. The only smoke-test remarks are the pre-existing green `component-missing` notes for brand-chrome components this course never used (`sticky-rail`, `process-flow`, `wizard`).

---

## Handoff to the visual/CSS wave

- Three prose blocks grew materially and are the ones to re-measure for the prose-measure and zero-gap-heading rows in `review-rows-ux.json`: Lesson03 §3's "Before you tear it down" paragraph (now the longest single paragraph in that callout), Lesson03 §6's first list item, and Lesson05's `k10-basic` table cell (now the tallest cell in that table — worth a look at 390px, where it is the row most likely to force a wide `<td>`).
- Lesson03's `rdy2` blocking-checklist label is longer and its `<strong>` lead-in is now two clauses. The widget's item count, blocking count and dynamic verdict were **not** touched — still 9 items, 6 blocking.
- Nothing in this wave changed a class, an id, an attribute or an element. Any layout delta the CSS wave sees is text reflow only.
