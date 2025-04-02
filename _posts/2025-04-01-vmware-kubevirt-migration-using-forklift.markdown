---
layout: post
title: VMware KubeVirt Migration Using Forklift
description: In this blog post, I discuss about migrating virtual machines from VMware to a Kubernetes cluster running KubeVirt using Forklift tool
date: 2025-04-01 11:00:00 +0000
author: satheeshmohandass
image: '/images/posts/2025-04-01-VMware-KubeVirt-migration-using-forklift/forklift.png'
image_caption: 'Migrate to KubeVirt using Forklift'
tags: [VMware, migration, forklift, KubeVirt, kasten]
featured: false
---

Broadcom's strategic pricing changes for VMware have sparked significant conversations within the tech community. With potential increases in licensing costs and the introduction of new pricing models, many organizations are now actively seeking alternatives. While customers are evaluating various options such as Proxmox, Hyper-V and Nutanix, one of the compelling alternative is KubeVirt. 

## What is KubeVirt?

KubeVirt is an extension of Kubernetes that enables users to run and manage virtual machines alongside containerized applications, providing a unified platform for both environments. Some of the key reasons why KubeVirt stands out as a visible alternatives are 

- Unified Management - KubeVirt allows organizations to manage both virtual machines and containerized applications within a single Kubernetes environment
- Cost Efficiency - By leveraging existing Kubernetes infrastructure, KubeVirt can help organizations reduce costs associated with licensing and infrastructure management
- Cloud-Native Integration - As organizations increasingly adopt cloud-native technologies, KubeVirt enables seamless integration with other cloud-native tools and services within the Kubernetes ecosystem
- Vendor Independence - By using KubeVirt, organizations can avoid vendor lock-in associated with proprietary solutions like VMware.
- Support for Legacy Applications - KubeVirt provides a pathway to modernize legacy applications without having to completely re-architect legacy applications
- Future-Proofing - As the industry evolves towards cloud-native and containerized environments, adopting KubeVirt positions organizations to stay ahead of the curve and embrace emerging technologies and practices

any many more….


In this blog, I walk through the steps on how a virtual machine, running on VMware Infrastructure can be migrated to a Kubernetes clusters as KubeVirt VM using Forklift. 

## What is Forklift?

Forklift is an open-source tool designed to facilitate the migration of virtual machines (VMs) between various virtualization platforms and cloud providers, enabling organizations to move workloads seamlessly across different environments. The tool automates many aspects of the migration process, reducing the manual effort required and minimizing the risk of errors. This automation can include tasks such as converting VM formats, configuring network settings, and handling storage requirements and thus making it a good tool to migrate VMs from VMware to Kubernetes.

In my setup, I have the following 

- Single node kubernetes cluster built using kubeadm 
- Storage configured using hostpath-csi driver
- podman configured on the jump host connecting to the kubernetes cluster
- VMware ESXi 7.0.u2 with vSphere 7.0.3
- Centos9 Virtual machine with (16 GB disk)

```
kubectl get nodes
NAME                             STATUS   ROLES           AGE     VERSION
k8s-cluster-centos.sbmlabs.net   Ready    control-plane   3d15h   v1.31.7

kubectl get sc
NAME                        PROVISIONER           RECLAIMPOLICY   VOLUMEBINDINGMODE   ALLOWVOLUMEEXPANSION   AGE
csi-hostpath-sc (default)   hostpath.csi.k8s.io   Delete          Immediate           true                   2d14h
```

## Pre-Configuration

During my testing, I found that the KubeVirt and forklift pods fails with error 

```
Failed to create an inotify watcher, too many open files
```

To resolve this error, I had to update the system configuration. Open the file `/etc/sysctl.conf` and add the following  

```
fs.inotify.max_user_watches=999999
fs.inotify.max_user_instances=999999
fs.inotify.max_queued_events=999999
```
Apply the change by running `sysctl -p`

Edit the file `/var/lib/kubelet/config.yaml` and add the following 

```
maxOpenFiles: 131070
failSwapOn: true
```
Reboot the node for the changes to effect. 

