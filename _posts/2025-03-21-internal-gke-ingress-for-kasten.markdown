---
layout: post
title: Creating an internal GKE ingress for Kasten
description: GKE provide a very performent solution for load balancing containers. But how do you expose an internal ingress in this architecture ? And  more specifically how do you expose an internal ingress for Kasten ?
date: 2025-03-21 00:00:35 +0300
author: michaelcourcy
image: '/images/posts/2025-03-21-internal-gke-ingress/ingress-internal-gke.webp'
image_caption: 'Managing internal ingress in GKE'
tags: [GCP , Backup, Kasten, Kubernetes, GKE, Ingress, Network]
featured:
---

# What is VPC native in GCP ? 

When you create your GCP Project you have a default network in Auto mode. **Auto** means it automatically creates a subnet in each available region they become available.

![Default network in Auto mode](../images/posts/2025-03-21-internal-gke-ingress/default-network.png)

You can create in this network a VPC-native Google Kubernetes Engine (GKE). Each Pods receive an IP addresses from a secondary range within your VPC. This is also known as the alias IP method. It provides better IP address management, avoids manual routing configurations, and integrates more seamlessly with other GCP networking features.

I created a zonal GKE cluster in the US-Central1 region
```
gcloud container clusters create mcourcy-telepass \
    --zone us-central1-a \
    --node-locations us-central1-a,us-central1-b,us-central1-c
``` 

In this example you can see that my GKE cluster is aliased with the us-central1 region subnet 
![GKE cluster is aliased to the us-central1 region](../images/posts/2025-03-21-internal-gke-ingress/gke-network-alias.png)

The secondary range is `10.52.0.0/14` (Alias IP) and this is the IP of the pods that are not using the host network.
```
kubectl get po -o wide -A -o custom-columns=NAME:.metadata.name,IP:.status.podIP
...
catalog-svc-6d964559b5-csz8q                                 10.52.5.4
controllermanager-svc-b977c6f84-rjlrk                        10.52.2.4
crypto-svc-8ddc496fd-qvg5j                                   10.52.2.6
dashboardbff-svc-59b8bc8546-rqn7s                            10.52.1.4
executor-svc-548b984d65-gnddf                                10.52.1.5
executor-svc-548b984d65-sxmmw                                10.52.8.5
executor-svc-548b984d65-zxxnn                                10.52.3.4
frontend-svc-5b9d8f977d-gqc52                                10.52.7.5
gateway-78458d7f4b-wbzkx                                     10.52.2.7
jobs-svc-d5c8c7744-8qc4d                                     10.52.3.5
kanister-svc-7cfb9df67f-xzq9r                                10.52.2.5
logging-svc-f9b8b6756-6rnp8                                  10.52.4.4
metering-svc-ffbf9cd5c-dnjtk                                 10.52.1.6
prometheus-server-65df7f4c84-xvkh5                           10.52.3.6
state-svc-87c4f7859-xrlxs                                    10.52.8.4
event-exporter-gke-5c5b457d58-gxwqx                          10.52.6.4
fluentbit-gke-8qnvl                                          10.128.0.13
fluentbit-gke-c5w2z                                          10.128.0.9
fluentbit-gke-kcphq                                          10.128.0.7
fluentbit-gke-nw6jh                                          10.128.0.5
fluentbit-gke-qpjpw                                          10.128.0.10
...
```

As you can see some of the pods use the `10.52.0.0/14` network (the secondary subnet of this region) others are using the `10.128.0.0/20` network (the primary network of this region). The secondary network is used when you do not specify a pod to use the host (worker node) network.

```
kubectl get pod -n kube-system fluentbit-gke-8qnvl -o jsonpath='{.spec.hostNetwork}'
true
```
 
but 
```
kubectl get pod -n kasten-io catalog-svc-6d964559b5-csz8q -o jsonpath='{.spec.hostNetwork}'
[empty output]
```

The secondary network is much larger to allow a lot of pods to be deployed in this cluster. 

But wether primary or secondary this is not an "abstract" network. It's a network managed by GCP and for this reason it is possible to integrate more seamlessly with other GCP networking features. 

# What is container native load balancing ?

