# Veeam Kasten for Kubernetes Fundamentals — for the Veeam Data Platform Administrator

A five-module self-paced HTML course that turns an experienced Veeam Data Platform administrator into a working Veeam Kasten administrator. No Kubernetes knowledge is assumed: every new concept is bridged from what a VDP admin already runs — and the course is honest about where each parallel breaks.

**Start here:** open `index.html` in a browser. Take the modules in order; each ends with a knowledge check (80%+ = move on). Progress is saved locally in your browser.

| Module | File | Covers |
|---|---|---|
| 01 | `Lesson01_From_VDP_Admin_to_Kasten_Admin.html` | Why Kubernetes data protection is a different problem; the VDP↔Veeam Kasten concept map; editions; where VBR integration fits |
| 02 | `Lesson02_Kubernetes_Foundations_for_Backup_Admins.html` | Clusters, pods, namespaces, StatefulSets, PV/PVC/StorageClass/CSI, VolumeSnapshots, Helm — through a backup admin's eyes |
| 03 | `Lesson03_Deploying_and_Configuring_Veeam_Kasten.html` | Prerequisites and pre-flight checks, Helm install, dashboard access and authentication, storage integration, first location profile |
| 04 | `Lesson04_Maintaining_Veeam_Kasten_Over_Time.html` | Upgrades and version policy, monitoring the platform itself, logs/diagnostics, DR of Veeam Kasten's own catalog, housekeeping |
| 05 | `Lesson05_Restores_and_Day_to_Day_Administration.html` | Policies and scheduling, restore paths (snapshot vs exported restore point vs cross-cluster), RBAC, the daily/weekly routine |

**Source of truth:** every factual claim carries `[Src: Kasten Docs 9.0.2 p.N]`, resolving to `Reference/Product Documents/K10/veeam_kasten_9.0.2_user_guide.pdf` (the consolidated mirror of docs.kasten.io). All 215 quoted commands/strings are machine-verified verbatim against that corpus.

## Version status

**v4 is the SHIPPED version (in the module files; human accepted 2026-08-06).** This course ran a custom two-round cycle (not the standard 8-step): LXD draft → Round-1 SME review (Editor, Kasten Architect, Senior Kasten SE, Kasten Systems Architect; 52 rows) → v2 → Round-2 audience review (Kasten Backup Admin, Kasten Director, Kasten VDP Implementer; 29 rows + three four-part reflections) → v3. After v3, a human-requested safety pass (Kasten Architect + UX rendered-page review) produced v4: both `[VERIFY]` markers resolved/narrowed from source, WCAG AA contrast fixed, mobile overflow fixed.

## Cycle artifacts (audit trail)

- `_versions/v1/`, `_versions/v2/` — frozen snapshots
- `review-rows-{editor,kasten-architect,kasten-senior-se,kasten-systems-architect}.json` + `feedback-*-v1.md` — Round 1 (on v1)
- `review-rows-{kasten-backup-admin,kasten-director,kasten-vdp-admin}.json` + `feedback-learner-*-v2.md` — Round 2 (on v2; the three audience reflections)
- `review-rows-round1-all.json`, `review-rows-round2-all.json` — merged row sets
- `diff-v1-to-v2.md`, `diff-v2-to-v3.md` — every row's disposition (nothing silently dropped)
- `CHANGELOG.md`, `DEFERRED.md`, `claims-v{1,2,3}.json`, `REVIEW-SUMMARY.md`
- `_sources/` — per-module curated source packs and per-file diff fragments

*(The `review-rows-{architect,returning,struggling,aspiring,ux,frontend}.json` and `feedback-{architect,red-team,ux,frontend,learner-returning,learner-struggling,learner-aspiring-se}*.md files are untouched scaffold placeholders from the standard 8-step cycle — this run used the custom cycle above.)*
