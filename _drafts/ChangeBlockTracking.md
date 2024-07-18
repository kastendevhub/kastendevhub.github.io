#  Accelerating Data Protection with Change Block Tracking

When IT, Virtualization, Backup, Storage, and Operations teams explore Kubernetes, they compare storage and data protection capabilities with traditional bare metal and Virtual Machine infrastructure facitilies. Because cloud native architecture is inherently distributed, API driven, and loosely coupled, cloud native operations require new tooling and skills to achieve the same business outcomes, such as disaster recovery. While many cloud native storage benefits are impressive, one critical area has been missing: change(d) block tracking (CBT).

In the simplest case, CBT improves [backup efficiency](https://en.wikipedia.org/wiki/Incremental_backup) by finding and transmitting only the difference between the current storage and the most recent backup. CBT could identify that there is little to no change since the last backup, making a nearly instant new backup with minimal resource consumption: time, CPU, memory, and storage. Making backup windows short and light weight helps organization schedule frequent backups to reduce a key disaster recovery metric: Recovery Point Objective.

If nearly every storage provider has CBT, then why does cloud native storage with Kubernetes not have it? A longer answer follows, but the short answer is: after two years of work, now it is coming! It is time for storage and backup vendors to develop prototypes, give feedback, and improve this industry-wide solution.

## Stateful Kubernetes Workloads and Storage

[Kubernetes just celebrated it's tenth birthday](https://www.cncf.io/blog/2024/06/07/kubernetes-is-ten-years-old/) and stateful workloads are normal today, but when Kubernetes released `StatefulSets` in 2018 it took time for [cloud native storage to follow and accelerate over the latter half of Kubernetes life](https://www.veeam.com/blog/stateful-vs-stateless-kubernetes.html).

The Container Storage Interface (CSI), version 1.0 was also adopted in 2018 with [Kubernetes 1.13](https://kubernetes.io/blog/2018/12/03/kubernetes-1-13-release-announcement/). CSI provides a uniform Application Programmer Inferface (API) for different storage providers. CSI is an independent consortium that publishes industry-wide specifications and storage vendors create CSI drivers, which are installed onto Kubernetes clusters. All of the proprietary, "in-tree" storage drivers in the Kubernetes code base are in process of removal or have been removed in favor of CSI. Fun fact: CSI is adopted by other cloud native platforms!

The [Kubernetes Data Protection Working Group](https://github.com/kubernetes/community/blob/master/wg-data-protection/README.md) (DPWG) was formed *when?* by the [Kubernetes Storage Special Interest Group](https://github.com/kubernetes/community/tree/master/sig-storage) (SIG-Storage).

In 2020, the CSI specification published `VolumeSnapShot`, which released in Kubernetes 1.20. Kubernetes backup and recovery could only deal with filesystems via CSI or resort to a proprietary storage driver before this time. CSI block storage backup became possible and faster than filesystem backup.

## Where is CBT?

What follows is a simplified series of events describing how CBT was added to CSI and Kubernetes, but you may wish to skip to the next section for the technical implementation.

In May 2022, DPWG began a [Kubernetes Enhancement Proposal (KEP) #3314](https://github.com/kubernetes/enhancements/pull/4082): Change Block Tracking. Veeam Kasten joined the effort. With guidance and review from SIG leadership, peer SIGS and vendors, and the Kubernetes community, the KEP went through three major redesigns. Each design progressed through repeated conceptual phase to design review and defense, every step improved the scope to address issues and gaps, particularly around the best manner for CBT to compliment Kubernetes architecture and security. SIG API, SIG Security reviews. At last, in 2023?, the third design was approved by the DPWG and a code prototype was completed, which allowed proposal to add CBT to the CSI specification.

The [CSI specification 1.11.0](https://github.com/container-storage-interface/spec/releases/tag/v1.10.0) with CBT via the `SnapshotMetadata` service was recently published, which allowed KEP-3314 status to become implementable in June, 2024. The initial target was Kubernetes 1.31 as alpha APIs with the prototype code, but gearing up pipelines to test, add documentation, and learning other Kubernetes and CSI maintainer tasks might cause it to slip.

## The Design of Cloud Native CBT

The audience are Backup and Storage vendors, the design consists of new:

- Kubernetes APIs, used by backup providers, which consume via gRPC:
- CSI CBT metadata service sidecar, provided by the storage vendor CSI driver

## Conclusion and Calls to Action

The journey to Cloud Native CBT has just begun the implementation phase. The K8s DPWG and CSI want your feedback on CBT!

At Kasten, our engineering culture onboarding deck contains [this quote](https://quoteinvestigator.com/2021/05/04/no-plan/):

> **No plan survives contact with the enemy.**
> Attributed to Helmuth von Moltke (“The Elder”), 1800-1891

As CBT enters alpha phase, please help us with CBT adoption and improvements: spread the word and provide feedback than can be incorporated into the beta phase. 

**For storage vendors**: is adopting CSI CBT as simple as exposing existing functionality via the new CSI CBT sidecar container API? That depends on the current architecture of the CSI driver and your underlying storage CBT functionality. Please let us know if the prototype example is helpful?

**For backup vendors**: shouldn't CBT adoption be as simple as consuming the new K8s APIs with a supporting CSI CBT storage vendor? Where are the mock providers and tests, do they meet your needs?

Veeam Kasten has put CSI-CBT on our roadmap: is it on yours?

We want CSI CBT to be a success, the DPWG meets bi-weekly, has a Slack channel and mailing list, and we're available to help answer your questions.

Every day more people ask: "is now the time to migrate to Kubernetes?" Bringing CBT to cloud native storage removes a critical disadvantage when compared to traditional infrastructure: longer recovery point and recovery time objectives. At Veeam Kasten, we have helped steward the data protection industry forward with the help of incredible partners in the K8s DPWG, CSI Consortium. We look forward to working with the entire cloud native ecosystem and community to implement CBT and drive world class, cloud native data protection forward!

