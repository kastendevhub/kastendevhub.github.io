---
author: jaikarthikeyan
date: 2026-10-20 12:00:00 +0300
description: "In this blog, we look at how to set, update, and remove an expiry on existing Kasten RestorePoints and RestorePointContents with kubectl."
featured: false
image: "/images/posts/2026-10-20-kasten-restorepoint-expiry/kasten-restorepoint-expiry.png"
image_caption: ""
layout: post
published: true
tags: [Kasten, Retention, Retire, kubectl, Operations]
title: "Setting expiry on existing Kasten restorepoints"
---

Starting with **Veeam Kasten v9.0.6**, you can set, update, and remove an expiry on restore points that already exist. One `kubectl label` command does it.

Until now, a restore point from a policy lived as long as its policy retention allowed. A manual backup could only get an expiry when you created it. Everything else stayed until someone deleted it by hand.

That gap hurts most when you decommission an application or a VM. If you pause or delete its policy, retention stops. The restore points stay in the catalog and in your storage, and nothing retires them.

This post shows how to give those restore points an end date, change it, and remove it.

## How expiry works

Kasten reads the label `k10.kasten.io/expiresAt` on a restore point. After the time in the label passes, Kasten retires the restore point and its data. The Kasten garbage collector starts the retirement as a RetireAction, in its next run. It does not happen at the exact time in the label.

Two resources hold a restore point:

- **RestorePoint**: lives in the namespace of the application. Namespace admins can manage it.
- **RestorePointContent**: backs a RestorePoint. It is cluster-scoped, so you need cluster admin access. It stays in the cluster even after the application is deleted.

You can put the label on either one. The examples in this post use RestorePointContents.

{% include note.html content="Every command for a RestorePointContent also works on a RestorePoint. If you are a namespace admin, replace `restorepointcontent` with `restorepoint` and add `--namespace <APP_NAMESPACE>`. The labels are the same on both resources." %}

{% include note.html content="An explicit `expiresAt` label overrides the retention of the policy. This also applies to restore points that a policy created. Retirement is permanent. A date in the past, for example from a typo in the `date` command, retires the restore point in the next garbage collector run." %}

## Requirements

- Veeam Kasten v9.0.6 or later.
- `kubectl` access to the cluster.
- Permission to `patch` RestorePoints in the application namespace, or RestorePointContents if you work cluster-wide. The `kubectl label` command uses the `patch` verb.

## What this guide does not cover

This guide does not cover policy retention design or immutability settings. It only shows how they affect expiry.

## Set an expiry

### Pick the date format

Kubernetes label values cannot contain colons. Use hyphens in the time part:

```
YYYY-MM-DDTHH-MM-SSZ
```

Use `date` to build the value once, and store it in a shell variable. Every command below uses this variable, so run the commands in the same shell session. This example sets the expiry 7 days from now.

On Linux:

```bash
EXPIRY=$(date -u -d '+7 days' '+%Y-%m-%dT%H-%M-%SZ')
```

On macOS:

```bash
EXPIRY=$(date -u -v+7d '+%Y-%m-%dT%H-%M-%SZ')
```

Check the value:

```bash
echo $EXPIRY
```

To use a different period, change `+7 days` (Linux) or `+7d` (macOS) and run the line again.

### Label a restore point

As a cluster admin, label a RestorePointContent. This also works after the application is gone:

```bash
kubectl label restorepointcontent <RPC_NAME> \
  k10.kasten.io/expiresAt=$EXPIRY
```

As a namespace admin, label the RestorePoint in the namespace of the application:

```bash
kubectl label restorepoint <RP_NAME> \
  --namespace sample-app \
  k10.kasten.io/expiresAt=$EXPIRY
```

### Label many restore points at once

Kasten adds labels to every restore point. Use them as a selector (`-l`) to label many restore points with one command.

| Label | Value | Use it to select |
|---|---|---|
| `k10.kasten.io/appName` | Name of the application or VM | All restore points of one app or VM |
| `k10.kasten.io/appNamespace` | Namespace of the application | All restore points from one namespace |
| `k10.kasten.io/appType` | `virtualMachine` or `namespace` | VMs only, or namespace-based apps only |
| `k10.kasten.io/policyName` | Name of the policy that created it | All restore points of one policy |
| `k10.kasten.io/runActionName` | Name of the run that created it | The restore points of one policy run |
| `k10.kasten.io/exportProfile` | Location profile used for the export | Exported restore points only |
| `k10.kasten.io/isRunNow` | `true` | Restore points from the Run Once button |
| `k10.kasten.io/expiresAt` | Expiry time | Restore points that already have an expiry |

RestorePoints and RestorePointContents carry the same labels, so one selector works on both. Check the labels on your own resources first:

```bash
kubectl get restorepointcontents --show-labels
```

{% include note.html content="Restore points created on older Kasten versions may not have `appType`." %}

Before you label many restore points, list what your selector matches. Check that the list holds only the restore points you want to expire:

```bash
kubectl get restorepointcontents -l <SELECTOR> -L k10.kasten.io/expiresAt
```

If the list is empty, the label command prints `no objects passed to label`, and nothing changes.

## Update or remove an expiry

To update an expiry, set `EXPIRY` to the new date and run the command again with `--overwrite`. This example moves the expiry to 90 days from now. Use it when a team asks for more time, for example during an audit:

```bash
EXPIRY=$(date -u -d '+90 days' '+%Y-%m-%dT%H-%M-%SZ')
kubectl label restorepointcontent <RPC_NAME> --overwrite \
  k10.kasten.io/expiresAt=$EXPIRY
```

You can also move an expiry earlier with `--overwrite`. The restore point then retires sooner, so check the new date first.

To remove an expiry, add a `-` after the label name:

