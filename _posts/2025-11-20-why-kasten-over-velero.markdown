---
layout: post
title: Why Choose Veeam Kasten Over Velero for Kubernetes Backup
description: Many customers ask why they should use Kasten, a commercial solution, rather than Velero, which is free and open source. This in-depth comparison explores enterprise support, security, compliance, operability, and consistency to explain why most organizations migrate from Velero to Kasten.
date: 2025-11-20 00:00:35 +0300
author: michaelcourcy
image: '/images/posts/2025-11-20-why-kasten-over-velero/kasten-over-velero-2.png'
image_caption: 'Why Choose Veeam Kasten Over Velero'
tags: [Kasten, Velero, Backup, Kubernetes, Enterprise, Security, Compliance]
featured:
---

Many customers ask us why they should use Veeam Kasten, a commercial solution, rather than Velero, which is free and open source. While the appeal of "free" is obvious, open source doesn't always translate to cost savings. In fact, most of our customers started with Velero and eventually migrated to Kasten. This article explores the key reasons why.

## Enterprise Support

The first critical difference is enterprise-level support. When you use an open-source tool and encounter a disaster—something unexpected, a bug, or a situation that no longer fits your environment—you have nowhere to turn. At best, you can post on a forum or GitHub and hope someone has time to respond. But you have absolutely no guarantees.

When business continuity is at stake and you can't restore your applications or recover your data, relying on community forums is unacceptable. You need someone accountable to help you.

But it goes beyond reactive support.

### Proactive Guidance from Day One

When you work with Kasten, we accompany you from the start. You'll have direct contact with a solution engineer or solution architect who will guide you on:

- How to install and configure K10
- What's possible, what's not recommended, and best practices
- Specific commitments tailored to your environment

But it' also 
- Our ability to patch quickly any security flaw 
- Our Customer Succes Management to onboard you 
- Our support 24/7 and even during the POC 

You're not alone—we show you how to install and operate Kasten successfully.

### Product Evolution Driven by Customer Needs

It's common for us to evolve our product directly for customers with specific requirements. Recently, a customer needed full Azure Managed Identity support across all operations. We didn't have complete coverage at that time, but we built it and delivered it quickly. Why? Because we work for our customers—not just a community, but real customers with real business needs.

## Security and Compliance

Security and compliance are the second major differentiators when comparing Kasten to Velero.

### Envelope Encryption

Kasten's security model is based on **envelope encryption**. A master key (KEK - Key Encryption Key) derives unique Data Encryption Keys (DEKs) for each backup. This approach offers:

- **Unique encryption per backup**: Even if a cloud provider could access your object storage, they cannot decrypt your backups without the master key
- **Key rotation**: You can rotate access to the master key, critical for maintaining encryption quality over time

With Velero, a single encryption key is reused across all backups. This is a significant security weakness, especially when you need to trust third-party storage providers or want the flexibility to move backup targets.

### Immutable Backups

Backup immutability is essential. Functional immutability means that even a rogue administrator with full access cannot delete your backups. They may destroy applications or infrastructure, but backups remain protected.

**Kasten supports immutable backups. Velero does not.**

### Auditability

Kasten is fully auditable. You can track exactly who did what and when. If someone deletes all restore points for an application, it's logged. Better yet, you can send audit data in real-time to a SIEM and trigger alerts on suspicious activity.

**Velero is not auditable.**

### Access Control and Authentication

Kasten integrates with enterprise authentication systems like LDAP, Active Directory, and OAuth2 providers. This allows precise control over who can access what within Kasten.

With Velero, only cluster administrators can perform backup and restore operations. If application teams need to restore or backup their workloads, they must go through cluster admins. This either increases your admin headcount or reduces application teams' ability to self-serve, both costly outcomes.

With Kasten, you can fully delegate backup and restore activities to application teams with granular RBAC.

### Compliance Certifications

Kasten is compliant with numerous industry standards:
- ISO 27001
- FIPS
- SOC 2
- HIPAA
- NIST
- Iron Bank

When you use Kasten, your backup and restore practices meet regulatory requirements your organization must follow. **Velero offers no similar compliance guarantees.**

## Operability

While you can do everything via command line, in practice, CLI-only tools create barriers. Application teams, in particular, need intuitive interfaces.

### Graphical User Interface

Kasten provides an excellent graphical interface that gives you a quick, comprehensive view of all operations. With Velero, you must execute terminal commands for every piece of information or action.

In combination with native Kubernetes RBAC rule, you can leverage the User Interface as a self-service portal for your application teams, your administrators or your backup teams.

This difficulty in operating Velero often leads organizations to under-protect applications or even abandon protection altogether. I've seen customers where Velero configuration became such a headache that disaster struck before they could protect critical workloads.

### Automatic Discovery

Kasten automatically discovers your applications, identifies what's inside them, and can even apply different backup methods based on the different services that compose the application. **Velero cannot do this.**

Over time, this GUI and automation have a massive impact on operational efficiency.

### Rich APIs

Even in the realm of command-line usage, Kasten offers much richer APIs than Velero. You can work with:
- Restore Points
- Backup Actions
- Export Actions
- Run Actions
- Restore Actions
- Retire Actions
- ... 

You can easily automate many backup-related operations. With Velero, this is much more complex or impossible.

This also makes it simple to integrate Kasten with CI/CD tools like Argo CD, Jenkins, Flux, etc. Everything you do in Kasten can be done via API. I've seen customers build simplified custom UIs that call Kasten APIs directly—something rarely seen with Velero.

### Monitoring and Metrics

