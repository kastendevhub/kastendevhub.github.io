# Kasten Architect — technical-accuracy and field-practicality review (v1)

**Course:** Veeam Kasten for Kubernetes Fundamentals — for the Veeam Data Platform Administrator
**Scope:** `index.html` + Lessons 01–05, v1 build
**Source of truth:** `Reference/Product Documents/K10/veeam_kasten_9.0.2_user_guide.pdf`
**Verdict:** technically sound — one 🔴 to clear before anyone runs a command from this course, six 🟡 that would cost a platform team rework, seven 🟢.
**Rows:** 14 — 1 critical / 6 significant / 7 minor → `review-rows-kasten-architect.json`

---

## The one that has to change

**KA-v1-001 🔴 — the VolumeSnapshotClass example cannot be applied to any supported cluster.**
Lesson 03 §5 gives the learner a copy button on a manifest whose first line is
`apiVersion: snapshot.storage.k8s.io/v1beta1`. That API group was removed from Kubernetes in
1.21. Veeam Kasten 9.0.2's own supported matrix starts at Kubernetes 1.29
(p.862). So the single most consequential artifact in the deployment module —
the object that decides whether snapshots work at all — fails with
`no matches for kind "VolumeSnapshotClass" in version "snapshot.storage.k8s.io/v1beta1"`,
in the middle of an install window, and a learner has no reason to suspect the
course rather than their cluster.

The build is faithfully quoting the guide, which still prints Alpha and Beta
examples side by side on p.102–103. That is upstream's debt, not something to
inherit: the same guide shows a live `snapshot.storage.k8s.io/v1` class carrying the
Veeam Kasten annotation on p.105. Quote that one.

---

## Significant (🟡) — would cause rework, wrong sizing, or a wrong plan

| Row | Lesson | What is wrong |
|---|---|---|
| KA-v1-002 | 03 §1 | The CSI baseline is quoted as Kubernetes v1.14.0 + the `VolumeSnapshotDataSource` feature gate (p.102) with no note that the supported matrix starts at 1.29 (p.862), where that gate no longer exists. Admins go looking for a switch that is not there. |
| KA-v1-003 | 03 §2 | The readiness checklist makes the *basic* primer run a blocking gate and leaves the CSI round trip — `csi -s ${STORAGE_CLASS}`, the check that actually snapshots a volume, provisions a new one from it and validates the data (p.102) — as a Pro tip. The drivers that pass the cheap check and fail the round trip are exactly the ones that ruin a first backup window. |
| KA-v1-004 | 05 §4 | `k10-admin` is taught as the whole administrator grant. It is not: administrators *also* need the `k10-ns-admin` Role for Secret and ConfigMap access in the install namespace (p.267–268). Follow this section literally and your "administrator" fails the first operation that touches a Secret. |
| KA-v1-005 | 05 §2 | "Virtual machines can only be restored into a new namespace" is stated flatly. On p.417 that sentence sits inside the PVC/DataVolume **renaming** discussion; the VM restore section (p.544–545) describes the workflow as similar to any other application. As written it tells an OpenShift Virtualization team their in-place VM recovery does not exist. |
| KA-v1-006 | 03 §6 | The Veeam Repository route omits the fact that decides its cost: incremental acceleration exists only for Azure Disk, CephRBD and vSphere CSI; without it **each export reads the entire source volume** (p.129). A VDP admin will price the window from an incremental-forever mental model and be wrong by the size of the volume, every run. |
| KA-v1-007 | 03 §4 | "The four authentication modes" (p.208) is the install-time picker, not the surface. Active Directory/LDAP (p.250) and OpenShift OAuth (p.237) are documented modes. The first question a VDP admin asks about any console is whether it does AD; this section reads as "no". |

---

## Minor (🟢)

- **KA-v1-008** — the primer sample output is cited to p.871 alone; three of its four verdicts are on p.872. The sample is also a 2020-vintage cluster (v1.17.13, `v1alpha1` group), which will not match anything a learner sees.
- **KA-v1-009** — the KDR "three things to arrange in advance" is cited to p.571; the guide's actual warning list (source Cluster ID / passphrase or secret-manager details / location profile details **and credential**) is on p.585, and its wording is stronger than the paraphrase.
- **KA-v1-010** — `k10tools primer upgrade` requires internet access to `gcr.io` (p.872). Half the estates this course targets are egress-restricted; the dashboard route still works and the module should say so.
- **KA-v1-011** — Lesson 02 points at "Lesson 04" for the policy decision; policies are built in Module 05.
- **KA-v1-012** — the upgrade-sequencing Pro tip is the only one of the 17 uncited extractions carrying operational advice; the facts under it are already cited elsewhere (p.861–862, p.1098–1099), so ground it in place.
- **KA-v1-013** — Lesson 02 attributes the snapshot round trip to "the pre-flight check"; it belongs to the CSI invocation with a StorageClass (p.102 vs p.7). This is the belief that lets an unverified driver through the Lesson 03 gate.
- **KA-v1-014** — the install section quotes the guide's example distribution list, "Rancher, PKS, and OKD (OpenShift Origin)" (p.99). Those are retired brand names; the supported-version matrix is the answer a learner needs anyway.

