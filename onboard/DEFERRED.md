# Deferred items — Kasten_SelfPaced_VDP_to_Kasten

## Resolved at v4 content wave (2026-08-06)

Both shipped `[VERIFY]` markers were adjudicated by the Kasten Architect's final safety review (`review-rows-kasten-architect-v3.json`) and the resolutions applied in the v4 content wave (`_sources/diff-v3-to-v4-content.md`).

| Item | Status | What resolved it | What remains |
|---|---|---|---|
| [VERIFY] Lesson03 "Before you tear it down": is a straight `helm install` re-run safe after a failed/partial install, or must the `kasten-io` namespace + catalog PVC be removed first? | **RESOLVED IN PART — marker narrowed, not removed** | Row KA-v3-005. The premise that the guide is silent was too strong: p.605 carries an explicit Note requiring namespace cleanup when reinstalling on the same cluster, with `kubectl delete namespace kasten-io`; the DR workflow on p.503 opens with the same instruction; the uninstall page (p.865) supplies the ordering, since Helm uninstall is what clears the non-namespaced resources. Lesson03 now teaches that documented sequence — uninstall, then remove the namespace if it survives, then install again. | **Narrowed marker still live**, and deliberately so: whether a *bare* `helm install` re-run **without** that cleanup is safe after a **failed** install specifically. The guide addresses reinstallation, never the failed-install case. Kasten SME to confirm; the catalog-PVC half of the original question is subsumed by the namespace deletion. |
| [VERIFY] Lesson05 roles passage: can a `k10-basic` holder delete a restore point or a policy? | **RESOLVED — marker removed** | Row KA-v3-004. Not a documentation self-contradiction after all: p.264 states Veeam Kasten leverages Kubernetes ClusterRoles and Bindings for role-based access, so the published ClusterRole governs, and the `k10-basic` manifest (p.273–274) sets `verbs:` to `'*'` on the action resources, on `restorepoints`/`applications`, on `policies`, and on `filerecoverysessions` — all verbs includes delete. The p.272 prose list simply never claimed to be exhaustive. Lesson05 now answers the question outright and states the tenant blast radius. | Nothing blocking. One **non-blocking SME question** carried over from the row's notes and kept out of the build: whether the dashboard surfaces a delete control for every one of those objects, given the 8.5.x note that basic users need specific permission to view each action type (p.1111) — UI reachability and API authorization are not the same surface. The RBAC answer needs no confirmation. |

## Open at v3 (2026-08-06) — custom 2-round cycle

| Item | Origin | Reason deferred | Owner / next step |
|---|---|---|---|
| Cross-references from Lesson04 (monitoring) and Lesson03 (authentication) to Lesson05's new audit-attribution passage | Lesson05 v3 diff, "recorded for the cross-file pass" | Nice-to-have polish; both target files were gate-clean at close and the links are additive, not corrective | Apply in the next revision round (or at the human review's direction) |
| One sub-part of KVA-v2-013 (see Lesson03 v3 diff fragment) | KVA-v2 round | Deferred with reason by the Lesson03 revision turn | Revisit with the SME answer to the narrowed install-retry [VERIFY] above |
| UI-reachability half of the `k10-basic` deletion question (see the resolved table above) | KA-v3-004 row notes, v4 content wave | Not a 9.0.2-guide claim — would have to be observed on a build, so it was not written into the module | Kasten SME to confirm on a current dashboard; only then does the module gain a UI sentence |
