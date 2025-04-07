---
layout: post
title: File Level Restore on Kubevirt with Kasten by Veeam
description: Kasten offers first class citizen support for VM with openshift virtualisation (backup, restore, migration ...). But restoring a full disk is not 
   always what you want. Often you want to do a much more granular restore called FLR (File Level Restore). Let's see how you can do that wit Kasten and OCP-V.
date: 2024-10-24 00:00:35 +0300
author: michaelcourcy
image: '/images/posts/2024-10-25-kubevirt-flr-and-kasten/openart-image_C8OrPOrw_1729860483529_raw.jpg'
image_caption: 'Doing File Level Restore with Kasten and Openshift Virtualisation'
tags: [File Level Restore, Kubevirt, Openshift virtualisation, Kasten, Kubernetes, Virtual Machine]
featured:
---

# What is File Level Restore ?

When you backup Virtual Machine your backup tool takes a full backup of the disks but the tool allow you to do granular restore to pick up only files or directory 
from your backup. This feature is called FLR for File Level Restore. 
  
There is strong reasons to do so : 
  - **Interruption of service** : If you do a full disk restore you often have to interrupt the machine or at least the services that depends on this disk 
  - **Risk** : Restarting a machine is always more risky than restoring a simple file
  - **Economic**: Restoring a full disk is not economic in term of transfer if all you need is restoring a bunch of files
  - **Granularity** : You really want to be granular, you just want to replace a specific file but not the rest.


If it's still interesting to bring FLR in the container world it has less value. In the container world, storage is made of `Image` which are immutable and `Volume` that can be mutable (for instance empty Dir or volume claim). Because a container starts very quickly, it's more economic and simple to restart the container on the restored PVC.

# But what about VM on Kubernetes (Kubevirt or openshift virtualisation)

VM on kubernetes are real VM. the kubernetes worker nodes act as an hypervisor and the pod (virt-launcher) is the process that handle the execution of the VM on the nodes.

When Kasten backup a VM on kubenetes it works with the kubevirt controller to make sure that VM consistent snapshots are taken and manage the protection and restorations of the snaphots. Kasten also handle the restart and reconfiguration of the restored VM, this operation is more complex than just copying the volumes and the machines manifests. 

But what about File Level Restore ? By default Kasten will do a full restore of the VM in the same namespace or in another namespace. 

However I want to show in this post that with a bit more manual operation you can do FLR.
 
# Let's create a VM and create some files in it 

Create a namespace flr-manual 
![Create namespace](../images/posts/2024-10-25-kubevirt-flr-and-kasten/create-namespace.png)

Use the openshift ui to create a VM from a template
![Create a vm](../images/posts/2024-10-25-kubevirt-flr-and-kasten/create-vm.png)

Choose the fedora-server-small template because it has source available (iso can be automatically obtained from a docker image) and it's easier.
![Choose fedora template](../images/posts/2024-10-25-kubevirt-flr-and-kasten/choose-fedora-server-small.png)

Use quick create 
![quick create](../images/posts/2024-10-25-kubevirt-flr-and-kasten/quick-create.png)

Wait for it to be running 
![vm running](../images/posts/2024-10-25-kubevirt-flr-and-kasten/vm-running.png)

Grab the user and password from the vm manifest
![User and password](../images/posts/2024-10-25-kubevirt-flr-and-kasten/find-user-password.png)

Go to console and login 
![Go to console and login](../images/posts/2024-10-25-kubevirt-flr-and-kasten/go-to-console.png)

I prefer to use `virtctl` so that I can stay in my shell
```
./virtctl console -n flr-manual fedora-orange-wasp-56
```

If you do `lsblk` you can see that the `/` directory is mounted on vda4
```
[root@fedora-orange-wasp-56 fedora]# lsblk
NAME   MAJ:MIN RM  SIZE RO TYPE MOUNTPOINTS
zram0  251:0    0  1.8G  0 disk [SWAP]
vda    252:0    0   30G  0 disk
├─vda1 252:1    0    2M  0 part
├─vda2 252:2    0  100M  0 part /boot/efi
├─vda3 252:3    0 1000M  0 part /boot
└─vda4 252:4    0 28.9G  0 part /var
                                /home
                                /
vdb    252:16   0    1M  0 disk
```

Let's create a file that we'll granulary restore
```
mkdir /test
date > /test/date.txt
```

# Protect your application VM with Kasten by Veeam 

Now let's go on Kasten and take a backup of the namespace we don't need to export but we could export as well.
![Snap the flr-manual application](../images/posts/2024-10-25-kubevirt-flr-and-kasten/snap-flr-manual-app.png)

Wait for the snap to finish 
![Snap finish](../images/posts/2024-10-25-kubevirt-flr-and-kasten/snap-finish.png)

# Restore the application in another namespace

Restore the application from the restorepoint in another namespace 
![Snap finish](../images/posts/2024-10-25-kubevirt-flr-and-kasten/restore-in-another-ns.png)

Apply a transform to not start the machine
![Snap finish](../images/posts/2024-10-25-kubevirt-flr-and-kasten/stop-vm-transform.png)

Because of this transform the machine won't restart and you have the guarantee that no files 
has been changed.

Wait for the restore to complete 
![Wait for restore to complete](../images/posts/2024-10-25-kubevirt-flr-and-kasten/wait-restore-complete.png)

# Attached the restored disk to your running machine 

Comeback to your running machine and use the openshift UI to configure storage  
![Configure storage](../images/posts/2024-10-25-kubevirt-flr-and-kasten/configure-storage-on-flr.png)

Choose add a disk 
![Add a disk](../images/posts/2024-10-25-kubevirt-flr-and-kasten/add-a-disk.png)

Select clone an existing pvc 
![Clone an existing pvc](../images/posts/2024-10-25-kubevirt-flr-and-kasten/clone-exixsting-pvc.png)

Select the restored namespace and the pvc 
![Choose FLR Restored](../images/posts/2024-10-25-kubevirt-flr-and-kasten/choose-flr-restored.png)

Observe the message in the console, you should see the OS sending event about the new disk attached.
You can also observe that it detect all the partitions that were created 
![Console messages](../images/posts/2024-10-25-kubevirt-flr-and-kasten/message-in-the-console.png)

# Now you can do file level restore

We need to mount the `sda4` partition, with `lsblk` you'll see the new block added to your machine: `vda` is the
actual mount and `sda` is the one you just attached.
![new lsblk](../images/posts/2024-10-25-kubevirt-flr-and-kasten/new-ls-blk.png)

Mount `sda4` to the `/backup` directory and do a file level restore ! 
![file level restore](../images/posts/2024-10-25-kubevirt-flr-and-kasten/file-level-restore.png)

# Clean up 

Now that your FLR is over it's time to clean up, first detach the disk 
![detach](../images/posts/2024-10-25-kubevirt-flr-and-kasten/detach.png)

And cleanup the cloned datavolume and the restored namespace
![clean up](../images/posts/2024-10-25-kubevirt-flr-and-kasten/clean-up.png)


# Conclusion

This demo shows that File Level Restore with Kasten By Veeam and Openshift Virtualisation is possible but involves
some manual operation. Thoses operation are not that complex though but require root access and a minimum of 
os skills.  If the volumes were belonging to a lvm group that would be slightly more complex but quite doable.

Kasten by Veeam is working on doing those operations even more simple and safe. Stay tuned ! 




