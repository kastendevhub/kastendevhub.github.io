# Feedback — Kasten Systems Architect (cloud-native expert learner) — v1

**Reviewing:** index.html, Lesson01–05 (Veeam Kasten for Kubernetes Fundamentals — for the Veeam Data Platform Administrator)
**Lens:** terminology precision, wrong-mental-model risk in the VDP-parallel analogies, cloud-native idiom (declarative/CLI path alongside GUI), technical hygiene. Audience-calibration ("over-explains basics") is explicitly out of scope for this pass.

## Bottom line

I came in ready to find a legacy-backup product wearing a Kubernetes costume. I didn't. This is, term for term, one of the more careful pieces of Kubernetes-adjacent training I've read. I did not hit a single misused term across five lessons — Deployment vs. StatefulSet, PVC vs. PV vs. StorageClass, CSI driver vs. provisioner, VolumeSnapshot vs. VolumeSnapshotContent (correctly split into namespaced/cluster-scoped), Helm chart vs. release vs. values, ClusterRole vs. Role vs. the two binding types — all precise, all used consistently, all matched to the right scope (namespaced vs. cluster-scoped) every time I checked. The "where the analogy breaks" callouts are not decorative; they carry the actual weight (snapshot-vs-export, namespace-as-folder, proxies-vs-in-cluster-services) and every one of them is honest about where a VDP admin's instincts stop being safe.

The cloud-native idiom is respected almost everywhere: Lesson 03 is CLI/Helm-first with the dashboard explicitly deferred, the Policy object is shown as raw YAML in Lesson 05 with an explicit note that the dashboard's guardrails don't apply when you edit the CR directly, RBAC is taught as "a Kubernetes object, not a user list," and GitOps/infrastructure-as-code is named as the recommended pattern for redeploying the platform itself. That is exactly the posture I want from a course teaching backup admins to work in my world rather than around it.

Five rows, all minor/significant, none critical — because nothing here builds a wrong mental model. The gaps are gaps in reach, not errors:

1. **KSA-v1-001 (significant)** — Security Context Constraints are never mentioned, anywhere, despite the course leaning hard on OpenShift (Routes, DeploymentConfig, OAuth, OKD, OpenShift Virtualization) and making a specific hardening claim ("its security posture is a cluster concern... read-only root filesystem security context by default") in Lesson 02. SCCs are the first thing I check before I let a third-party Helm chart anywhere near an OpenShift cluster, and this is the one place the course's OpenShift-awareness runs out. Flagged as a doubt for the Kasten Architect to confirm — I don't know Veeam Kasten's actual SCC posture, only that the silence is conspicuous.
2. **KSA-v1-002 (minor)** — namespace vs. OpenShift's Project wrapper is never distinguished, again despite heavy OpenShift content.
3. **KSA-v1-003 (minor)** — Location Profiles get an explicit "or via the CRD-based Profiles API" pointer; Infrastructure Profiles, one section earlier, get none. Same course, same declarative-path discipline, one screen where it lapses.
4. **KSA-v1-004 / KSA-v1-005 (minor)** — Lesson 02 and Lesson 05 both use the short form "Veeam Kasten" in their objectives list before "Veeam Kasten for Kubernetes" ever appears on the page, which is backward per the naming standard every other lesson in the course follows correctly.

## What I'd tell my platform team

If asked "can I trust this to onboard my backup admin onto my clusters without them picking up bad habits," yes. The snapshot-is-not-a-backup distinction, the honest framing of what a namespace deletion cascades into, the refusal to let "functionally the same" (Starter vs. Enterprise) imply "supported the same," and the repeated insistence that the storage driver — not the backup product — decides what's possible: all of that is exactly what I'd want a newcomer to internalize before they touch my cluster. My only asks are the SCC gap and the small inconsistencies above.