{: .alert-info }
Note: if you are running on a multi-node kubernetes cluster, the changes need to be applied on all nodes.

## Install KubeVirt

Now that I have a kubernetes cluster with storage configured, the next step is to install KubeVirt. 

```
export VERSION=$(curl -s https://storage.googleapis.com/KubeVirt-prow/release/KubeVirt/KubeVirt/stable.txt)
echo $VERSION
kubectl create -f "https://github.com/KubeVirt/KubeVirt/releases/download/${VERSION}/KubeVirt-operator.yaml"
kubectl create -f "https://github.com/KubeVirt/KubeVirt/releases/download/${VERSION}/KubeVirt-cr.yaml"
```

Verify if KubeVirt is successfully deployed. This will take a few mins for all pods to successfully deploy.

```
kubectl get KubeVirt.KubeVirt.io/KubeVirt -n KubeVirt -o=jsonpath="{.status.phase}"
Deployed
```

## Install virtctl

virtctl is a command-line utility provided by KubeVirt. virtctl acts as a client tool to interact with KubeVirt resources, such as virtual machines, virtual machine instances (VMIs), and related components. It is similar to kubectl but provides additional commands specifically for managing virtual machines in a Kubernetes environment.

```
export VERSION=$(curl https://storage.googleapis.com/KubeVirt-prow/release/KubeVirt/KubeVirt/stable.txt)
sudo wget https://github.com/KubeVirt/KubeVirt/releases/download/${VERSION}/virtctl-${VERSION}-linux-amd64 
sudo chmod +x virtctl-v1.5.0-linux-amd64
sudo mv virtctl-v1.5.0-linux-amd64 /usr/local/bin/virtctl
```

## Install Operator Lifecycle Manager

The Operator Lifecycle Manager (OLM) is a component of the Kubernetes ecosystem that helps manage the lifecycle of Kubernetes Operators. It is part of the Operator Framework, which provides tools to build, package, and manage Kubernetes Operators. Since Forklift gets deployed and is managed as an operator, the kubernetes cluster needs olm to manage it. 

```
kubectl apply -f https://raw.githubusercontent.com/operator-framework/operator-lifecycle-manager/master/deploy/upstream/quickstart/crds.yaml
kubectl apply -f https://raw.githubusercontent.com/operator-framework/operator-lifecycle-manager/master/deploy/upstream/quickstart/olm.yaml
```
Verify if all pods are running 

```
kubectl -n olm get pods
NAME                                READY   STATUS    RESTARTS   AGE
catalog-operator-74846dffc9-mvqsw   1/1     Running   0          102s
olm-operator-5898bd86cf-25mzl       1/1     Running   0          102s
operatorhubio-catalog-n49h9         1/1     Running   0          73s
packageserver-88fd54546-r4mts       1/1     Running   0          72s
packageserver-88fd54546-w6h5k       1/1     Running   0          72s
```

## Install Cert Manager

```
wget https://get.helm.sh/helm-v3.17.2-linux-amd64.tar.gz
tar -zxvf helm-v3.17.2-linux-amd64.tar.gz
mv linux-amd64/helm /usr/local/bin/helm
rm -rf linux-amd64

helm repo add jetstack https://charts.jetstack.io --force-update
helm install cert-manager jetstack/cert-manager \
    --namespace cert-manager  \
    --create-namespace  \
    --version v1.17.0  \
    --set crds.enabled=true
```
Verify if all pods are running 

```
kubectl get pods -n cert-manager
NAME                                       READY   STATUS    RESTARTS   AGE
cert-manager-665948465f-wwwff              1/1     Running   0          59s
cert-manager-cainjector-7c8f7984fb-qlzf9   1/1     Running   0          59s
cert-manager-webhook-7594bcdb99-dvtsg      1/1     Running   0          59s
```

## Install Multus

Multus CNI is a Kubernetes Container Network Interface (CNI) plugin that enables the attachment of multiple network interfaces to a single pod. By default, Kubernetes only supports a single network interface per pod (managed by the primary CNI plugin). Multus extends this capability, allowing pods to connect to multiple networks, which is useful for advanced networking use cases.