---

## The 17 uncited claims — adjudicated

Sixteen of the seventeen are not claims: section chips, learning objectives, widget
and code-block labels, accordion step titles, recap bullets, scenario prompts, and
the RBAC analogy paragraph in Lesson 05 §4 (whose product facts are cited in the
sentence before it). Two more sit inside verbatim quoted output or a table header
row. None needs a citation.

The exception is Lesson 04's upgrade-sequencing Pro tip (**KA-v1-012**): real
operational advice, correct, and resting on facts the module has already cited two
sections earlier. That one should carry its citation. Verdict on the extractor's
17: **16 acceptable, 1 to ground.**

---

## What is already solid — keep it

- **The snapshot-versus-export spine.** Four lessons hit it and none of them fudge
  it. Lesson 01 §3's "a policy with the snapshot action alone will report success
  indefinitely… the check is structural, not operational" is the sentence that
  saves a customer's data, and the p.350 nuance about public-cloud snapshots living
  in object storage stops it becoming dogma. Better than most vendor material on
  this point.
- **Citation discipline generally.** I sampled ~45 `[Src: … p.N]` markers across
  all five lessons and pulled the pages. The install commands, the Helm flags
  (`--set global.persistence.storageClass`, `--set auth.basicAuth.htpasswd`,
  `logging.retention.rotateCount=12 / maxFileSize=2G`), the pod-status excerpt, the
  PromQL, the primer upgrade sequence with `--version=4.5.6`, the Prometheus 8Gi/30d
  defaults, the GC Helm options, the Kubernetes/OpenShift matrix rows, the whole
  `overwriteExisting` table, the FRS constraints and the 30-minute session expiry,
  the four built-in roles and their binding types, and every Veeam Backup &
  Replication constraint (p.127–130) are verbatim-correct on the pages named. Two
  citations drift by a page (KA-v1-008, KA-v1-009). That is a very low error rate
  for 404 extracted claims.
- **The Veeam Backup & Replication section (Lesson 01 §5).** Block mode mandatory,
  no direct-object-storage repositories, one backup server per instance, downstream
  copies not restorable, one object per export, synthetic full, `K10ManualBackup`
  VeeamZIP for manual exports — all correct, and "decide deliberately which copy
  your Kubernetes recovery plan depends on, and write it down" is the right advice.
  It only needs the incremental-acceleration fact (KA-v1-006).
- **KDR taught as a first-class subject.** Most Kubernetes protection material never
  asks who protects the catalog. This one gives it a section, the mode table
  matches p.566–570 including Legacy DR's deprecation, and it names the
  Veeam-Repository-not-allowed-as-a-KDR-destination trap (p.572) that people hit in
  real designs.
- **Analogies retired out loud.** Lesson 01's five-row map and Lesson 02's "analogy
  contract" are the right pattern, and I could not find one that builds a false
  model: the policy-membership-is-an-evaluated-selection warning, "you do not place
  these" for in-cluster services, application-aware-processing → Kanister with the
  "silently ignored" hook-name trap, and the location-profile-is-not-a-folder
  warning are all accurate and all land where a VDP habit would otherwise bite.
- **Product naming.** Zero occurrences of "Kasten K10" or "Kasten by Veeam". `K10`
  appears twice: inside the verbatim `K10ManualBackup` job name and in Lesson 02's
  deliberate explanation of why the annotation key says `k10`. The chart/release/
  namespace strings stay lowercase and verbatim throughout. This is the cleanest
  naming pass I have reviewed.

## Field observations I did not raise as rows

Not in the 9.0.2 guide, so not accuracy verdicts — recommend SME confirmation before
they go into the material:

- Nothing in Lesson 03 tells the learner to confirm the external **snapshot-controller
  and VolumeSnapshot CRDs** are present. Most distributions ship them; some
  self-managed clusters do not, and the failure looks like a driver problem.
- p.100 carries a **Cilium CNI** note ("refer to the distribution's specific
  documentation") that the module drops. It is a one-line callout in the guide and a
  recurring support theme in the field.
- The **image captions' page anchors** (three different KDR screens all cited p.565,
  three profile screens all cited p.102) come from the extractor's section-start
  anchoring, not the figure's own page. Systemic to the build, not a per-lesson
  defect — but if a learner follows one of those citations they will not find the
  screen. Worth a pipeline decision rather than 11 rows.

---
*Reviewed against `veeam_kasten_9.0.2_user_guide.pdf` only. No build file was
modified. No other reviewer's rows or feedback were read.*
