---
author: mattslotten
date: 2026-09-22 00:32:11 -0400
description: "In this blog post, we take a look at why snapshotting etcd isn't the same thing as backing up your Kubernetes applications, and what it quietly leaves behind."
featured: false
image: "/images/posts/2026-09-22-etcd-isnt-a-backup/header.jpg"
image_caption: "A flight manifest with fifteen names on it, one of which is wrong"
layout: post
published: true
tags: [kubernetes, backup, disaster recovery, kasten]
title: "Your etcd Snapshot Left Kevin in the Attic"
---

The entire plot of *Home Alone* turns on a clerical error. Not a burglary, not
a paint can to the face, not Joe Pesci's committed performance as a man being
slowly dismantled by a third grader, but a clerical error. The McCallisters
oversleep, the power's out, the shuttle vans are honking in the driveway, and
somewhere in that scrum a neighbor kid named Mitch Murphy wanders through the
headcount, gets tallied as a McCallister, and fifteen people board a plane to
Paris entirely satisfied that everyone is accounted for. The manifest said
fifteen. The manifest was *correct*. Kevin was in the attic.

Am I about to compare a beloved Christmas film to your K8s disaster recovery plan?
Obviously. Did I pick it because I've never found a cleaner illustration of the
gap between knowing where everything is and actually *having* everything? Yes
(though I'll admit I also just wanted a professional excuse to rewatch it in
September - John Hughs was a treasure).

And before I spiral off into a treatise on the epistemology of inventory
systems and what they can and cannot tell us about the world outside the
inventory, let's narrow the scope of this post considerably — okay, let's
narrow it *a lot*. We're going to talk about etcd snapshots, and the extremely
common and extremely understandable belief that taking one means the cluster is
backed up. First, what's actually in the snapshot, then the two gaps that
announce themselves at the worst possible moment, then what we do about it.

# So what's in an etcd snapshot?

**etcd** is the distributed key-value store that holds cluster state, and for
practical purposes it's everything the Kubernetes API server knows. Snapshot it
with `etcdctl snapshot save` on a control plane node and what we get back is
legitimately valuable: every Deployment spec, every StatefulSet, every
ConfigMap, our Secrets (encrypted at rest or not, depending entirely on how we
configured our EncryptionConfiguration), our RBAC bindings, our CRDs and the
whole zoo of custom resources built on them, and the sprawl of status
subresources describing what the control plane believed at that instant.

That's a complete, internally consistent, point-in-time record of what our
cluster thought about itself, and if we're taking them today we should keep
taking them. I'm not here to talk anybody out of it. I'm here about the two
things it isn't.

Because the natural next thought (and I've watched smart people have it in real
time at a whiteboard) is: great, so we'll snapshot etcd on a schedule, ship it
to an S3 bucket with object lock on, and the Kubernetes DR plan is done. And
look, you could absolutely do that, and I'd much rather you did that than
nothing at all — but the snapshot is answering a narrower question than the one
your recovery plan is asking.

{: .alert-info }
When choosing a K8s backup and recovery tool, it's worth considering one that _doesn't_
use the etcd store as its data store, particularly for larger clusters or environments.
Consider what storing the catalog of every restore point, actions, and other high-churn, high-volume
resource in the etcd database means and the overhead that can quickly introduce. It's a big reason
why Kasten is better suited than say — oh I don't know — Trilio in Kubernetes application backup.
Likely a topic for another post in the future.

# Gap one: the manifest isn't the kid

![Mitch Murphy from Home Alone](/images/posts/2026-09-22-etcd-isnt-a-backup/mitch.jpg)

This is the part that surprises people, precisely because the abstraction is
doing its job right up until the moment it isn't. When an application asks for
storage, Kubernetes creates a
**PersistentVolumeClaim**, which gets bound to a **PersistentVolume**, which
carries a name, a capacity, a storage class, an access mode, and a volume
handle (a string pointing at an actual disk living somewhere in a storage
array, a CSI driver's backend, or a cloud provider's block storage service).
All of those objects live in etcd. The data does not. Not one byte of our
Postgres tablespace, our Kafka log segments, our users' uploaded PDFs, or our
vector index is inside that snapshot file, because **etcd stores the reference,
not the referent**.