Apply the Multus CNI manifest
```
kubectl apply -f https://raw.githubusercontent.com/k8snetworkplumbingwg/multus-cni/master/deployments/multus-daemonset.yml
```
Verify that the Multus pod is running:
```
kubectl get pods -n kube-system | grep multus
kube-multus-ds-hs88l                                      1/1     Running   0          51s
```
Verify the CRDs and API Group
```
kubectl get crds | grep k8s.cni.cncf.io
network-attachment-definitions.k8s.cni.cncf.io                2025-03-24T23:55:41Z

kubectl api-resources | grep cni
network-attachment-definitions       net-attach-def                                            k8s.cni.cncf.io/v1                  true         NetworkAttachmentDefinition
```

## Install CDI

KubeVirt CDI (Containerized Data Importer) is a tool designed to manage the lifecycle of virtual machine disk images in a KubeVirt environment. It simplifies the process of importing, uploading, and cloning virtual machine (VM) disk images, making it easier to manage storage for virtual machines running in Kubernetes. CDI is an integral part of the KubeVirt ecosystem, which enables running virtual machines alongside containers in Kubernetes

```
export CDI_VERSION=$(curl -s https://api.github.com/repos/KubeVirt/containerized-data-importer/releases/latest | grep tag_name | cut -d '"' -f 4)
kubectl apply -f https://github.com/KubeVirt/containerized-data-importer/releases/download/${CDI_VERSION}/cdi-operator.yaml
kubectl apply -f https://github.com/KubeVirt/containerized-data-importer/releases/download/${CDI_VERSION}/cdi-cr.yaml
```

Verify if all the CDI components are running

```
kubectl get pods -n cdi
NAME                              READY   STATUS    RESTARTS   AGE
cdi-apiserver-ddf4cf4c9-4224k     1/1     Running   0          32s
cdi-deployment-97b74b546-6js6s    1/1     Running   0          32s
cdi-operator-866df967f8-v7rmd     1/1     Running   0          53s
cdi-uploadproxy-69cd77cb7-9qxr6   1/1     Running   0          31s
```

Verify the CRDS are installed

```
kubectl get crds | grep cdi.KubeVirt.io
cdiconfigs.cdi.KubeVirt.io                                    2025-03-24T23:59:33Z
cdis.cdi.KubeVirt.io                                          2025-03-24T23:59:14Z
dataimportcrons.cdi.KubeVirt.io                               2025-03-24T23:59:33Z
datasources.cdi.KubeVirt.io                                   2025-03-24T23:59:33Z
datavolumes.cdi.KubeVirt.io                                   2025-03-24T23:59:33Z
objecttransfers.cdi.KubeVirt.io                               2025-03-24T23:59:33Z
openstackvolumepopulators.forklift.cdi.KubeVirt.io            2025-03-24T23:59:34Z
ovirtvolumepopulators.forklift.cdi.KubeVirt.io                2025-03-24T23:59:34Z
storageprofiles.cdi.KubeVirt.io                               2025-03-24T23:59:33Z
volumeclonesources.cdi.KubeVirt.io                            2025-03-24T23:59:33Z
volumeimportsources.cdi.KubeVirt.io                           2025-03-24T23:59:33Z
volumeuploadsources.cdi.KubeVirt.io                           2025-03-24T23:59:33Z
```

When KubeVirt CDI is successfully installed, it creates a storageprofile with the same name as the storageclass that exist on the cluster. In my environment, a storageprofile was created with the name csi-hostpath-sc. This storageprofile created by the api cdi.KubeVirt.io missed the accessModes and volumeMode parameters. I had to add them manually by patching the storageprofile.

```
kubectl patch storageprofile csi-hostpath-sc --type=merge -p "$(cat << EOM
spec:
  claimPropertySets:
  - accessModes:
    - ReadWriteOnce
    volumeMode: Filesystem
EOM
)"
```

{: .alert-info }
Note: depending on the storage and csi driver you use on your environment, this extra patching might not be needed. Check the spec of the storageprofile and if the accessModes and volumeMode is defined, the patching can be skipped.

