---
author: michaelcourcy
date: 2026-06-01 09:00:00 +0200
description: "How we protect IBM Maximo Application Suite on OpenShift with Veeam Kasten — from in-place restore to full disaster recovery on a different cluster."
featured: false
image: "/images/posts/2026-06-01-protecting-ibm-maximo-on-openshift-with-kasten/maximo-kasten.png"
image_caption: "Protecting IBM Maximo Application Suite on OpenShift with Veeam Kasten"
layout: post
published: true
tags: [Kasten, Maximo, OpenShift, redhat, disaster-recovery, DB2, MongoDB, IBM]
title: "Protecting IBM Maximo on OpenShift with Veeam Kasten"
---

IBM Maximo has been a leader in **Enterprise Asset Management (EAM)** for decades. If you operate physical assets at scale — utilities, oil & gas, transportation, manufacturing, facilities, aviation, healthcare — there is a good chance Maximo sits somewhere in your operations, tracking work orders, inventory, preventive maintenance, and the lifecycle of equipment that, quite literally, keeps the lights on.

As artificial intelligence became a clear differentiator, IBM leaned on its strong AI footprint (Watson, Cloud Pak for Data, and friends) to evolve Maximo into the **Maximo Application Suite (MAS)** — a modular platform where asset management meets predictive maintenance, monitoring, visual inspection, and health analytics. And when IBM acquired Red Hat, and with it OpenShift, the strategic direction became obvious: IBM ported Maximo to OpenShift and **dropped support for traditional VM-based deployments**.

That is a big deal. It means every Maximo modernization conversation is now also a Kubernetes conversation.

## IBM did an excellent job moving Maximo to OpenShift

It would be easy to be cynical about a "lift the monolith onto Kubernetes" project. But when you actually work inside a MAS deployment, what strikes you is how *deliberately cloud-native* the architecture is. IBM did not just containerize Maximo — they rebuilt it to use OpenShift the way OpenShift is meant to be used:

