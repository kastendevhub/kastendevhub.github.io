# Kasten Architect — final safety pass on v3

**Course:** Veeam Kasten for Kubernetes Fundamentals — for the Veeam Data Platform Administrator
**Build reviewed:** v3, post render-hotfix — `index.html`, Lessons 01–05
**Source of record:** `Reference/Product Documents/K10/veeam_kasten_9.0.2_user_guide.pdf` (1,156 pages) via its text cache
**Rows:** `review-rows-kasten-architect-v3.json` — 9 rows · 0 critical · 5 significant · 4 minor
**Ship call:** **Ship after KA-v3-001, -002, -004, -005 and -006. Nothing here blocks the course as a whole.**

---

## What I did

I read the five lessons end to end and pulled every `[Src: p.N]` I could reasonably doubt back to the
page it names. That was on the order of eighty citations, weighted onto the material the brief flagged
as v2/v3 entrants: Lesson 03's install runbook, dashboard/auth section and location-profile section;
Lesson 04's upgrade, KDR, retention and monitoring passages plus its six-question check; Lesson 05's
role definitions and the Kubernetes-auditing/attribution note.

**The citation discipline in this build is the best I have reviewed on this pipeline.** Not "mostly
right" — I could not find a fabricated page number, and I looked hard. Spot checks that came back
exact, page and fact: the upgrade rules (p.198 — four versions, 50% free catalog storage), the catalog
schema constraint and `catalog-pv-claim` (p.1097), the two recommended alerts (p.1093), both PromQL
examples and the full action-state table (p.748), the whole KDR mode comparison and the protected-resource
matrix (p.565–570), the KDR retention list (p.585), `k10-disaster-recovery-policy` and the lowest-RPO
frequency guidance (p.587), the `KastenDR` API object (p.620), the audit note in Lesson 05 including
both stated limits and the `AuditConfig` CR (p.818, p.819, p.621), the entire `overwriteExisting`
table (p.396), the FileRecoverySession constraints and the 30-minute default (p.419–421), every field
and warning in the Veeam Repository profile walkthrough (p.335–338), and the whole Veeam-repository
considerations set (p.127–130) including the accelerated-incremental provisioner list. Lesson 04's
Kubernetes/OpenShift matrix reproduces p.862 row for row, caveats included.

Naming is clean: no "Kasten K10", no "Kasten by Veeam", correct "Veeam Kasten for Kubernetes" first
use in every file, and the only bare `K10` in the build is inside `K10ManualBackup` — a verbatim
technical string, which is exactly where it is allowed.

Two things I want to praise explicitly so nobody edits them out. First, Lesson 05's handling of the
`VirtualMachines can only be restored into a new namespace` line (p.417): the course reports it in
its actual context — a paragraph about renaming PVCs — and then tells the reader to prove it with a
test restore rather than build a runbook on it. That is how a careful architect would write it, and
my first instinct was to flag it as an over-reach until I read p.417 and found the sentence verbatim.
Second, Lesson 01's fourth row on the Veeam-repository table: copies made inside VBR (SOBR tier,
backup copy, tape) cannot be restored directly by Veeam Kasten (p.129). That is the single most
load-bearing gotcha for this audience and the course puts it in a table, a callout, and a quiz item.

## The [VERIFY] verdicts

### (a) Lesson 03 — can a failed/partial `helm install` simply be re-run? → **RESOLVABLE IN PART**

The marker as shipped says the 9.0.2 guide does not address it. That is too strong, and the part it
misses is the part a learner needs. The guide publishes a reinstall-on-the-same-cluster instruction
twice:

- p.605, a Note: *"When reinstalling Veeam Kasten on the same cluster, it is important to clean up the
  namespace in which Veeam Kasten was previously installed"*, followed by the literal
  `kubectl delete namespace kasten-io`.
- p.503, step 1 of the ransomware-recovery workflow: *"Reinstall Veeam Kasten, deleting the Veeam
  Kasten namespace if reinstalling on the same cluster."*

Put those against the uninstall page (p.865 — uninstall with Helm so non-namespaced resources are
cleaned up; simply deleting the namespace "might cause issues with stale services") and a documented
sequence falls out: `helm uninstall`, then remove the namespace if it survives, then install again.

What is genuinely undocumented is narrower than the shipped marker: whether a **bare `helm install`
re-run without that cleanup** is safe after a *failed* install specifically. **KA-v3-005** gives the
learner the documented sequence and keeps a marker on that narrower question. Keeping the broad
marker is the worse option — a team with no procedure improvises the one thing p.865 warns against.

### (b) Lesson 05 — the claimed 9.0.2 self-contradiction on a `k10-basic` capability → **RESOLVABLE; NOT A CONTRADICTION**

I went looking for a genuine conflict and did not find one. What is there is an incomplete prose
summary next to a normative role definition, plus a sentence that tells you which governs:

- p.264: *"For facilitating role-based access for users, Veeam Kasten leverages Kubernetes ClusterRoles
  and Bindings."* Authorization **is** Kubernetes RBAC.