Because of this architecture that we described above, one very important integration is possible : the load balancing integration also known as [Container native load balancing](https://cloud.google.com/kubernetes-engine/docs/concepts/container-native-load-balancing). 

All the load balancing capacities of GCP can be used to directly map a GCP load balancer to pods without going through the usual 
node port approach where the load balancer has to go in the host and be redirected through the kube-proxy or IP-table rules, with an eventual hop to another host.

![Classic load balancing vs container native load balancing](../images/posts/2025-03-21-internal-gke-ingress/classic-load-balancing-vs-container-native-load-balancing.svg)

On the left is the classic load balancing : the load balancer send the request to one of the host without knowing if the pods are 
really living on this host. Hence the packet may be resent to another host by kube-proxy or by an IP table rules to reach the host that really hold the pod.

On the right the container native load balancing know exactly where the pods are because each pod has an IP managed directly by the
GCP platform. 
When you load balance a service with an Ingress the GKE Ingress Controller create a [Network Endpoint Groups](https://cloud.google.com/load-balancing/docs/negs/zonal-neg-concepts#gce-vm-ip-port) that hold the collections of IP. 
The information in the NEG can be used by the load balancer to distribute the trafic and build health check appropriatly with information taken from the pods.

# But how security is impacted by this architecture for doing internal load balancing 

Now that we understand that load balancer directly speak to the pods three things must be condidered : 

1. We need a regional subnet that proxy the internal load balancer. There is nothing new here. It's something that you already have to do for [any internal load balancer implementation](https://cloud.google.com/load-balancing/docs/l7-internal/setting-up-l7-internal#configuring_the_proxy-only_subnet) in GCP. This is easy to create, just choose the same region than the GKE cluster and an ip range that does not overlap with the base network cidr. 
```
gcloud compute networks subnets create proxy-only-subnet \
    --purpose=REGIONAL_MANAGED_PROXY \
    --role=ACTIVE \
    --region=us-central1 \
    --network=default \
    --range=10.120.0.0/23
```
Remember that you can only have one proxy-only (REGIONAL_MANAGED_PROXY) subnet with role=ACTIVE per region in a given VPC network.
So if you already have this subnet you don't need (and you shouldn't) create this proxy only subnet but reuse it in the second point.


2. We need a firewall rule that allow any pod IP to be reached on the pod Port from the proxy-only-subnet (which is the subnet that 
will originate the load balancers connections). 
The service that we want to ingress is gateway, this service expose the port 80 but its target container port is 8000. 
As I explained Native container load balancing will target the container directly not the service 
(the service will be used by the GKE internal ingress controller to build appropriately the NEG but no request will be sent to the 
Service IP directly), hence the forwarding rule must be done on the container port : 8000 (and not 80)

```
gcloud compute firewall-rules create allow-kasten-gateway-connection \
    --allow=TCP:8000 \
    --source-ranges=10.120.0.0/23 \
    --network=default
```

the `--source-ranges` and `--network` option must be adapted if you are in a different configuration.

3. The ingress controller [build automatically a Google Heath Check](https://cloud.google.com/kubernetes-engine/docs/concepts/ingress#health_checks) that is inferred if the Serving Pods use a Pod template with a container whose readiness probe has attributes that can be interpreted as health check parameters and containerPort field must be defined under pod spec. If they are not defined, the health check for the backend service defaults to "/" path even if parameters are defined under readiness probe.

But this is the tricky part in the deployment of the gateway there is no containerPort (this is not mandatory and the kasten helm 
chart do not populate this field) hence you can build a BackendConfig or edit the deployment gateway. I opted for the later I edit the 
gateway deployment and filled up the field `/spec/template/spec/containers/0` to add

```
        ports:
        - containerPort: 8000
          protocol: TCP
```

# Let's create and test the ingress creation 

We suppose that you already install kasten with an authentication mechanism and you want to create an internal ingress for the gateway service.

The only thing you have to do is create the ingress resource: 

```
cat <<EOF |kubectl create -f - 
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
EOF
```

You need the annotation 
```
    kubernetes.io/ingress.class: "gce-internal"
```

So that the gke internal ingress controller will be used and will create the necessary GCP resources for an internal load balancing.

# Trobleshooting and testing 

After few minutes an internal IP will be given to the ingress 
```
k get ingress -n kasten-io                                                      
NAME             CLASS    HOSTS   ADDRESS       PORTS   AGE
kasten-ingress   <none>   *       10.128.0.15   80      3m25s
```

And if that does not work as expected you can check the ingress event 
```
kubectl get events --all-namespaces --field-selector involvedObject.kind=Ingress
```

Also you can list the NEG that were created by the kasten ingress
```
gcloud compute network-endpoint-groups list |grep kasten-io 
```

Yous should see this output 
```
NAME                                                        LOCATION       ENDPOINT_TYPE   SIZE
k8s1-aa340f82-kasten-io-gateway-80-f5e3a248                 us-central1-a  GCE_VM_IP_PORT  0
k8s1-aa340f82-kasten-io-gateway-80-f5e3a248                 us-central1-b  GCE_VM_IP_PORT  0
k8s1-aa340f82-kasten-io-gateway-80-f5e3a248                 us-central1-c  GCE_VM_IP_PORT  1
```

Only one has the size 1 because there is only one gateway pod.

## Let's test it now 

Now let's do a simple curl test to see if the url http://10.128.0.15:80/k10/ is responding with a kasten page. 

Bash in the catalog pod where curl is available but any other pod or a vm in the network will work. 
```
kubectl exec -it -n kasten-io deployment/catalog-svc -- bash
```

Now curl the ingress 
```
curl http://10.128.0.15:80/k10/
```

You should see some html part like this one 
```
<title>Kasten</title>
```

# Conclusion 

In this blog post we explained what is container-native load balancing in GCP and what is involved for internal load balancing.
Then we apply it to create a gce-internal ingress for Kasten.

Some improvement could be also provided like not editing the gateway deployment but provide a BackendConfig. 
We could also directly create the ingress using helm options only. 