For more information on CDI storageprofile see [link](https://github.com/KubeVirt/containerized-data-importer/blob/main/doc/storageprofile.md)

## Install Forklift

The installation process of forklift involves building the image from the repo and uploading to your image registry. 

Set these environment variables for your image registry.

```
export REGISTRY_TAG=latest
export REGISTRY_ORG=<your-registry-organization>
export REGISTRY=<your-registry>
export VERSION=1.0.0
export NAMESPACE=konveyor-forklift
```

Clone the Forklift github project

```
git clone https://github.com/kubev2v/forklift.git
cd forklift
```
Create the namespace where forklift will be installed. 
```
kubectl create ns konveyor-forklift
```

Custom build of the controller, operator, bundle and index which will be deployed to the cluster

```
podman login <your-registry>
make push-controller-image
make push-operator-bundle-image
make push-operator-index-image
```
Update the file operator/forklift-operator-catalog.yaml from the downloaded repo and change the namespace from openshift-marketplace to konveyor-forklift

```
make deploy-operator-index
make push-operator-image
```

Create forklift operatorgroup

```
cat <<EOF | kubectl create -f -
apiVersion: operators.coreos.com/v1
kind: OperatorGroup
metadata:
  name: migration
  namespace: konveyor-forklift
spec:
  targetNamespaces:
    - konveyor-forklift
EOF
```

Create forklift subscription

```
cat <<EOF | kubectl create -f -
apiVersion: operators.coreos.com/v1alpha1
kind: Subscription
metadata:
  name: forklift-operator
  namespace: konveyor-forklift
spec:
  channel: development
  installPlanApproval: Automatic
  name: forklift-operator
  source: konveyor-forklift
  sourceNamespace: konveyor-forklift
EOF
```

You should now see the following pods running on konveyor-forklift namespace.

```
kubectl get pods -n konveyor-forklift 
NAME                                                              READY   STATUS      RESTARTS      AGE
6fcbc6af01a43133c23405fe25198277fca355c18e1267c12ed59524248n2pt   0/1     Completed   0             108m
forklift-operator-56596856bc-jzp47                                1/1     Running     2 (90m ago)   108m
konveyor-forklift-k7xsm                                           1/1     Running     2 (90m ago)   109m
```

Create Forklift Controller

```
cat << EOF | kubectl -n konveyor-forklift apply -f -
apiVersion: forklift.konveyor.io/v1beta1
kind: ForkliftController
metadata:
  name: forklift-controller
  namespace: konveyor-forklift
spec: {}
EOF
```

Verify if all the forklift pods are running 

```
kubectl get pods -n konveyor-forklift
NAME                                                              READY   STATUS      RESTARTS   AGE
6fcbc6af01a43133c23405fe25198277fca355c18e1267c12ed5952424v7prh   0/1     Completed   0          8m37s
forklift-api-6dff4d75ff-ngb8z                                     1/1     Running     0          2m22s
forklift-controller-784cd8585-x5qm9                               2/2     Running     0          2m44s
forklift-operator-56596856bc-c9skg                                1/1     Running     0          7m56s
forklift-validation-546457c4b7-pzq8v                              1/1     Running     0          25s
forklift-volume-populator-controller-765599cfcf-26psr             1/1     Running     0          2m41s
konveyor-forklift-rpn24                                           1/1     Running     0          16m
```

You should now see a provider created with the name host that points to the kubernetes cluster.

```
kubectl get Provider -A
NAMESPACE           NAME              TYPE        STATUS   READY   CONNECTED   INVENTORY   URL                                   AGE
konveyor-forklift   host              openshift   Ready    True    True        True                                              3m33s
```

{: .alert-info }
Note: disregard the type openshift.

#### Create a VMware Provider

Create a secret with the credentials for connecting to Vsphere. 

{: .alert-info }
Note: the data fields provided here are base64 encoded values

```
cat <<EOF | kubectl create -f - 
apiVersion: v1
data:
  insecureSkipVerify: dHJ1ZQ==
  url: <base64 value of vsphere URL Ex: https://<vsphere-host-name>/sdk>
  user: <base64 value of vsphere administrator user>
  password: <base64 value of vsphere password>
kind: Secret
metadata:
  name: VMware-secret
  namespace: konveyor-forklift
type: Opaque
EOF
```

Create the provider

```
cat <<EOF | kubectl create -f - 
apiVersion: forklift.konveyor.io/v1beta1
kind: Provider
metadata:
  annotations:
    forklift.konveyor.io/empty-vddk-init-image: 'yes'
  name: VMware
  namespace: konveyor-forklift
spec:
  secret:
    name: VMware-secret
    namespace: konveyor-forklift
  settings:
    sdkEndpoint: vcenter
  type: vsphere
  url: 'https://<vsphere-host-name>/sdk'
EOF
```

If forklift is able to successfully connect to vSphere and complete an inventory, you should see the status for VMware-provider as Ready. If the Provider status is stuck at Staging, review the logs of the inventory container from the forklift-controller pod in the konveyor-forklift namespace for errors.

```
kubectl get Provider -A
NAMESPACE           NAME              TYPE        STATUS   READY   CONNECTED   INVENTORY   URL                                   AGE
konveyor-forklift   host              openshift   Ready    True    True        True                                              3m33s
konveyor-forklift   VMware-provider   vsphere     Ready    True    True        True        https://shield-vcsa.sbmlabs.net/sdk   2m49s
```

### Create the NetworkMap

Forklift NetworkMap is a feature within the Forklift project used to manage the networking aspects of migrating VMs from one environment to another. In the example below, I am mapping network network-1008 on my VMware infrastructure to the pod network on the kubernetes cluster. 

```
cat <<EOF | kubectl create -f - 
apiVersion: forklift.konveyor.io/v1beta1
kind: NetworkMap
metadata:
  name: migration-network-map
  namespace: konveyor-forklift
spec:
  map:
    - destination:
        type: pod
      source:
        id: network-1008
  provider:
    destination:
      apiVersion: forklift.konveyor.io/v1beta1
      kind: Provider
      name: host
      namespace: konveyor-forklift
    source:
      apiVersion: forklift.konveyor.io/v1beta1
      kind: Provider
      name: VMware
      namespace: konveyor-forklift
EOF
```

Verify that NetworkMap is in Ready state

```
kubectl get networkmap
NAME                    READY   AGE
migration-network-map   True    10s
```

Create the StorageMap

Similar to NetworkMap, StorageMap maps the storage aspects when migrating VMs from one environment to another. In the example below, I am mapping VMware datastore datastore-1007 to csi-hostpath-sc storage class on the kubernetes cluster.
```
cat <<EOF | kubectl create -f - 
apiVersion: forklift.konveyor.io/v1beta1
kind: StorageMap
metadata:
  name: migration-storage-map
  namespace: konveyor-forklift
spec:
  map:
    - destination:
        storageClass: csi-hostpath-sc
      source:
        id: datastore-1007
  provider:
    destination:
      apiVersion: forklift.konveyor.io/v1beta1
      kind: Provider
      name: host
      namespace: konveyor-forklift
    source:
      apiVersion: forklift.konveyor.io/v1beta1
      kind: Provider
      name: VMware
      namespace: konveyor-forklift
EOF
```

Verify that StorageMap is in Ready state

```
kubectl get storagemap
NAME                    READY   AGE
migration-storage-map   True    17s
```

Create a Migration Plan

Forklift migration plan defines the source VMs, the target Kubernetes namespace, storage, and network configurations to be used for the migration process.

```
cat <<EOF | kubectl create -f - 
apiVersion: forklift.konveyor.io/v1beta1
kind: Plan
metadata:
  annotations:
    populatorLabels: 'True'
  name: plan-migration-test-vm1
  namespace: konveyor-forklift
spec:
  map:
    network:
      apiVersion: forklift.konveyor.io/v1beta1
      kind: NetworkMap
      name: migration-network-map
      namespace: konveyor-forklift
    storage:
      apiVersion: forklift.konveyor.io/v1beta1
      kind: StorageMap
      name: migration-storage-map
      namespace: konveyor-forklift
  migrateSharedDisks: true
  provider:
    destination:
      apiVersion: forklift.konveyor.io/v1beta1
      kind: Provider
      name: host
      namespace: konveyor-forklift
    source:
      apiVersion: forklift.konveyor.io/v1beta1
      kind: Provider
      name: VMware
      namespace: konveyor-forklift
  targetNamespace: konveyor-forklift
  vms:
    - id: vm-1019
      name: migration-test-vm1
EOF
```
Verify the Plan is ready for execution.

```
kubectl get plan
NAME                      READY   EXECUTING   SUCCEEDED   FAILED   AGE
plan-migration-test-vm1   True                                     4s
```

Creating the migration plan does not start the actual migration. To start the actual migration create the Migration CR

```
cat <<EOF | kubectl create -f - 
apiVersion: forklift.konveyor.io/v1beta1
kind: Migration
metadata:
  generateName: migration-test-vm1-
  namespace: konveyor-forklift
spec:
  plan:
    name: plan-migration-test-vm1
    namespace: konveyor-forklift
EOF
```

This process will start the migration and status should show Running as True.

```
kubectl get migration
NAME                       READY   RUNNING   SUCCEEDED   FAILED   AGE
migration-test-vm1-gh6zb   True    True                           5m
```

When testing this on my cluster, I ran into an error where the migration pod failed with error 

```
failed to generate security options for container "virt-v2v": failed to generate seccomp security options for container: cannot load seccomp profile "/var/lib/kubelet/seccomp/profiles/unshare.json": open /var/lib/kubelet/seccomp/profiles/unshare.json: no such file or directory
```
This issue typically arises when a custom seccomp profile is referenced in a pod's configuration, but the profile is either missing or not properly configured on the node. In my case the configuration was missing on the node as the file /var/lib/kubelet/seccomp/profiles/unshare.json did not exist.

Create the file 

```
sudo mkdir -p /var/lib/kubelet/seccomp/profiles
sudo vi /var/lib/kubelet/seccomp/profiles/unshare.json
```

Add the following content to the file 
```
{
  "defaultAction": "SCMP_ACT_ALLOW",
  "archMap": [
    {
      "architecture": "SCMP_ARCH_X86_64",
      "subArchitectures": [
        "SCMP_ARCH_X86",
        "SCMP_ARCH_X32"
      ]
    }
  ],
  "syscalls": []
}
```

Save the file and ensure it has the correct permissions
```
sudo chmod 644 /var/lib/kubelet/seccomp/profiles/unshare.json
```
Restart the Kubelet
```
sudo systemctl restart kubelet
```

Note: If the status of the Migration shows Failed as True. Delete the migration and start it again by creating a new CR

During the Migration, forklift will shutdown the VM and do a cold migration. Few mins after starting the migration and after the datavolume is created you should see a pod similar to plan-migration-test-vm1-vm-1019 started and the logs of this pod can be viewed for progress

To get the status of the migration

```
kubectl get migration migration-xcvfg
NAME              READY   RUNNING   SUCCEEDED   FAILED   AGE
migration-xcvfg   True              True                 6h43m
```

When the migration completed, you should see a VM created but in stopped state

```
kubectl get vms -A
NAMESPACE           NAME                 AGE   STATUS    READY
konveyor-forklift   migration-test-vm1   10m   Stopped   False
```

Start the VM using virtctl and wait for it to transition to running state 

```
virtctl start migration-test-vm1

kubectl get vms
NAME                 AGE   STATUS    READY
migration-test-vm1   11h   Running   True
```

## Conclusion

Forklift presents a powerful and efficient solution for organizations looking to migrate virtual machines (VMs) to KubeVirt, enabling them to embrace a more modern and flexible cloud-native architecture. As organizations continue to seek ways to modernize their operations and reduce dependency on traditional virtualization solutions, Forklift serves as a valuable ally in this journey.
