---
layout: post
title: Creating an Internal GKE Ingress for Kasten
description: GKE provides a high-performance solution for load balancing containers. But how do you expose an internal ingress in this architecture? More specifically, how do you expose an internal ingress for Kasten?
date: 2025-03-21 00:00:35 +0300
author: michaelcourcy
image: '/images/posts/2025-03-21-internal-gke-ingress/ingress-internal-gke.webp'
image_caption: 'Managing internal ingress in GKE'
tags: [GCP, Backup, Kasten, Kubernetes, GKE, Ingress, Network]
featured:
---

# What Is VPC-Native in GCP?

When you create your GCP Project, you start with a default VPC network in Auto mode. **Auto** means a subnet is automatically created in each available region as they become available.

![Default network in Auto mode](../images/posts/2025-03-21-internal-gke-ingress/default-network.png)

You can deploy a VPC-native Google Kubernetes Engine (GKE) cluster in this default network. Each Pod receives an IP address from a secondary range within your VPC (also known as the alias IP method). It offers better IP address management, avoids manual routing configurations, and integrates seamlessly with other GCP networking features.

Below is an example of a zonal GKE cluster in the us-central1 region:

```shell
gcloud container clusters create mcourcy-cluster1 \
    --zone us-central1-a \
    --node-locations us-central1-a,us-central1-b,us-central1-c
```

In this example, the GKE cluster is aliased with the us-central1 region subnet:
![GKE cluster is aliased to the us-central1 region](../images/posts/2025-03-21-internal-gke-ingress/gke-network-alias.png)

The secondary range `10.52.0.0/14` (alias IP) is used for Pods that do not rely on the host network:

```shell
kubectl get po -o wide -A -o custom-columns=NAME:.metadata.name,IP:.status.podIP
...
catalog-svc-6d964559b5-csz8q                                 10.52.5.4
...
fluentbit-gke-8qnvl                                          10.128.0.13
...
```

Some Pods (e.g., fluentbit-gke) use the primary `10.128.0.0/20` subnet if they’re running on the node’s host network. You can see this by checking the `.spec.hostNetwork` value:

```shell
kubectl get pod -n kube-system fluentbit-gke-8qnvl -o jsonpath='{.spec.hostNetwork}'
true
```

But for a Pod that doesn’t use the host network (like a Kasten catalog pod), the output is empty. Whether you use the primary or secondary subnet, GCP manages these networks, giving you tight integration with other GCP services.

# What Is Container-Native Load Balancing?

Because GKE assigns IP addresses to Pods directly from a VPC, you can use [Container-Native Load Balancing](https://cloud.google.com/kubernetes-engine/docs/concepts/container-native-load-balancing), which targets Pods via their IP addresses without cruising through node ports.

![Classic load balancing vs container-native load balancing](../images/posts/2025-03-21-internal-gke-ingress/classic-load-balancing-vs-container-native-load-balancing.svg)

- **Classic approach**: The load balancer sends requests to a node first. That node then uses kube-proxy or IP table rules to forward traffic to another node if needed.  
- **Container-native**: The load balancer targets Pod IPs directly. Each Pod’s IP is a first-class address in the VPC.

When you build an Ingress in GKE, the GKE Ingress Controller creates [Network Endpoint Groups (NEGs)](https://cloud.google.com/load-balancing/docs/negs/zonal-neg-concepts#gce-vm-ip-port) that store Pod IP addresses and ports. The load balancer uses NEGs to distribute traffic and define health checks directly at the Pod level.

# Internal Load Balancing: Security and Networking

Because internal load balancing communicates directly with Pods, keep the following in mind:

1. **Regional Proxy-Only Subnet**  
   You need a proxy-only subnet with `REGIONAL_MANAGED_PROXY` and role=ACTIVE in the same region as your GKE cluster. Below is an example of creating a subnet in us-central1:

   ```shell
   gcloud compute networks subnets create proxy-only-subnet \
       --purpose=REGIONAL_MANAGED_PROXY \
       --role=ACTIVE \
       --region=us-central1 \
       --network=default \
       --range=10.120.0.0/23
   ```
   Note: Only one subnet with `REGIONAL_MANAGED_PROXY` and role=ACTIVE is allowed per region per VPC network. If one already exists, reuse it.

2. **Firewall Rule**  
   Create a firewall rule so traffic from the proxy-only subnet can reach Pods on the container port. If Kasten gateway’s service is on port 80 but needs to target container port 8000, then:

   ```shell
   gcloud compute firewall-rules create allow-kasten-gateway-connection \
       --allow=TCP:8000 \
       --source-ranges=10.120.0.0/23 \
       --network=default
   ```

   Here, the load balancer bypasses typical node ports, speaking directly to container ports.

3. **Health Checks**  
   GCP automatically sets up health checks through the Ingress. If your Pod does not define `containerPort` or if the readiness probe isn’t clearly specified, GCP defaults to checking path “/”. To correct this, either create a [BackendConfig](https://cloud.google.com/kubernetes-engine/docs/how-to/configure-backendconfig) specifying health check parameters or add a containerPort to your Deployment’s Pod spec:

   ```yaml
   spec:
     containers:
     - name: gateway
       ports:
         - containerPort: 8000
           protocol: TCP
   ```

# Creating and Testing the Ingress

If Kasten is already installed with authentication, create a basic internal Ingress:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: kasten-ingress
  namespace: kasten-io
  annotations:
    kubernetes.io/ingress.class: "gce-internal"
spec:
  rules:
  - http:
      paths:
      - path: /k10/
        pathType: ImplementationSpecific
        backend:
          service:
            name: gateway
            port:
              number: 80
```

The annotation `kubernetes.io/ingress.class: "gce-internal"` triggers the GKE internal Ingress Controller to build an internal HTTP(S) load balancer. After a few minutes, an internal IP will appear:

```shell
kubectl get ingress -n kasten-io
NAME             CLASS    HOSTS   ADDRESS       PORTS   AGE
kasten-ingress   <none>   *       10.128.0.15   80      3m25s
```

If you run into problems, check the related events:

```shell
kubectl get events --all-namespaces --field-selector involvedObject.kind=Ingress
```

Also, you can find the NEG that’s created behind the scenes:

```shell
gcloud compute network-endpoint-groups list | grep kasten-io
```

> By default the GKE mutating webhook is activated to add the annotation `cloud.google.com/neg: '{"ingress": true}'` on any service you create, but in some situation [described here](https://cloud.google.com/kubernetes-engine/docs/concepts/ingress#container-native_load_balancing) (for instance shared VPC) this mutating webhook is not activated and you have to add the annotation manually. If you don't do that the ingress will fail creating the internal load balancer.


## Testing the Ingress

Run a quick curl:

```shell
curl http://10.128.0.15:80/k10/
```

You should see HTML containing:

```
<title>Kasten</title>
```

# Conclusion

In this post, we covered container-native load balancing in GCP and demonstrated how to set up an internal Ingress that directly targets Pods with the GKE Ingress Controller. This approach creates a Google Cloud internal HTTP(S) load balancer for Kasten without relying on node ports.

Potential improvements include creating a separate BackendConfig to define the container port or using Helm options to generate the Ingress rather than manually editing the gateway Deployment.