So let's walk the restore. We bring etcd back to 13:55, the API server comes
up, `kubectl get pvc` reports every claim `Bound` and healthy, and the whole
thing looks like a clean recovery. Then one of two things turns out to be true.
Either the volume still exists (in which case it holds whatever was written to
it up to *now*, not up to 13:55, so we've married a control plane from one
point in time to application data from another, which for anything
transactional is less a state than a category of problem), or the volume was
deleted along with whatever prompted the restore, and we're left admiring a
beautifully `Bound` PVC pointing at a volume handle that resolves to precisely
nothing.

The manifest is internally consistent. Fifteen names, fifteen seats, no
discrepancies, nothing for a validating webhook to complain about. It simply
isn't a description of reality, and the plane is over the Atlantic before
anybody finds out.

This applies recursively to the things that *look* like backups, by the way. If
we've been diligently taking CSI **VolumeSnapshots**, the `VolumeSnapshot` and
`VolumeSnapshotContent` objects are themselves just references, so restoring
etcd restores the index cards for snapshots that may since have been garbage
collected or aged out by retention. The card is in the catalog. The tape isn't
on the shelf.

# Gap two: we can't go back for just Kevin

![Gus Polinski from Home Alone](/images/posts/2026-09-22-etcd-isnt-a-backup/johncandy.webp)

The second gap is **restore granularity**, and it's the one I'd argue actually
costs people their Saturday (gap one costs them their data, which is worse, but
this one happens far more often).

An etcd restore isn't a Kubernetes operation at all, it's an infrastructure
operation performed at the level of the entire datastore, and it puts *the whole
cluster* back to one instant in time. Not a namespace. Not an application. Not
"the one thing that broke."

What do I mean by that? Well, let's take the failure we're most likely to
actually have, which is not a meteor strike on the data center. It's a Helm
upgrade at 14:00 that mangled a CRD, or an engineer who ran `kubectl delete
namespace` against the wrong kubeconfig (a thing I have done, in a lab, with a
context I was extremely confident about), or a GitOps controller that
reconciled a bad commit at three in the morning. We want one application back
the way it looked at 13:55, and what etcd hands us is *everything* back the way
it looked at 13:55: every other team's deployments, whatever the autoscaler did
with replica counts since, cert-manager's renewals, every Job that completed in
the interim, all of it rolled backwards in a single move on behalf of one
namespace. Kate McCallister doesn't get to pop back to Chicago for one child.
She gets a rebooking odyssey, a cargo van, and several hours of polka.

The mechanics aren't especially friendly either, since restoring etcd means
taking the control plane down, restoring the member data directories, and
bringing **quorum** back, which is not a procedure anyone should be improvising
at 2am (while somebody from the business asks for an ETA every four minutes).
And the specific incantation depends entirely on what we're running: upstream
has us stop every member and restore each one's data directory from the *same*
snapshot with `etcdutl snapshot restore` (note `etcdutl`, not `etcdctl` — that
spelling has been deprecated since 3.5, though you'd never guess it from the
runbooks still in circulation), k3s and RKE2 hide the whole thing behind
`--cluster-reset --cluster-reset-restore-path=`, and OpenShift ships a
`cluster-restore.sh` we run on one designated recovery host, with the
delightful additional caveat that the backup has to come from the same
z-stream release the cluster is currently on. One file format, several
procedures, and the only one worth trusting at 2am is the one in your own
distribution's documentation rather than the one in my blog post.

{: .alert-info }
And here's the bit that makes the whole debate academic for a good share of
readers: on a managed control plane we don't have etcd access at all. EKS, AKS,
GKE, ROSA — the provider operates etcd, and we get to neither snapshot nor
restore it. Azure is refreshingly blunt about this in the
[AKS support policy](https://learn.microsoft.com/en-us/azure/aks/support-policies),
which promises "automated, transparent backups of all etcd data every 30
minutes" and then, in the very next breath, notes that those backups "aren't
directly available to you or anyone else" and that "on-demand rollback or
restore isn't supported as a feature" (that same document puts cluster backup
and disaster recovery squarely in the customer column, which I'd call entirely
fair). Google's customer-facing answer, meanwhile, is Backup for GKE, which
captures "Kubernetes resource manifests extracted from the cluster API server"
plus volume snapshots of the PVCs those manifests reference — which is to say
the hyperscaler's own answer to this problem is application-level, because
that's the level the problem lives at. So if we're running managed Kubernetes
and the DR runbook says "we snapshot etcd," that runbook has a fictional step
in it.

