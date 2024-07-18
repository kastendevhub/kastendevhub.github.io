---
author:
  - dsu
  - mlavi
date: 2024-01-16 11:18:44 -0600
description: "etcd Backup Strategy and Constraints"
featured: false
#image: '/images/posts/2024-01-16-etcd_backup/IMAGE'
#image_caption: 'CAPTION'
layout: post
published: false
tags: ['etcd', 'backup']
title: "etcd Backups: Why, How, and Why Not"
---
Original DSU work: https://veeamsoftwarecorp-my.sharepoint.com/:w:/g/personal/dave_smithuchida_veeam_com/ERwl3WgpXO5SxQDbEWaj1ucBnm3yoLASH59jTYlxKRs_NQ?e=lIzWau

---

I've been working on Kubernetes Data Protection Working Group for four years. As part of SIG-Storage, the working group covers backup and recovery of Kubernetes and cloud native workloads. A frequent ask to the working group is "how do I back up my `etcd` database?" Often, the requestor ends up wanting something other than the direct answer this simple question. I'm going to say up-front: protecting your Kubernetes cluster by backing up and restoring the `etcd` database is not a great solution. There are better solutions for protecting your cluster, so let us examine what is really needed and how we best to solve it. 

Kubernetes, consists of a set of resources and controllers that respond to changes in the resources by taking action(s) and updating the resources with the results. The resources reside in the Kubernetes API server, which commonly uses the `etcd` distributed database for storage.  

A key difference between Kubernetes and traditional systems is that Kubernetes is not self contained. It interacts with and controls outside resources, which is very different from traditional systems, such as an application installed inside of a virtual machine (VM). In traditional systems, backing up the VM disks  effectively backed up the entire application because there was nothing outside that was connected to it. In other words, the entire application was deployed as a single, monolithic VM without external dependencies. Restoring the disks to a point-in-time meant restoring the application to that point-in-time. To capture an entire Kubernetes cluster, external entities such as: worker nodes, load balancers, virtual disks, databases and many others need to be protected, including the relationship between all the Kubernetes resources and the external entities: it is a distributed system.

Loss of `etcd` means the loss of all of your Kubernetes resources and the Kubernetes cluster is no longer functional. Some applications may continue to function with the Kubernetes control plane offline, but there would be no ability to make changes or fix problems. 

Recovery from the loss of the `etcd` database becomes a critical capability for anyone running Kubernetes in production: they need to have a plan for dealing with that situation. The opening question now evolves to: "How can I backup *and* restore `etcd`?" Let's dig into the potential sources for loss and then match them to the correct solution to protecting your Kubernetes cluster. 

# How Can the `etcd` Database/API Server be Lost?

There are major four sources of failure:

**Storage issue:** the storage that the `etcd` database is running on is compromised. While `etcd` is highly resilient to failure, by spreading its data across multiple nodes, it's also important to insure the storage itself is distributed properly. For example, if all of the volumes for the `etcd` database are hosted in the same disk array, loss of that disk array is a single point of failure. In a cloud deployment, spreading `etcd` across multiple availability zones is necessary to avoid complete failure.

**Corruption:** If the `etcd` database becomes corrupted, the cluster will become unusable.

**Human Error:** Deletion of critical resources or mistakes during patching can leave the cluster in a non-functional state.

**Loss of quorum:** `etcd` requires that a minimum quorum of nodes be available at all times. In the event that the minimum quorum is not available, the `etcd` database will shut down, requring manual intervention to bring the database back on line.

# Ways to Recover the Kubernetes State in the API server 

## Reapply the Resources 

This is the classic Kubernetes answer, sometimes referred to as "GitOps." If all of your resource definitions have been stored properly as YAML files in `git`, or another version control system, you can create a new Kubernetes cluster, re-apply the resources, and Kubernetes can restart the applications running in your cluster.

However, any state not stored in `git` will be lost. For example, it is common to have a database or other data service running in your cluster which store data in dynamically allocated Persistent Volumes. The peristenet volumes will be re-created as an empty database when your Kubernetes resource definitions are re-applied. If your application kept state in the Kubernetes API server, but the configration was not kept in `git`, such as Config Maps or Custom Resources that were created or updated after deployment, that state will be lost when the resource definitions are re-applied.

