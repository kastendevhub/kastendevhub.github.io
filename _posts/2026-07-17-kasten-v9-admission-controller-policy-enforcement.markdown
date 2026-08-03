---
author: jrichardson
date: 2026-07-17 09:00 -0400
description: "A hands-on look at Kasten v9.0's Technical Preview for enforcing admission control policies on backup and restore operations with Kyverno, OPA Gatekeeper, or native Kubernetes Validating Admission Policies."
featured: false
image: "/images/posts/2026-07-17-kasten-v9-admission-controller-policy-enforcement/vap.png"
image_caption: "Kasten v9.0 Admission Controller Policy Enforcement for Backup and Restore"
layout: post
published: true
tags: [kasten, kubernetes, kyverno, OPA gatekeeper, admission control, security, compliance, backup, restore,]
title: "Enforcing Governance in Kasten v9.0 with Admission Controllers"
---

Many operations in your cluster will likely pass through admission control. Someone creates a Deployment with a `:latest` tag, forgets a resource limit, or tries to delete a namespace they don't own — Kyverno, Gatekeeper, or a ValidatingAdmissionPolicy catches it before the object is ever persisted. Until now, backup and restore operations were the exception. A user with the right RBAC could kick off a `RestoreAction` into any namespace, or delete a `RestorePoint` ahead of its retention window, and no policy engine ever saw the request.

**Veeam Kasten v9.0** closes that gap. This release ships **Admission Controller Policy Enforcement for Backup and Restore Operations** as a Technical Preview, building on the Validating Admission Policy work Kasten introduced in v8.0 for self-service migrations. With it enabled, Kasten's `Action` and `RestorePoint` resources are evaluated by whichever policy engine your platform team already runs — Kyverno, OPA Gatekeeper, or Kubernetes-native Validating Admission Policies — at admission time, before the operation executes.

This post walks through why that matters, how it works under the hood, and how to stand up all three policy engines against a KinD cluster to see it in action.

## Why This Matters

Kasten's `Policy` and `Profile` objects are regular CRDs, so they've always been subject to normal Kubernetes admission control. `Actions` (`BackupAction`, `RestoreAction`, `RunAction`, and friends) and `RestorePoints`, however, are served by Kasten's aggregated API server rather than the built-in CRD machinery. Historically, that meant policy engines simply never saw them — you could write a Kyverno policy targeting `RestoreAction` all day long, and it would silently never fire.

With admission controller support enabled in v9.0, platform teams can now enforce guardrails such as:

- Preventing creation of a backup `Policy` unless it excludes sensitive resource types like `Secrets`.
- Requiring that a `RestoreAction`'s target namespace matches a naming convention, such as sharing a prefix with the namespace the backup was taken from.
- Stripping sensitive resource types out of a restore by mutating the request's filters.
- Requiring an expiration on manual `RunAction` operations so ad hoc backups don't orphan data indefinitely.
- Blocking deletion of `RestorePoints` before their retention window has passed.

In other words: the same governance model your platform team already applies to every other workload now extends to data protection.

## How It Works

When enabled, Kasten routes requests against its aggregated API resources through the standard Kubernetes admission chain:

| API Group | Resources |
|---|---|
| `actions.kio.kasten.io/v1alpha1` | `BackupAction`, `BackupClusterAction`, `BatchRestoreAction`, `CancelAction`, `ExportAction`, `ImportAction`, `MigrateFCDAction`, `ReportAction`, `RestoreAction`, `RestoreClusterAction`, `RetireAction`, `RunAction`, `StageAction`, `UpgradeAction`, `ValidateAction` |
| `apps.kio.kasten.io/v1alpha1` | `Application`, `ClusterRestorePoint`, `RestorePoint`, `RestorePointContent` |
| `dr.kio.kasten.io/v1alpha1` | `KastenDRRestore`, `KastenDRReview` |
| `repositories.kio.kasten.io/v1alpha1` | `StorageRepository` |
| `vault.kio.kasten.io/v1alpha1` | `Passkey` |

A few important details before you flip the switch:

- Requests made directly against these resources (`kubectl` or the Kasten dashboard) are evaluated before the object is persisted, exactly like any other admission-controlled resource.
- Some of these resources are also created **indirectly** by Kasten itself. A scheduled policy run creates a `BackupAction`; deleting a `RestorePointContent` creates a `RetireAction`. Kasten validates these internal operations against your policies too, using Kubernetes [dry-run](https://kubernetes.io/docs/reference/using-api/api-concepts/#dry-run) requests — which means any webhook targeting these resources **must** declare `sideEffects: None` or `sideEffects: NoneOnDryRun`, or the dry-run call will be skipped and the real operation will fail.
- Kasten aggregated API resources don't support updates after creation, so policies should target `CREATE` and `DELETE` operations only.
- Because internal service-account traffic is also evaluated, an overly broad policy can break scheduled backups, restores, or retirements. Exempt Kasten's own service accounts (the `system:serviceaccounts:kasten-io` group covers all of them) from anything meant to constrain end users only, and consider running new policies in audit/warn mode before switching to enforce.

This is still a Technical Preview: expect rough edges around error messages surfaced in the dashboard, and don't rely on it for production enforcement yet.

## Demo: Three Policy Engines on One KinD Cluster

The rest of this post assumes you already have a KinD cluster running with Kasten v9.0 installed. We'll enable the admission controller feature, then implement the same guardrail — **block deletion of `RestorePoint`/`RestorePointContent` by anyone other than Kasten's own service accounts or a cluster-admin** — three different ways so you can compare the engines side by side.

If you're building the cluster from scratch, this `kind-config.yaml` is worth using since it pins a Kubernetes version with Validating Admission Policy at GA and leaves room to opt into Mutating Admission Policy on older releases via feature gate:

```yaml
# kind-config.yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
    image: kindest/node:v1.31.0
    kubeadmConfigPatches:
      - |
        kind: ClusterConfiguration
        apiServer:
          extraArgs:
            feature-gates: "ManifestBasedAdmissionControlConfig=true"
  - role: worker
```

```bash
kind create cluster --config kind-config.yaml --name kasten-admission-demo
```

### Step 1 — Enable the Kasten Aggregated API Admission Controller

This is off by default because enabling it immediately activates *any* existing policy that happens to match Kasten's API groups, including ones nobody realized were dead code:

```bash
helm upgrade k10 kasten/k10 -n kasten-io \
  --reuse-values \
  --set services.aggregatedapis.admissionController=true
```

If you also want to try the Kubernetes Mutating Admission Policy feature against these resources (useful for the "strip sensitive resource types from a restore" pattern):

```bash
helm upgrade k10 kasten/k10 -n kasten-io \
  --reuse-values \
  --set services.aggregatedapis.mutatingAdmissionPolicy=true
```

### Step 2 — Option A: Kyverno

Install Kyverno:

```bash
helm repo add kyverno https://kyverno.github.io/kyverno/
helm repo update
helm install kyverno kyverno/kyverno -n kyverno --create-namespace
```

Apply the guardrail. This is the policy pattern Kasten documents directly — it matches `DELETE` operations on the aggregated `RestorePoint`/`RestorePointContent` resources and excludes Kasten's own service accounts and `cluster-admin` so retention and retirement processing still work:

```yaml
# kyverno-block-rp-deletion.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: block-rp-deletion-users
  annotations:
    policies.kyverno.io/title: Block User RestorePoint Deletion (Allow K10 System Accounts)
    policies.kyverno.io/description: >-
      Blocks deletion of RestorePoints by regular users while allowing any K10 service
      account (system:serviceaccounts:kasten-io group) and cluster-admin to delete.
spec:
  validationFailureAction: Enforce
  background: false
  rules:
    - name: deny-user-restorepoint-deletion
      match:
        any:
          - resources:
              kinds:
                - apps.kio.kasten.io/v1alpha1/RestorePoint
                - apps.kio.kasten.io/v1alpha1/RestorePointContent
              operations:
                - DELETE
      exclude:
        any:
          - subjects:
              - kind: Group
                name: system:serviceaccounts:kasten-io
          - clusterRoles:
              - cluster-admin
      validate:
        message: >-
          Only K10 service accounts (system:serviceaccounts:kasten-io) or
          cluster-admin may delete RestorePoints. User deletions are blocked.
        deny: {}
```

```bash
kubectl apply -f kyverno-block-rp-deletion.yaml
```

### Step 2 — Option B: OPA Gatekeeper

Install Gatekeeper, enabling its delete webhook since Gatekeeper doesn't intercept `DELETE` requests by default:

```bash
helm repo add gatekeeper https://open-policy-agent.github.io/gatekeeper/charts
helm repo update
helm install gatekeeper gatekeeper/gatekeeper -n gatekeeper-system --create-namespace \
  --set enableDeleteOperations=true
```

Define a `ConstraintTemplate` implementing the same logic in Rego:

```yaml
# gatekeeper-constrainttemplate.yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8skastenrestorepointdeleteguard
spec:
  crd:
    spec:
      names:
        kind: K8sKastenRestorePointDeleteGuard
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package kastenrestorepointdeleteguard

        violation[{"msg": msg}] {
          input.review.operation == "DELETE"
          not is_kasten_service_account
          not is_cluster_admin
          msg := "Only Kasten service accounts (system:serviceaccounts:kasten-io) or cluster-admin (system:masters) may delete RestorePoints. User deletions are blocked."
        }

        is_kasten_service_account {
          input.review.userInfo.groups[_] == "system:serviceaccounts:kasten-io"
        }

        is_cluster_admin {
          input.review.userInfo.groups[_] == "system:masters"
        }
```

Then the `Constraint` that binds it to Kasten's aggregated API:

```yaml
# gatekeeper-constraint.yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sKastenRestorePointDeleteGuard
metadata:
  name: block-rp-deletion-users
spec:
  match:
    kinds:
      - apiGroups: ["apps.kio.kasten.io"]
        kinds: ["RestorePoint", "RestorePointContent"]
```

```bash
kubectl apply -f gatekeeper-constrainttemplate.yaml
kubectl apply -f gatekeeper-constraint.yaml
```

### Step 2 — Option C: Native Kubernetes ValidatingAdmissionPolicy

No extra components to install here — this uses the admission chain built into the API server. Define the policy:

```yaml
# vap-block-rp-deletion.yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: kasten-restorepoint-delete-guard
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
      - apiGroups:   ["apps.kio.kasten.io"]
        apiVersions: ["v1alpha1"]
        operations:  ["DELETE"]
        resources:   ["restorepoints", "restorepointcontents"]
  variables:
    - name: isKastenServiceAccount
      expression: "request.userInfo.groups.exists(g, g == \"system:serviceaccounts:kasten-io\")"
    - name: isClusterAdmin
      expression: "request.userInfo.groups.exists(g, g == \"system:masters\")"
  validations:
    - expression: "variables.isKastenServiceAccount || variables.isClusterAdmin"
      messageExpression: "\"Only Kasten service accounts (system:serviceaccounts:kasten-io) or cluster-admin (system:masters) may delete RestorePoints. User deletions are blocked.\""
---
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicyBinding
metadata:
  name: kasten-restorepoint-delete-guard-binding
spec:
  policyName: kasten-restorepoint-delete-guard
  validationActions: ["Deny"]
```

```bash
kubectl apply -f vap-block-rp-deletion.yaml
```

### Step 3 — Verify the Policy Is Enforced

Whichever engine you picked, the behavior should look the same from the caller's side. Impersonate a regular user and try to delete a `RestorePoint` created by an earlier backup run:

```bash
kubectl delete restorepoint <restore-point-name> -n <app-namespace> \
  --as jamie --as-group developers
```

Expect a denial similar to:

```
Error from server: admission webhook denied the request:
Only K10 service accounts (system:serviceaccounts:kasten-io) or
cluster-admin may delete RestorePoints. User deletions are blocked.
```

Then confirm Kasten's own retirement flow still works by letting a policy's retention rule retire an expired restore point normally, or by deleting it as `cluster-admin`:

```bash
kubectl delete restorepoint <restore-point-name> -n <app-namespace> \
  --as admin --as-group system:masters
```

That second call should succeed — proof that the guardrail targets end users without breaking Kasten's internal retention and retirement processing.

## What to Keep in Mind

A few caveats worth internalizing before you take this beyond a KinD sandbox:

- This is a Technical Preview. The configuration surface, CRD coverage, and dashboard error reporting are all still in motion — don't build production enforcement on it yet.
- Enabling `services.aggregatedapis.admissionController=true` activates every existing policy that matches `kio.kasten.io` API groups at once. Audit what's already deployed in your cluster before flipping it on, and consider running new rules in Kyverno's `Audit` mode or a ValidatingAdmissionPolicy `Warn` action first.
- Webhooks must be dry-run safe (`sideEffects: None` or `NoneOnDryRun`). Kasten validates its own internal operations via dry-run, and a webhook that can't handle that will simply be skipped for those requests — which usually isn't what you want.
- Kasten aggregated API resources don't support in-place updates, so scope your policies to `CREATE` and `DELETE`.
- Remember to exempt `system:serviceaccounts:kasten-io` from any policy meant to constrain end users, or you risk breaking scheduled backups and retention processing.

## Where to Go Next

The pattern above — governing `Actions` and `RestorePoints` the same way you govern every other cluster resource — opens the door to a lot more than access deletion. Combine it with the label-based backup opt-out approach from [our earlier Kyverno post](https://veeamkasten.dev/implementing-opt-out-backup-strategy-with-kyverno) and you've got a genuinely comprehensive policy layer covering who can back up what, who can restore where, and who can delete recovery points and when.