```bash
kubectl label restorepointcontent <RPC_NAME> k10.kasten.io/expiresAt-
```

The restore point goes back to its normal rules. A policy restore point follows the retention of its policy again. A manual restore point stays until you delete it.

## Use cases

### Decommission an application or a VM

You plan to retire `sample-app`. You must keep its backups for 30 days, then free the storage.

First, set the expiry to 30 days from now:

```bash
EXPIRY=$(date -u -d '+30 days' '+%Y-%m-%dT%H-%M-%SZ')
```

Label the restore points of the application:

```bash
kubectl label restorepointcontents \
  -l k10.kasten.io/appName=sample-app,k10.kasten.io/appNamespace=sample-app \
  k10.kasten.io/expiresAt=$EXPIRY
```

For a VM, use `-l k10.kasten.io/appName=sample-vm,k10.kasten.io/appType=virtualMachine` as the selector.

{% include note.html content="RestorePoints live in the namespace of the application. They are gone when the namespace is deleted. The cluster-scoped RestorePointContents stay, and you can still label them after the deletion." %}

What you label depends on the state of the namespace:

- **Namespace still exists:** as a namespace admin, label the RestorePoints in `sample-app` with `--namespace sample-app`.
- **Namespace already deleted:** label the RestorePointContents, as shown above. This needs cluster admin access. If you are a namespace admin, ask a cluster admin to run it, or label the RestorePoints before you delete the namespace.

Then pause or delete the policy. Without the label, this step would leave the restore points with no retirement. With the label, they retire on the date you set.

### Expire all restore points of one policy

You plan to delete the policy `sample-app-backup`. Deleting it stops retention, so give its restore points an end date first. Pick them with `policyName`:

```bash
kubectl label restorepointcontents \
  -l k10.kasten.io/policyName=sample-app-backup \
  k10.kasten.io/expiresAt=$EXPIRY
```

This covers every namespace the policy protects, in one command. As a namespace admin, run it on `restorepoints` with `--namespace` once for each namespace.

{% include note.html content="A policy run that exports its backup creates two restore points: a local one and an exported one. They are separate resources, and each has its own `expiresAt` label. The `policyName` selector matches both. To target only one, add `'!k10.kasten.io/exportProfile'` for the local copy, or `k10.kasten.io/exportProfile=<PROFILE>` for the exported copy." %}

Add `--overwrite` if some of them already have an expiry. To only touch restore points without one, add `'!k10.kasten.io/expiresAt'` to the selector:

```bash
-l k10.kasten.io/policyName=sample-app-backup,'!k10.kasten.io/expiresAt'
```

### Find restore points that never retire

A restore point from a scheduled policy run has no `expiresAt` label, but it still retires. It follows the retention of its policy. Two kinds of restore points never retire unless you set an expiry or delete them.

Manual backups from the application menu have no policy and no expiry:

```bash
kubectl get restorepointcontents -l '!k10.kasten.io/expiresAt','!k10.kasten.io/policyName'
```

Restore points from the Run Once button have no expiry:

```bash
kubectl get restorepointcontents -l k10.kasten.io/isRunNow=true,'!k10.kasten.io/expiresAt'
```

Use these checks after a cleanup, or to audit a cluster. Then label the results with an `expiresAt` date.

## What happens at expiry

### When does retirement start?

Not at the exact time in the label. The Kasten garbage collector checks for expired restore points on a fixed interval. The default is 6 hours. A restore point retires in the first run after its `expiresAt` time. If the time passes right after a run, it waits up to 6 hours for the next one.

You can change the interval with the Helm value `garbagecollector.daemonPeriod`. The value is in seconds, and the default is `21600`. This example runs the garbage collector every 30 minutes:

```bash
# Save your current Helm values to a file
helm get values k10 --output yaml --namespace=kasten-io > k10_val.yaml && \
# Upgrade with those values and the new interval
# Set --version to your current chart version, or Helm also upgrades Kasten to the newest chart
# To find it, run: helm list -n kasten-io (CHART column, for example k10-9.0.6 is 9.0.6)
helm upgrade k10 kasten/k10 --namespace=kasten-io -f k10_val.yaml \
  --version <CURRENT_VERSION> \
  --set garbagecollector.daemonPeriod=1800
```

A shorter interval makes retirement start sooner, but the garbage collector runs more often. Keep the default unless you need a close match between the expiry time and the retirement.

If you deploy Kasten with the Operator, set the same value under `spec.garbagecollector.daemonPeriod`.

### What to expect at retirement

{% include note.html content="Retirement does not always free storage right away." %}

- **Immutable backups.** Kasten does not delete these when the expiry passes. It deletes them after the protection period ends and a few subsequent maintenance runs.
- **Deduplication.** Retiring a restore point may free little or no space when other restore points share its data.

{% include note.html content="Do not set the label to the current time to delete a restore point. The restore point retires at the next garbage collector run, and you cannot undo it. If you want it gone now, use `kubectl delete` on purpose." %}

## Verify

Show the label on your restore points:

```bash
kubectl get restorepointcontents \
  -l k10.kasten.io/appName=sample-app \
  -L k10.kasten.io/expiresAt
```

Each row shows its expiry in the last column. After the date passes, the next garbage collector run creates a RetireAction. Watch the action with:

```bash
kubectl get retireactions.actions.kio.kasten.io
```

## Wrapping up

You no longer need to choose between keeping a policy forever and losing track of its restore points. Label them with an end date, change the date when your needs change, and remove the label to go back to policy retention.

For more on how Kasten cleans up resources, see the [Garbage Collector](https://docs.kasten.io/latest/operating/garbagecollector/) and [Restore Points](https://docs.kasten.io/latest/api/restorepoints) documentation.