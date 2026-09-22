---
author: mattslotten
date: 2024-05-15 08:21:37 +0100
description: "Back to Basics: Business Continuity and Disaster Recovery (BCDR) Planning - Cloud Native Edition"
featured: false
image: "/images/posts/2024-05-15-cloud-native-dr/cndr_header.png"
image_caption: "Don't Cry Over Spilled Milk When It Comes to Cloud Native BCDR"
layout: post
published: true
tags: [cloud native, disaster recovery, business continuity]
title: "Business Continuity and Disaster Recovery Planning for Kubernetes"
---

# Preface

I am sometimes asked by partners, prospects, peers, and in the line at the supermarket, "What is Business Continuity and Disaster Recovery Planning for Cloud Native Workloads, and why should I care?" 

And while the answer may seem obvious to me and my peers at Veeam Kasten, our competitors, and partners, it may not always be so obvious to those dipping their toes into Cloud Native architectures with things like containers, helm charts, or kubevirt VMs.  After all, I thought Kubernetes is all stateless? Doesn't "big cloud" have my back? And can't I just stuff everything into GitOps and redeploy when the proverbial feces hit the large air circulator (by the way, when using that idiom, I like to imagine a ceiling fan because it just seems more festive)?

So without further ado, here's a list of considerations for Data Protection in the context of cloud native architectures, in no particular order


# What is Disaster Recovery for Cloud Native Workloads?
 
## Fundamental concepts to consider:

- **HA is Not DR** - All too often, we see organizations conflate high availability with disaster recovery, and it seems like some of the hyperscaler marketing teams may be keeping mum in the matter... or at least they're not actively refuting this as they don't want to add any friction to their procurement adoption (and honestly, can you blame them?). If I had a dollar for every time I've heard "We're protected because we're using _insert hyperscaler here_ I'd have at least five figures.
- **3-2-1-1 Principal** – Three copies of the data, on two different types of media, one of which is offsite, and one of which is “offline” (or in the case of K8s, immutable, since tape isn’t really a preferred approach for cloud native workloads for hopefully obvious reasons). It sounds basic (and it is), but it's incredibly important. We can somewhat "cheat" on the last 1-1 with S3 compatible storage if it supports immutability / object lock.
- **Think in app-centricity, not infra-centricity for DR** – K8s is to application workloads that vSphere is to VM workloads. But they obviously are not the same and they require different approaches to availability and DR. This is the reason we’ve architected Kasten to be cloud-native and to primarily focus on protecting namespaces/application resources, rather than the management plane, worker nodes, or etcd.
<p></p>
<img src="/images/posts/2024-05-15-cloud-native-dr/atom.png" alt="Backups as the Atomic Unit" style="float: left; margin: 10px" width="300" />

- **Backup as _the_ Atomic Unit** - Following from the above, it’s important to protect applications and their data in the same backup. Even if workloads in K8s is entirely ephemeral (i.e. stateless), app data has to live _somewhere_ and the application and data should be protected in an application consistent or logical manner. The best way to drive this home to organizations is to have them consider themselves in the “hot seat” during a disaster event. The question I typically ask, is “when you’re trying to get critical business systems back online, wouldn’t it be best to be able to restore an application and its data using the same tooling and approach, rather than having to piecewise restore components?” This has even greater gravity in the case of  microservice architectures, where we may be using **polyglot persistence** with different databases (e.g. mongoDB, PostgreSQL) in the same application. If we're using our respective database backup solutions and they're not in lock-step with each other or our application, we can imagine scenarios where our application doesn't come back cleanly, or worse we introduce transient security vulnerabilities that are publicly exposed while we're trying to get back online. One recent example of this was the <a href="https://www.theverge.com/2024/2/19/24077233/wyze-security-camera-breach-13000-customers-events" target="_blank">Wyze Camera Cloud Outage and Restoration</a>, which for a short time mapped the wrong camera feeds to the wrong users as the application was coming back online.
- **The best backup and DR approach is the transparent one** – leveraging cloud native philosophy, organizations should consider building backup and DR policies into their CI/CD pipelines and they should use a backup / data protection tool that espouses fundamental Kubernetes principals as opposed to just a "bolt-on" approach
- **Ensure the DR approach is aligned to an overall Business Continuity and DR Plan** - Often times, we see organizations try to throw the kitchen sink in for DR with everything having the most minimal RPO and RTO targets. Using this approach can tax infrastructure and engineering resources unnecessarily, resulting in none of the workloads hitting their targets and risk to the business should a disaster occur.
<p></p>
![Growing a DR Plan](/images/posts/2024-05-15-cloud-native-dr/plants.png)
- **Perform regular DR tests among sites** – this sounds like a “no-brainer,” but I’m still surprised at how often I see enterprises / agencies / organizations not do any DR testing. Like most things in life, DR testing can fall into a spectrum of maturity. To add some discrete examples, from “least mature” to “most mature”:
  1. **Paper-based DR Exercise** – Have a defined DR runbook and run through the motions of the exercise with the various engineers, ops teams, application, and business stakeholders, but don’t actually fail over/fail back any workloads
  2. **Recurring test with a subset of workloads, with scheduled outage** – Building on paper-based, testing a small subset of workloads and actually failing them over and back during a scheduled outage with the business at least once a year
  3. **Recurring test with all workloads, with a scheduled outage** – Regularly perform a full failover and restore back from site A to site B and back to site A with a scheduled outage
  4. **Recurring test with all workloads, no scheduled outage** – Regularly perform a full failover and restore back from site A to site B without any scheduled business outage. This requires the applications to be architected in such a way to support multi-site resiliency and scale (e.g. GSLB or cross-site ingress, dynamic scaling of pods, etc) so that the test is transparent to the business
  5. **Recurring failover test with all workloads, no scheduled outage** – Regularly perform a full failover from site A to site B, with workloads remaining in site B until the next test, when they are failed “back” to site A (or C, or D, etc). 
  6. **Continuous distribution across sites** – this is really a hybrid approach among HA and DR, with the goal being that the protected systems are distributed across multiple sites at all times, so that if a full site outage occurs, little to no intervention is needed from either the business or the systems teams. Worth noting that some organizations try to achieve this via synchronous replication of storage, although this is not an effective DR strategy – backup is still required to ensure workloads and data can be recovered in the event of accidental deletion or worse, a ransomware attack.  All too often we see organizations (and competitive vendors or products) tout metro/synchronous replication as a panacea, but the illustrative example is “what happens if one of your engineers accidentally mistypes a command and drops all database tables?” In the case of just synchronous replication, that gets replicated across the entire application and recovery becomes a real headache


## Summary

<img src="/images/posts/2024-05-15-cloud-native-dr/coveredcup.png" alt="Backups as the Atomic Unit" style="float: right; margin: 10px" width="300" />
Obviously Kasten can help organizations accommodate all of the above, while also fully integrating with their entire stack via native K8s APIs (e.g. Vanilla K8s, EKS, OpenShift, Rancher, K3s, ArgoCD, different storage offerings, GitHub actions, CI/CD pipeline, etc). But before we can start solutioning the <i>how</i>, we need to underscore the *why*. And while Kasten is not the only cloud native data protection solution, it is, in my humble opinion, the *best* solution. Hopefully organizations don't have to "cry over their spilled milk" first to realize why they need BCDR for Kubernetes.