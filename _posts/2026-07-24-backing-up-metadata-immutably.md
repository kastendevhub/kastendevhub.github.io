---
layout: post
title: "\"We're stateless, we just redeploy from Git\" — five reasons that's false confidence"
description: "A lot of teams believe a stateless application is safe because it can be rebuilt from a Git commit at any time. That belief quietly ignores the metadata layer — and five very real failure modes, the last of which no rebuild can ever fix. Here is why your metadata deserves an immutable backup too."
date: 2026-07-24 09:00:00 +0200
author: michaelcourcy
image: '/images/posts/2026-07-24-backing-up-metadata-immutably/metadata-immutability.png'
image_caption: 'Backing up metadata immutably: some things a Git rebuild can never give you back'
tags: [Kasten, immutability, metadata, gitops, argocd, supply-chain, ransomware, disaster-recovery, kubernetes]
featured: false
published: true
---

I have this conversation on a regular basis. I sit down with a customer, we start talking about protecting their Kubernetes platform, and at some point someone says it, almost as a way to close the topic:

> *"Our applications are stateless. Everything is in Git. If anything happens, we just point our pipeline at a commit and redeploy — we get back exactly what we had before, with absolute confidence."*

It is a comforting story, and I understand why people tell it. It is also, in my experience, a **false sense of confidence**. Not because Git and GitOps are bad — they are excellent — but because "the application manifests live in Git" is not the same statement as "everything I need to recover lives in Git, and Git itself is guaranteed to be intact when I need it."

This post is about the gap between those two statements. It is about **metadata** — the Kubernetes objects, the derived resources, the secrets and certificates, the image references — and why that metadata deserves a proper, **immutable** backup, exactly the way we already protect data. I will walk through five reasons the "just redeploy from Git" model breaks. The first four are operational. The fifth one is the one that keeps me up at night, because no rebuild can ever undo it.

## First, let's be precise about what "stateless" hides

When a team says "stateless", they usually mean the *workload* holds no persistent data on disk — no database, no PVC that matters. Fair enough. But a running application on Kubernetes is never just its container image. It is a graph of objects: Deployments, StatefulSets, Services, Ingresses, ConfigMaps, Secrets, ServiceAccounts, RBAC, CRDs and the Custom Resources on top of them, admission policies, cert-manager Certificates, image references, and so on. That graph *is* metadata, and a big part of it is generated at runtime rather than declared in Git.

The "redeploy from Git" model assumes two things silently:

1. That the toolchain which turns Git into a running application will be available and correct at recovery time.
2. That Git is a **faithful and complete** representation of what was running — and that it is **immutable**, so what you read back is what was actually there.

Both assumptions are weaker than people think. Here is why.

## Reason 1 — The toolchain that rebuilds the app is itself a disaster casualty

The rebuild story assumes a healthy pipeline: a reachable Git server, a working CI system, a functioning container registry, an operational cluster with all its operators, network egress to pull dependencies. But a disaster is rarely a clean, isolated hit on a single workload.

A ransomware event, a bad platform upgrade, a cloud region incident, an accidental `helm uninstall` of a shared operator — these tend to damage **several components at once**. When you most need to rebuild from Git, the very machinery that rebuilds from Git may be part of the blast radius: the registry is encrypted, the CI runners are gone, the operator that owns your CRDs is in `CrashLoopBackOff`, the ingress controller CRDs are missing.

A backup is not just a copy of your objects. It is an **independent recovery path** that does not require your entire build-and-deploy chain to be healthy. That independence is the whole point.

## Reason 2 — Not everything actually goes through GitOps

This is the reason I see most often in the field, and it is the least glamorous. The theory is that every change flows through a pull request and lands in Git before it touches the cluster. The reality is **drift**.

Under pressure, people make live changes: a quick `kubectl edit` to bump a limit during an incident, a manual Secret rotated by hand, a `ConfigMap` patched to unblock production at 2 a.m. And — I have genuinely lost count of how many times I have seen this — teams **pause Argo CD auto-sync** "just for a moment" because a sync would revert a change they need to keep, or because a sync would break something. That "moment" quietly becomes weeks.