# Okay, so what do we actually do?

Think in **application-centricity rather than infrastructure-centricity**. The
atomic unit worth recovering is the application, meaning its manifests *and*
its data, captured together against the same moment, and restorable on its own
without the rest of the cluster coming along for the ride.

We can absolutely build that ourselves, and it's worth walking through what
"ourselves" entails. For each application: quiesce the database (or knowingly
accept a crash-consistent volume); take a CSI VolumeSnapshot or a native dump
and copy it outside the failure domain we just lost (a snapshot sitting in the
array that died is a souvenir, perhaps in the shape of a small eiffel tower or whatever the airport in Scranton, PA sells, not a backup ); export the namespace's manifests
plus the cluster-scoped objects the app quietly depends on, meaning CRDs,
ClusterRoles, StorageClasses, admission webhooks; extract the Secrets to
somewhere that's neither the cluster nor a public Git repo; commit the rest to
Git; then write and actually *test* a runbook that restores it in the right
order, with a data copy whose timestamp matches the manifests beside it.

I've built a version of this in a lab out of CronJobs and a shell script, and
in the interest of honesty it worked, in the narrow sense that it reliably
produced files (whether those files constituted a recoverable application was a
question I mostly declined to ask). It also doesn't scale. One application is a
weekend project, forty namespaces across three storage backends is a standing
team obligation, and that obligation invariably gets its first real test on the
day the person who wrote the script is on PTO.

Or alternatively (and here's where I disclose that I work for Veeam, who would
be delighted to sell you the thing I'm about to describe) we could use a
Kubernetes-native data protection tool, like, oh I don't know,
[Veeam Kasten](https://vee.am/kasten), which treats the namespace or the
application as the atomic unit, captures the manifests and the volume data
against the same point in time, and restores that one application without
dragging everything else backwards through history with it.

And I'll caveat that properly, because the "we snapshot etcd" belief has an
annoying habit of being swapped out for an equally tidy "we bought a backup
product" belief. Kasten is a *key and essential component* of recovering
Kubernetes applications; it is not, by itself, a Kubernetes DR plan. We still
want the cluster declaratively rebuildable (Terraform, OpenTofu, Cluster API —
pick your poison). We still want Argo CD or Flux owning cluster configuration,
so that rebuilding the platform is reconciliation rather than archaeology. We
still want cloud IAM and KMS keys protected and documented, because an
encrypted Secret nobody can decrypt is just a binary blob with excellent
posture. And yes, we still want etcd snapshots wherever we can take them,
because "the control plane is corrupt but the workloads are fine" is a real
scenario (and that's exactly the tool for it).

**An etcd snapshot restores our cluster's memory of our applications — it does
not restore our applications.**

# Alright, now what?

At the risk of turning this post into a frame-by-frame rewatch of a 1990
Christmas comedy through the lens of storage primitives, we'll stop here. Go
find the line in your DR runbook that says etcd and ask it two questions: what
restores the volume data, and what happens when only one namespace needs to
come back. If either answer is a shrug, somebody's still in the attic.

A few references worth the time:

- <a href="https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/" target="_blank">Operating etcd clusters for Kubernetes</a> — the upstream backup and restore procedure, straight from the source
- <a href="https://etcd.io/docs/" target="_blank">etcd documentation</a>, including the disaster recovery guide, which is admirably candid about what a snapshot is and isn't
- <a href="https://kubernetes.io/docs/concepts/storage/volume-snapshots/" target="_blank">Kubernetes Volume Snapshots</a> — start here if "the PVC is only a reference" was news
- My earlier post on <a href="https://veeamkasten.dev/cloud-native-dr" target="_blank">BCDR planning for cloud native workloads</a>, which digs further into HA-is-not-DR and the 3-2-1-1 rule
- <a href="https://docs.kasten.io" target="_blank">Veeam Kasten documentation</a>, for the shameless-plug portion of the evening