Kasten's monitoring system is rich and allows you to trigger alerts on many aspects of backup operations. In contrast, Velero has very limited metrics (though it does expose basic Prometheus metrics on port 8085).

## Crash Consistency vs. Durability: Why Not Both?

In the backup world, there's a concept called **Crash Consistency**—capturing the entire filesystem at exactly the same moment, typically using storage provider snapshots.

Another aspect is **Durability**, creating backups that aren't co-located with your infrastructure, so if disaster strikes, backups survive in a different location and often a portable format.

Ideally, you want both qualities: crash consistent **and** durable.

### Velero's Limitation

**Velero cannot do both.** It can take snapshots that remain local to your infrastructure, but it cannot export them. It can create exports, but they're not crash consistent. You must choose between two evils.

**Kasten delivers both crash consistent and durable backups.**

### Serial Backup Problem

Velero's architecture uses a DaemonSet—an agent on each worker node that checks mount points and performs backups serially. If you have 2, 3, or 4 volumes attached to the same node, the agent backs them up one after another. You end up with volumes backed up at completely different times—sometimes with 30 minutes to an hour of lag for a single application.

When you restore, expect surprises.

You can use snapshots to avoid this, but then you can't export them, making your backup solution fragile. In my experience, snapshots alone are not durable.

### Application Consistency

Storage-level consistency is important, but there's also **application consistency**. For example, database transactions must be flushed to disk before taking a backup.

Kasten provides a dedicated framework for application consistency with hundreds of examples for different databases in various deployment contexts. Velero's support is extremely limited—you must introduce hooks in pod annotations that Velero executes when it discovers them. With Kasten, you can implement extremely complex workflows—or very simple ones—with the same ease. Application consistency is essential when working with a professional backup tool.

## Performance and Scalability

When it comes to backup performance and scalability, architecture matters. The way Kasten and Velero handle workload distribution reveals a fundamental difference in design philosophy and real-world efficiency.

### Kasten's Ephemeral Pod Architecture

Kasten uses **ephemeral pods** to export snapshots. When a backup export operation begins, Kasten spins up a dedicated pod that performs:
- Deduplication
- Encryption
- Compression

This pod leverages available cluster capacity during the export and is automatically terminated when the operation completes. This approach offers several critical advantages:

**Dynamic resource utilization**: Kasten can scale horizontally across the cluster, using available capacity wherever it exists. If you have worker nodes with substantial CPU and memory available, Kasten can spin up multiple export pods simultaneously to parallelize backup operations.

**No wasted resources**: Pods only consume resources during active backup operations. When exports finish, those resources return to the pool for application workloads.

**Efficient parallelization**: Multiple applications can be backed up simultaneously, each with dedicated pods, dramatically reducing backup windows for large environments.

**Flexible placement**: Kubernetes scheduler determines optimal pod placement based on current cluster load, node affinity, and resource availability.

### Velero's DaemonSet Constraint

Velero's architecture relies on a **DaemonSet**—one agent per worker node that handles file-level backups. While this seems reasonable at first glance, it creates significant scalability bottlenecks:

**Fixed resource allocation**: The DaemonSet pod on each node has a fixed resource request/limit. Even if a worker node has abundant spare capacity, Velero cannot leverage it because the agent is already sized.

**No horizontal scaling**: You cannot scale backup operations by adding more Velero agents to a node. You're limited to one agent per node, regardless of workload.

**Serial processing per node**: As mentioned earlier, if multiple volumes are attached to the same node, the DaemonSet agent processes them serially—one after another. This creates long backup windows and inconsistency issues.

**Resource contention**: The DaemonSet pod competes with application workloads for resources on the node. During intensive backup operations, this can impact application performance.

### Real-World Impact

In environments with dozens or hundreds of applications, this architectural difference becomes stark:

- **Kasten** can scale backup operations to match cluster capacity, completing backups faster and within maintenance windows
- **Velero** is constrained by DaemonSet architecture, leading to longer backup windows, potential timeout issues, and inability to leverage available cluster resources effectively

For organizations running large-scale Kubernetes deployments, Kasten's ability to dynamically scale backup operations horizontally across the cluster is a critical advantage that directly impacts Recovery Time Objectives (RTO) and operational efficiency.

## Snapshot Export: A Game Changer

A critical feature many organizations need is the ability to export CSI or cloud-provider snapshots to a different region or cloud. **Velero cannot export snapshots.** Snapshots remain in the source region and cannot be moved.

### Your Options with Velero

1. **Restic/Kopia file-level backup**: Portable but much slower and more expensive in bandwidth/storage
2. **Manual snapshot copy**: Out-of-band from Velero, requires custom automation, only works within the same cloud

### Kasten's Solution

Veeam Kasten natively supports:
- Snapshot export to object storage (S3, Azure Blob, GCS)
- Converts cloud snapshots into a portable format
- Cross-region and cross-cloud restores from exported snapshots
- Works with both CSI and cloud-provider snapshots

This is a key differentiator for organizations needing multi-region or multi-cloud disaster recovery.

## Conclusion

If enterprise support is extremely important to me when managing something as sensitive as business continuity, having weak security or a difficult-to-operate backup solution will quickly cost you far more than investing in a professional backup tool supported by a solid company.

The reality is that "free" open source often comes with hidden costs:
- Lack of support when you need it most
- Security gaps that put your data at risk
- Poor operability that leads to under-protected workloads
- Technical limitations that force compromises between consistency and durability

Most organizations that start with Velero eventually migrate to Veeam Kasten when they realize these costs. The question isn't whether to invest in a professional backup solution—it's whether to invest before or after a disaster.