The result is that the cluster and Git have diverged, and the divergence is invisible until you rebuild. At that point "redeploy from Git" does not restore what you had — it restores what Git *says* you had, silently discarding every out-of-band change. A backup captures the **actual state of the cluster**, drift and all, which is precisely what you need to get back to where you really were.

## Reason 3 — Derived resources are not created deterministically

This one is subtle and it is where the "Git is the source of truth" model quietly leaks.

In an operator/CRD world, Git often declares only the **Custom Resource** — the high-level intent. The controller in charge then creates the **derived resources**: Deployments, StatefulSets, Services, and critically **Secrets and Certificates**. These derived resources are not in Git, and they are frequently **not reproducible**:

- **Secrets and certificates.** A controller (say cert-manager, or a database operator generating credentials) mints keys and certificates at reconcile time. Rebuild from Git and you do not get *the same* certificate back — you get a *new* one. Sometimes that is fine. Sometimes it is operationally painful (every client trusting the old CA must be updated) and sometimes it is **legally or contractually significant** (a certificate tied to an audited identity, a signing key, a credential shared with a third party under agreement). You cannot "rebuild" a private key you never stored.
- **Controller version drift.** The way a controller expands a Custom Resource into derived resources is a property of *that version of the controller*. Upgrade the operator between the incident and the recovery — which is likely, since you are reinstalling from latest — and the exact same CR can reconcile into a **different** set of derived resources: different defaults, renamed fields, changed labels, a new sidecar. "Rebuild from Git" reconstructs an application shaped by *today's* controller, not the one you were actually running.

A backup of the derived resources — including the generated Secrets and Certificates — captures the *result* of reconciliation as it truly was, not a fresh roll of the dice.

## Reason 4 — Supply chain compromise

"Redeploy from Git" means "pull all the dependencies again." That is exactly the behaviour you do **not** want after a supply-chain incident.

If an upstream dependency — a base image, a Helm chart, a module, a package in a registry — was compromised, then rebuilding faithfully re-pulls the poisoned artifact and re-introduces the compromise. Worse, the malicious version may have *replaced* the tag you reference, so a rebuild is not reproducing your known-good state at all; it is fetching whatever is upstream *now*.

This is exactly why, on OpenShift, we back up the **ImageStreams** produced by BuildConfigs rather than assuming we can rebuild them from source on demand — the built image reference and its content are metadata worth protecting in their own right. A backup of your dependency metadata and image references gives you a **known-good, point-in-time** copy that does not depend on the upstream still being trustworthy — or even still existing.

## Reason 5 — Git history infection (the one no rebuild can fix)

This is, to me, the most vicious scenario, and the reason I wanted to write this post. It is worth being technically precise here, because it is easy to overstate — and it is damning enough without exaggeration.

**The claim:** a malicious insider can alter Git history to plant a backdoor *deep in the past*, in a way that survives into every future rebuild. Once that has happened, **rebuilding from "any commit" is not a recovery — it is re-deploying the attacker's code with your own pipeline.** Only an independent, immutable backup taken *before* the tampering lets you get back to genuine known-good state.

Is that real? Yes. Here is the accurate picture.

Git is a Merkle DAG: every commit's hash is computed over its content *and its parent's hash*, so the commits form a chain. If you alter a commit far back in history, **every descendant commit's hash changes**. That makes tampering *detectable* — but, and this is the crucial caveat, **only if you hold an independent, trusted anchor** to compare against (a signed tag, a recorded HEAD hash, a transparency log). Git's structure is **tamper-evident, not tamper-proof.**

Now watch how an insider defeats it in practice:

- Anyone with push rights can rewrite history with `git rebase` / `git filter-repo` and `git push --force`. Every downstream hash changes — but a **fresh clone receives the rewritten history with internally consistent hashes and no warning whatsoever.**
- "No force-push" and branch-protection rules feel like a wall, but they are **governance controls, not cryptographic seals.** A repository admin — or a compromised admin account — can disable protection, push, and re-enable it.
- The one local artifact that would betray the rewrite, the reflog, is **local-only and prunable**, and your CI/CD runners start from a clean clone, so they never see it.

**Can you actually seal a commit?** Yes — and this is the honest, balanced part. **Signed commits and signed tags** (GPG, SSH signing, or Sigstore's `gitsign`) are the real seal. An attacker who cannot forge a trusted developer's key **cannot re-sign** the rewritten commits, so if signature verification is *enforced at deploy time*, the attack breaks. Argo CD can require signed commits on an `AppProject`; GitHub and GitLab display "Verified" badges.

So why is this still a genuine risk? Because **in practice those anchors are rarely present or enforced.** Most pipelines simply `checkout <sha> && build`, with no signature verification at all. Many commits are never signed. Transparency-log anchoring is rarer still. So the theoretical protection exists, but the field reality is that "rebuild from any commit" is trusting a source that is **mutable and writable by insiders**, with the safety catch usually switched off.

An immutable Kasten backup lives in a **different trust domain** with object-lock / retention that **the insider cannot rewrite** — not even a repository admin can reach back and alter it. That is the whole argument in one sentence: every one of Git's own protections lives inside the same system and depends on discipline that is usually not enforced; an immutable backup does not.

## What "backing up metadata immutably" actually means with Kasten

The through-line of all five reasons is the same: **your metadata is a first-class asset that deserves the same protection as your data.** Veeam Kasten treats it that way.

- It captures the **actual state of the cluster** — the full object graph, including the derived resources, generated Secrets, and Certificates that never existed in Git.
- It captures **image references and metadata** (for example ImageStreams), giving you a known-good point-in-time copy independent of a possibly-compromised upstream.
- It writes those backups to object storage under **S3 Object Lock / Azure Blob immutability**, so the copy cannot be deleted or altered — not by an attacker, not by a compromised admin, not by Kasten itself — for the duration of the protection period.

That last property is what closes the loop on reason 5. A backup that a privileged insider could quietly rewrite would inherit exactly the weakness we are trying to escape. Immutability is what makes the backup a **trustworthy anchor** — the one representation of "what we actually had" that nobody inside the blast radius can edit after the fact.

If you want the mechanics of how that immutability is enforced and sized over time, I covered the protection period and the Blob Lifecycle Manager in a companion post: [Understanding Kasten immutability: retention vs. protection period](/kasten-immutability-protection-period).

## Summary

- "Stateless, we just redeploy from Git" underestimates the **metadata layer** and overestimates Git's guarantees.
- **Reason 1:** a disaster is rarely isolated — the toolchain that rebuilds from Git may itself be down. A backup is an *independent* recovery path.
- **Reason 2:** drift is real. Manual changes and paused Argo syncs mean Git is not a faithful copy of the running cluster. A backup captures the *actual* state.
- **Reason 3:** derived resources — especially Secrets and Certificates — are generated non-deterministically, and controller upgrades change how they are produced. A backup captures the real result of reconciliation.
- **Reason 4:** rebuilding re-pulls dependencies, which is dangerous after a supply-chain compromise. A backup gives you a known-good, point-in-time copy of image and dependency metadata.
- **Reason 5:** Git is tamper-*evident*, not tamper-*proof*. An insider can rewrite history and every future rebuild will faithfully re-deploy the backdoor. Signing can seal commits, but is rarely enforced. Only an **immutable backup in a separate trust domain** is safe from that insider.

Git and GitOps are not the problem — they are part of a healthy platform. The mistake is treating them as a *backup*. They are a description of intent, held in a mutable, insider-writable system, reconstituted by a toolchain that shares your blast radius. An immutable backup of your metadata is the thing that turns "we think we can rebuild it" into "we know we can get it back."