- **A strong, idiomatic Operator pattern.** The platform state is driven by well-typed custom resources: `ManageWorkspace`, `ManageDeployment`, and `ManageBuild` for the Manage module, and a top-level `Suite` object (`core.mas.ibm.com/Suite`) that orchestrates the global configuration of the application. The desired state of Maximo really does live in these CRs.
- **RBAC and namespace isolation by design.** Components are split across dedicated namespaces (`mas-<instance>-core`, `mas-<instance>-manage`, `db2u`, `mongoce`, `ibm-sls`…), with authorization scoped to the right personas.
- **Rebuildable by construction.** Heavy use of `BuildConfig` and `ImageStream` means images can be rebuilt rather than treated as immutable artifacts you have to carefully preserve.
- **Built-in certificate management.** TLS is handled end-to-end through cert-manager, with `ClusterIssuer`s signing internal service certs and public routes.
- **An "all-included" option.** You can run every database inside OpenShift on ODF — or any CSI-capable storage — for a fully self-contained platform.
- **Freedom of choice.** Customers can externalize attachments to S3-compatible object storage, and swap the bundled DB2U engine for an external MSSQL or MySQL if they prefer.
- **A state-of-the-art bundled database.** When you *do* use DB2U, it follows modern practices for running databases on Kubernetes: operator-driven, encryption at rest, replication. (We wrote a [dedicated DB2U blueprint](https://github.com/kastendevhub/enterprise-blueprint/tree/main/maximo/manage/db2u) to make it recoverable in a DR context.)
- **Pluggability.** Most customers start with the Manage component, but Visual Inspection, Monitor, Optimizer, Health, Predict and more can be added. CRDs plus the Operator Lifecycle Manager make the whole thing a genuinely pluggable architecture.
- **Day-2 operability with Tekton.** Deployment and upgrades are driven by OpenShift Pipelines, which makes the platform far more operable than a hand-rolled install ever would be.

In short: IBM squeezed the maximum out of OpenShift for Maximo, and they did it intelligently.

## The hard part is the paradigm shift — especially disaster recovery

Here is the honest tension. The very same architectural sophistication that makes MAS elegant is also what makes it *hard* for the people who have run Maximo for years.

Many Maximo specialists came from a world of VMs. Moving to Kubernetes is not an incremental change — it is a complete change of paradigm, and the learning curve is anything but smooth. Nowhere is this more acute than in **disaster recovery and business continuity**, where teams that were perfectly competent on VMs found themselves legitimately lost on what the right approach even looks like on Kubernetes.

This is exactly where Veeam Kasten made the difference.

A pattern we have seen repeatedly: the customers who succeeded best were the ones working with a **partner who was already literate in OpenShift**. Delivering the backup and DR solution was only half the job — the other half was helping customers genuinely understand the Kubernetes platform they now depend on for day-to-day operations. That is where great *support*, not just a great product, is decisive.

We now protect many Maximo customer instances. We remain committed to helping customers who are still early on their OpenShift journey — but we strongly encourage working alongside a partner who is comfortable on the platform.

## What we actually protect

We captured the full setup in an open [enterprise blueprint for Maximo](https://github.com/kastendevhub/enterprise-blueprint/tree/main/maximo). Rather than one monolithic backup, MAS protection is organized around its components. The blueprint today covers the three that virtually every deployment relies on:

| Component | Namespace | What we protect |
|---|---|---|
| **MAS Core** | `mas-<instance>-core` | The `Suite` CR, secrets, `JdbcCfg` resources, plus the supporting `cert-manager`, `ibm-sls` (licensing) and `grafana` namespaces |
| **MongoDB (MongoCE)** | `mongoce` | The MAS core and catalog databases, dumped via `mongodump` into a dedicated backup PVC that Kasten snapshots |
| **Manage** | `mas-<instance>-manage` + `db2u` | The Manage workspace state and encryption keys, and the DB2 application database |

A few details worth calling out, because they show how much the design has to *respect* the operator model:

- **`CertificateRequest` objects are excluded** from every policy. They are ephemeral — created by cert-manager to fulfill a `Certificate` and then garbage-collected — and their admission webhook rejects the `PUT` that a restore would issue. Backing them up only creates restore failures.
- **DB2U backups are application-consistent.** A Kanister pre-hook runs an online `db2 backup db BLUDB … include logs` inside the engine pod and copies the **encryption master key** alongside the backup image, so the matched pair (image + key) always lands on the backup PVC before Kasten takes the snapshot. The DB2 **SSL keystore is deliberately *not* backed up** — on restore we want cert-manager to own the certificate lifecycle and we restore only the data.
- **Storage choices are accommodated.** CSI snapshots are used where available; CephFS volumes use Kasten's shallow-snapshot configuration; and for storage that can't snapshot, we point customers at Veeam Backup & Replication treating the file share as a NAS rather than injecting fragile data-mover sidecars across dozens of workloads.

## Restore: there is no single button — and that's fine

Let's set expectations honestly. Given the complexity of Maximo, and the range of incidents you may face — from a simple user mistake (where you absolutely do *not* want a full DR) all the way to total data loss (where you do) — **there is realistically no single "restore everything" button.**

We tried. Restoring all the restore points in one action is the dream, and it does not work for MAS, because:

1. Installation follows a strict pipeline order, and blindly re-applying manifests ignores that order.
2. Most objects are created by operator controllers, producing a deep parent/child dependency chain. Restoring everything at once causes parents and children to appear simultaneously and the reconciliation falls over.
3. Many certificates are tied to the *source* cluster's cert-manager CA keypairs and are simply not valid on a new cluster.

So instead of fighting the platform, we work *with* it. The hard problem became a **predictable runbook that triggers Kasten operations** in the right order.

### In-place restore (same cluster) — under 1 hour

For the common cases — a bad change, a corrupted database, an operator mishap — you restore in place. The trick that keeps this fast is to **restore the top-level CR first** (`Suite`, or the `ManageWorkspace`/`ManageDeployment`/`ManageBuild` set), then scale all deployments to zero, then restore the rest of the resources with *overwrite existing* while excluding `pods` and `CertificateRequest`. Restoring the derived resources directly with Kasten gets MAS Core back in about **7 minutes**, instead of waiting ~2.5 hours for the operator to rebuild everything from scratch.

### Full disaster recovery (different site) — typically 3 to 7 hours

Full DR means standing the instance back up on a *completely different* cluster. The blueprint's philosophy here is important: you **reinstall** Maximo on the new cluster (same configuration as the source), and *then* restore component by component — you do not try to restore the platform wholesale.

The order matters:

1. Don't restore cluster-specific namespaces such as `cert-manager` — the MAS operator re-issues a fresh, internally-consistent CA on the new cluster. Restoring the old CA keypairs onto new cluster infrastructure creates a tangle of old and new trust anchors. *Let the operators own cert-manager state; restore only the data.*
2. Scale down Manage, and crucially set `autoGenerateEncryptionKeys: false` so the operator won't overwrite the encryption key you are about to restore.
3. Restore the MongoCE database.
4. Restore the Manage database (DB2U or your external database). For cross-instance DB2U restore, the saved encryption key is imported into the destination keystore so the restored backup image can actually be decrypted.
5. Scale Manage back up and watch the `ManageWorkspace` reconcile to `Ready`.

The 3–7 hour range depends mostly on whether you've prepared a **warm standby** or are rebuilding cold. In our demo we restore an on-premises Maximo deployment running on a bare-metal OpenShift cluster all the way over to **OpenShift on Azure** — a genuine site-to-site recovery.

What used to look like an intractable problem is now a follow-the-steps runbook. That is the whole point.

## The journey rarely stops at Maximo

One last observation. For most organizations, modernizing Maximo is the *beginning* of a broader move to OpenShift, not the end. The applications that consume Maximo services — directly or indirectly — usually end up on OpenShift too, and they need protection just as much.

We see it constantly: customers who first came to Kasten **for Maximo** quickly extend it to back up the rest of their application stack. Protecting the crown jewel turns out to be the on-ramp to protecting everything around it.

## Let's talk

If you are running — or planning to run — Maximo on OpenShift and want to talk through backup, in-place restore, and full disaster recovery, we'd genuinely enjoy the conversation. The [Maximo enterprise blueprint](https://github.com/kastendevhub/enterprise-blueprint/tree/main/maximo) is open; dig into the subpages to see exactly how each component is protected and restored. And don't hesitate to reach out — we're more than happy to share our vision and help you get there.