- p.273–274, the published `k10-basic` ClusterRole: `verbs: '*'` on the action resources and their
  `/details` subresources, on `restorepoints` and `applications`, on `policies`, and on
  `filerecoverysessions`; `get` on `namespaces`.

`'*'` includes `delete`. So a `k10-basic` holder can delete restore points and policies in every
namespace the role is bound into. The p.272 list simply does not enumerate deletion and never claims
to be exhaustive; nothing anywhere in the guide denies it. **KA-v3-004** replaces the marker with
that answer and the design consequence — if you need deletion protection for a tenant namespace, it
belongs in an immutable export location profile, not in the role.

One honest boundary, kept out of the proposed text because 9.0.2 does not state it as current
behaviour: an 8.5.x release note records *"Basic users now require specific permission to view each
action type through the Veeam Kasten dashboard"* (p.1111), so dashboard reachability and API
authorization are not the same surface. The RBAC verdict needs no SME confirmation. Whether the
dashboard renders a delete control for every one of those objects does — flag it that way if anyone
asks.

## The regression the revisions introduced

One error entered at v2 and propagated to three places, and I have to own it: it came out of my own
Round-1 row KA-v1-002, where I wrote that the supported versions "begin at Kubernetes 1.29". Reading
p.862 properly this time, the matrix annotates **both** the 1.30/4.17 and 1.29/4.16 rows with
*"Kubernetes version *only* supported when deployed as an OpenShift cluster"*, and the 8.5.9 release
notes say it from the other side: *"Removed support for Kubernetes 1.30. OpenShift 4.17 clusters
continue to be supported"* (p.1099). On a certified non-OpenShift distribution the supported range
starts at **1.31**.

That shorthand now sits in Lesson 03 three times — including in a **blocking** readiness checkbox
(KA-v3-002) — while Lesson 04's own table reproduces the caveat correctly. So the course currently
tells a platform team two different things about the same page, and the version that would let an
EKS or Rancher cluster on 1.30 tick a blocking gate it does not pass is the one in the runbook.
**KA-v3-001, -002, -003** fix all three instances. This is the strongest argument I know of for
keeping a final safety pass in the cycle: two review rounds and two revisions did not catch it,
because it was introduced *by* a review round.

## The one substantive gap left

**KA-v3-006.** Lesson 03 Section 6 is the page open on the second screen while somebody fills in the
Veeam Repository dialog, and it never states the prerequisite that decides whether the route exists:
the destination applies to clusters where *"the storage provisioner for persistent volumes supports
block mode export"* (p.127), and *"only storage provisioners capable of performing block mode exports
are compatible"* (p.129). Lesson 01 has it; Lesson 01 is not the page anyone has open at that moment.
The field failure is specific: the profile validates — it only proves reachability and credentials to
the backup server — the policy saves, and every export action then fails on a provisioner that cannot
do block mode. Two sentences move that discovery from the first backup window to the design
conversation.

## Things I looked at and decided not to flag

- Lesson 04 has no in-page `next-btn` to Lesson 05, unlike Lesson 03. The footer nav link is present
  and correct, so nothing is unreachable, and this is the frontend reviewer's lane, not mine.
- The Lesson 03 readiness checklist claims "Six items are blocking; three are follow-ups" — I counted
  the checkboxes and their `data-gate` values. Six and three. Correct.
- Lesson 04's six-question check: all six stems, keys and distractor rationales trace to real pages
  (p.198, p.1097, p.763, p.568, p.365, p.862–864). I tried to break Q4 in particular — the storage
  capability in the stem maps exactly onto the p.568 recommendation for Exported Catalog Snapshot mode.
  It holds.
- The guide's NetApp ONTAP S3 minimum (9.12.1, p.316), the immutable-Veeam-Repository configuration
  pointer (p.338), and the multiple-VBR-server synchronisation warning (p.337) are all uncovered.
  Real facts, none of them load-bearing at Fundamentals depth. Omission over bloat.
- Lesson 01's cross-cluster import sentence (p.129) omits the case where a *separate* metadata profile
  was used and the target cluster needs that profile too. Genuinely marginal at this depth; I almost
  wrote it up and cut it because the identical-profile-name requirement — the part that actually breaks
  restores — is already in Lesson 03.

## Ship call

**Ship after the five significant rows.** No row in this set describes material that would actively
mislead a platform team into an unrecoverable state, which is why nothing is graded critical. But
KA-v3-002 is a blocking checklist item that is factually wrong about supported versions, and KA-v3-004
and -005 replace two shipped `[VERIFY]` markers with answers the source actually contains — a course
that ships with an unanswered "who can delete our backups" is doing less than its sources allow. The
four minor rows are consistency and hedging work; take them or leave them.

Against the bar I actually use — would I hand this to a platform team the week before their first
Kubernetes DR test — the answer is yes, with those five edits.

— Kasten Architect