As Kubernetes evolves, state has begun to creep in many ways that are not always obvious. Consider a Kubernetes cluster using a cloud database service. Originally, the database was created manually and the endpoint and credentials were stored in `git`. However, the scale of the system has outgrown a single database and a single Kubernetes cluster. Use of a Kubernetes Operator to deploy and manage the cloud database was introduced and the information in `git` was changed to only be the Database Custom Resource that tells the Operator the database configuration. The Operator now handles the creation of the external database and stores the endpoint and credentials in the Kubernetes cluster. These values are unique to each of cluster and these values are no longer in `git`! So GitOps can no longer restore the cluster to its working state in this example.  (GitOps is still very valuable for managing your configuration and rolling out upgrades, etc. It's just not a disaster recovery solution).

And then there's understanding your use cases. Re-applying the resource definitions is often used in two ways - creating a new cluster and trying to recover an old cluster. When the cluster is truly stateless there's no real difference between the two. However, once state has been introduced, recovering an existing cluster often means you want the state stored by the cluster to be recovered as well. Even if all the state is external to Kubernetes you want the cluster to re-attach to any external entities instead of creating new, empty entities. This is a very different scenario than creating a new cluster and simply re-applying resource definitions will not give you the results you want. 

## Backup of etcd via etcd volume backup or etcd backup/restore tools 

 

This approach dumps the state of the etcd database and you can later bring it back to exactly the same state that it was at the time of the backup. All state stored in etcd will be backed up and restored, including Kubernetes state that was not kept in git. While this may seem like good protection, because of the nature of Kubernetes it is actually very fragile, even for just protecting the state of the Kubernetes resources. The only way a cluster can be recovered is if the persistent volumes, worker nodes, and any other external state remain the same and can be re-adopted properly. Kubernetes is dynamic, though, and changes can happen at any time and then instead of being able to recover the cluster from the etcd backup you'll simply be left with a broken cluster.

What kind of changes can happen? Pods can move between worker nodes and any volumes they were using get mounted on different worker nodes. The number of volumes may change. Worker nodes could be added or removed from the system. 

The etcd approach is limited in other ways as well. You won't be able to restore a single namespace or other subparts of the cluster. Rollback to an old backup of the etcd database usually won't work. You won't be able to duplicate the cluster, perhaps for testing, because restoring the etcd database into another cluster won't work. 

Furthermore, many managed Kubernetes offerings do not allow direct access to the etcd database. 

## Backup of API server resources with external state 

Most Kubernetes backup products, including Kasten K10, do this - it's the most flexible approach and covers the most different scenarios. Resources are accessed via the API server and backed up. External data stores such as Persistent Volumes are recognized during the backup process and stored as well. Application state stored in the API server is backed up. On restore, since the backup application is working at the Resource level, it can understand the resources and has the ability to transform them as necessary. This allows for the disaster recovery, rollback and clone/migration cases to be selected and handled. Pieces of the cluster can be restored individually as well - you can restore a single application, namespace or items selected by a label.

# Which one should you use?

## Backup of API resources with external state

This covers the most cases. You can survive loss of data centers, loss of storage, ransomware and mistakes. You can recover into an existing cluster or create a new cluster. You can roll back to older configurations of the cluster. All of the data stored in your cluster, not just the data in etcd, can be protected. We recommend that you protect your clusters with a tool such as Kasten K10 that uses this approach. This method backs up all of the data that an etcd dump would protect plus more, will work in many more scenarios and is compatible with GitOps workflows.

## GitOps

If your application is truly stateless, GitOps can be your recovery plan.  For this to work, you need to be very diligent about keeping your application truly stateless and ensuring that your recovery plan actually will work as expected. Outside of disaster recovery, GitOps is a good practice and should be considered even if you have a separate backup/restore system in place. 

## etcd database backup 

 There are very few cases where this is a good idea. Pretty much if you're asking, you probably shouldn't be using this approach. If your only concern is immediate disaster recovery of your cluster, etcd backup/restore can get you back to a working state fairly quickly. You'll need to be very knowledgable about Kubernetes and be able to reintegrate a working cluster. If you have any state outside of your etcd database you run the real risk of losing it. If you don't take backups of your etcd database after every change to the cluster you can wind up in a broken state and as Kubernetes applications become more sophisticated the cluster gets changed more and more often.

# Do it the right way 

We recommend you use a tool designed for protecting Kuberneters clusters for your needs and don't try to handle it with the etcd dump approach. One thing to remember is that it's not the backup, but the restore where you'll feel the pain. You should test your recovery plan and make sure that you can recover from a variety of scenarios. Hopefully you'll never have to recover from a disaster, but most of us will and it never happens at a convenient time. Making sure that your recovery process works smoothly will make you much happier when you need to use it.
