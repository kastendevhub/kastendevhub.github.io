---
layout: post
title: Automate the installation of the Veeam Kasten Operator on OpenShift with Terrraform
description: Description: Learn how to automate the deployment of Veeam Kasten Operator on Red Hat OpenShift using Terraform
date: 2025-03-26 00:00:35 +0300
author: alexandrearrive
image: 'images/posts/2025-03-26-veeam-kasten-operator-rosa-terraform/car_builder.jpeg' 
image_caption: 'Managing internal ingress in GKE'
tags: [Terraform, Backup, Kasten, Kubernetes, ROSA, OpenShift, Operator]
featured:
---

This article discusses the deployment of the Veeam Kasten Operator on Red Hat OpenShift using Terraform to automate the setup of OpenShift in AWS with the managed service ROSA. It aims to provide information on how to reproduce and evaluate Veeam Kasten under specific conditions. The focus is on Terraform, Veeam Kasten, and Red Hat OpenShift on AWS, also known as ROSA.

# What’s Terraform?

Terraform has revolutionized infrastructure provisioning and lifecycle management, both on-premise and in the cloud, over the last decade. Launched in 2017, Terraform's first provider debuted alongside the [Terraform Registry](https://registry.terraform.io/). By 2019, it had reached 100 million downloads, and in 2022, the AWS Terraform provider surpassed one billion downloads.
Terraform enables infrastructure as code across various cloud providers, offering version-controlled, repeatable, and maintainable management. It provides a consistent workflow for provisioning and managing infrastructure, supports multi-cloud deployments, simplifies infrastructure with a declarative approach, and promotes best practices through reusable configurations. It also facilitates team collaboration via HCP Terraform and ensures efficient resource management based on dependencies.

# Red Hat OpenShift on AWS (ROSA): A Managed Kubernetes Platform for Cloud-Native Applications

Red Hat OpenShift Service on AWS (ROSA) is a fully managed Kubernetes platform jointly operated by Red Hat and Amazon Web Services (AWS), designed to streamline the deployment and management of containerized applications in cloud environments. As a turnkey solution, ROSA combines Red Hat’s OpenShift Container Platform with AWS’s scalable infrastructure, enabling enterprises to offload cluster management tasks while retaining developer-friendly Kubernetes workflows.
The [Red Hat Cloud Services (RHCS) Terraform provider](https://registry.terraform.io/providers/terraform-redhat/rhcs/latest) enables declarative ROSA cluster provisioning, including STS role/policy setup and VPC configurations.
AWS EC2 offers a broad range of instances for ROSA deployment. OpenShift Virtualisation (OCPV) can be enabled on a ROSA cluster using bare metal EC2. This option is appealing for those seeking alternatives to VMware, as it allows consolidation of Cloud Native Applications and Virtual Machines. Veeam Kasten supports OpenShift Virtualisation, providing backup and restore capabilities via the OpenShift Virtualisation Operator. Later in this article, automation with Terraform will be discussed to enable the OCPV Operator for evaluating Veeam Kasten.

# Getting started with Veeam Kasten and Red Hat OpenShift Virtualsiation

For those interested in Veeam Kasten support for OpenShift Virtualization, there are two key resources: a joint [Reference Architecture about the support of Veeam Kasten with OpenShift Virtualsiation](https://www.veeam.com/resources/wp-veeam-kasten-red-hat-openshift-virtualization-reference-architecture.html). Therefore, the [Veeam Kasten validated pattern for Red Hat OpenShift Virtualization](https://validatedpatterns.io/patterns/ansible-edge-gitops-kasten/) is an extension of the standard Ansible Edge GitOps pattern that includes automated deployment and configuration of Veeam Kasten for data protection and mobility in OpenShift Virtualisation environments.

# Things you should know when starting the deployment of Kubernetes Operator with Terraform

Two common approaches for deploying new resources on Kubernetes are using the [Kubernetes Terraform provider](https://registry.terraform.io/providers/hashicorp/kubernetes/latest), or the [kubectl Terraform provider](https://registry.terraform.io/providers/gavinbunney/kubectl/latest). While the difference may initially appear subtle, the choice of Terraform provider can have a significant impact. 

A common error message when deploying an operator for the first time on a Kubernetes cluster (such as the Veeam Kasten Operator on OpenShift) with the Kubernetes Terraform provider might be:

```text
Error: API did not recognize GroupVersionKind from manifest (CRD may not be installed)
```

The error message encountered is a common issue when attempting to deploy custom resources with Terraform before their associated Custom Resource Definitions (CRDs) are installed in the cluster. When you try to create a K10 instance using the `kubernetes_manifest` resource, Terraform is unable to validate the resource because the underlying CRDs haven't been registered with the Kubernetes API server yet.

This occurs because Terraform is trying to validate the resource against the Kubernetes API schema, but since the CRDs aren't installed yet, the validation fails. The key insight here is that CRDs must be installed before attempting to create custom resources that depend on them.

| Features | `kubernetes_manifest` (TF Provider) | `kubectl_manifest` (Gavin Bunney) |
|--------|------------------------------|----------------------------|
| **CRD Handling** | Validates resources against API schema before applying - Requires CRDs pre-installed | Passes commands directly to kubectl without validation - Applies manifests even without CRDs |
| **Validation Timing** | Schema validation during `terraform plan`| Validation only at apply time - Can create CRDs and their instances in a single apply |
| **YAML Processing** | Requires parsed HCL manifests - Fails when resources don't match API schema | Accepts raw YAML - More forgiving with unknown resource types |
| **Dependency Order** | Explicit `depends_on` required | Auto-detects manifest dependencies |
| **Server-Side Apply** | Enabled by default - Maintains state and handles updates gracefully | Optional via kubectl flags - May have issues with state management for complex resources |

The kubectl provider applies manifests even when CRDs don't exist yet, mimicking kubectl apply behavior. This avoids the "chicken-and-egg" problem when installing operators that bundle their own CRDs. For OpenShift operators specifically, the kubectl provider's ability to handle raw **ClusterServiceVersion (CSV)** manifests and **OperatorGroup** resources makes it preferable over the native Terraform implementation.

 # Exploring the Kasten Developer Hub for end-to-end ROSA installation, including the Veeam Kasten Operator for OpenShift with Terraform

 The end-to-end deployment consists of two steps. `stage_1_rosa` involves creating a ROSA cluster in an AWS account, while `stage_2_k10` covers configuring the ROSA cluster to install the Veeam Kasten Operator on OpenShift. Find all Terraform code in the repository [**Veeam Kasten Operator deployment with Terraform**](https://github.com/kastendevhub/veeam_kasten_operator_terraform) on **Veeam Kasten Developer Hub** on GitHub. Detailed instructions are in the repository's README file.