---
layout: post
title: Use Azure federated identity with Kasten in Openshift
description: When Kasten need to interact with a cloud provider API as Azure we have 2 approaches. One approach is to store the credential of a service principal in a secret but another one is to use federated identity. Federated identity avoid storing credential in a secret and bring much better security. Let's see how it works.
date: 2024-12-18 00:00:35 +0300
author: michaelcourcy-deepikadixit
image: '/images/posts/2024-12-18-federated-identity/kasten-azure-openshift.jpg'
image_caption: 'Identity Federation in Openshift between Kasten and Azure Entra Id'
tags: [Azure , Backup, Kasten, Kubernetes, Security, Authentication, Federated identity]
featured:
---

# What is federated identity and why it matters ?

When your program perfom an operation with a cloud provider like Azure it needs to authentify and if the  identity is granted the necessary authorizations the operation will succeed.

Kasten need to perform operations on Azure :
- Snapshots operation on the storage when CSI is not available (for instance legacy azure disk)
- Moving snapshot from a region to another one
- Exporting data to a blob container

The issue is the authentication part because you need to store your credential somewhere. Credentials are like [plutonium](https://en.wikipedia.org/wiki/Plutonium) this is something that you don't want to manipulate, you don't want to be responsible for storing or managing it.

![Credentials are like plutonium](../images/posts/2024-12-18-federated-identity/credentials-are-plutonium.png)

You can put the credential in a kubenetes secret but you need to make sure that only "trusted" people can read it. Also you must not store the credentials in your git repository.

## Enter federated identity

Azure (but also the main cloud providers like AWS or GCP) comes with a solution called **Federated identity**.

In a nutshell : you register your cloud identity to an identity provider that you choose (1). The client  by authenticating with a [JSON Web Token](https://datatracker.ietf.org/doc/html/rfc7519) (2 and 3) claim the cloud identity (4). Azure can validate the signature of the token against the identity provider that was registered. If successful the client can perfom operation **as** the cloud identity.

![Sequential workflow for the federated identity](../images/posts/2024-12-18-federated-identity/idp.png)

# How does it work for Openshift ?

Now that we've seen the theory let see a real implementation with Openshift.

Openshift support federated identity on Azure since version 4.14. You need to install openshift [following this guide](https://docs.openshift.com/container-platform/4.14/installing/installing_azure/installing-azure-customizations.html#installing-azure-with-short-term-creds_installing-azure-customizations).

After the installation complete you can observe that the openshift installer created a storage account which expose a part of the endpoints that an identity provider usually expose.
The public address of the storage account container is the **issuer** endpoint. For instance `https://<storage-account>.blob.core.windows.net/<container>`

![Storage account acting like an IDP](../images/posts/2024-12-18-federated-identity/storage-account.png)

But Azure only need public JKMS key (in the openid directory) to validate the signature of the JWT. JKMS is the public key in the cryptographic signature.
Openshift keep the control on the creation of the JWT and sign it with the private key.

Now when you check the Azure managed identity that are used by openshift

![Managed identities use by Openshift](../images/posts/2024-12-18-federated-identity/managed-identities.png)

You can see that their federated credential field point to the storage account that  expose the JKMS key.

![Managed identity details](../images/posts/2024-12-18-federated-identity/managed-identity.png)

Also a subject identifier is defined. Meaning that only the service account define in this field can assume this role.
When Azure Entra Id will validate the JWT it will use this 2 informations :
- The issuer by validating the signature
- The subject identifier by checking the sub field in the JWT


## Use it for your own application

But this configuration is not only used by the Openshift operators, one can create a service account that can assume a managed identity. In this [Redhat tutorial](https://access.redhat.com/solutions/7044926) a kubernetes service account  read the content of an Azure Key Vault.

We're not going to redo the tutorial but the main steps are

- Create a managed identity.
```
az identity create --name "${USER_ASSIGNED_IDENTITY_NAME}" --resource-group "${RESOURCE_GROUP}"
```

- Configure the authorization to allow  the managed identity to read the secret in the keyvault.
```
azureclient_id=$(az identity show --name ${USER_ASSIGNED_IDENTITY_NAME} --resource-group ${RESOURCE_GROUP} --query clientId -o tsv)
az keyvault set-policy --name "${KEYVAULT_NAME}" --secret-permissions get --object-id "${USER_ASSIGNED_IDENTITY_OBJECT_ID}"
```

- Create the federated credential with the issuer and the subject.
```
 az identity federated-credential create \
--name "kubernetes-federated-credential" \
--identity-name "${USER_ASSIGNED_IDENTITY_NAME}" \
--resource-group "${RESOURCE_GROUP}" \
--issuer "${SERVICE_ACCOUNT_ISSUER}" \
--subject "system:serviceaccount:${SERVICE_ACCOUNT_NAMESPACE}:${SERVICE_ACCOUNT_NAME}"
```
- Annotate the kubernetes service account to assume the managed identity.
```
cat <<EOF | oc create -f -
apiVersion: v1
kind: ServiceAccount
metadata:
 annotations:
   azure.workload.identity/client-id: ${APPLICATION_CLIENT_ID:-$USER_ASSIGNED_IDENTITY_CLIENT_ID}
 name: ${SERVICE_ACCOUNT_NAME}
 namespace: ${SERVICE_ACCOUNT_NAMESPACE}
EOF
```
- Ensure the workload use this service account and has the label `azure.workload.identity/use: "true"`.
```
cat <<EOF | oc apply -f -
apiVersion: v1
kind: Pod
metadata:
 name: quick-start
 namespace: ${SERVICE_ACCOUNT_NAMESPACE}
 labels:
    azure.workload.identity/use: "true"
spec:
 serviceAccountName: ${SERVICE_ACCOUNT_NAME}
....
```

Then the Openshift webhook will automatically inject the necessary artifact in the pod.
```
....
    env:
    - name: AZURE_CLIENT_ID
      value: <redacted>
    - name: AZURE_TENANT_ID
      value: <redacted>
    - name: AZURE_FEDERATED_TOKEN_FILE
      value: /var/run/secrets/azure/tokens/azure-identity-token
    - name: AZURE_AUTHORITY_HOST
      value: https://login.microsoftonline.com/
....
    volumeMounts:
    - mountPath: /var/run/secrets/azure/tokens
      name: azure-identity-token
      readOnly: true
....
 volumes:
  - name: azure-identity-token
    projected:
      defaultMode: 420
      sources:
      - serviceAccountToken:
          audience: api://AzureADTokenExchange
          expirationSeconds: 3600
          path: azure-identity-token
```

# How does it works for Kasten

Kasten support managed identity if your Openshift cluster has been installed with support for short term credential as explained above.

First you need to create a managed identity let's say `kasten-managed-identity`, take note of the ClientId

![Kasten managed identity clientId](../images/posts/2024-12-18-federated-identity/kasten-managed-identity.png)

Make sure you give the necessary role for this managed identity to perform the operations on the scope of the resource group (you may give more role/scope depending of your needs)

![Kasten managed identity role](../images/posts/2024-12-18-federated-identity/kasten-managed-identity-role.png)

Create the federated credentials the subject must be the k10-k10 service account `system:serviceaccount:kasten-io:k10-k10`, use the issuer as explained above.

> **Note** This is not true anymore since service account has been resdistributed,
> please check the [kasten documentation](https://docs.kasten.io/latest/install/openshift/helm/#federated-identity) 

![Kasten managed identity role](../images/posts/2024-12-18-federated-identity/kasten-managed-identity-federation.png)

Now all you have to do is add this helm options to have k10-k10 service account assume the kasten-managed-identity

```
azure:
  useFederatedIdentity: true
secrets:
  azureClientId: 36a4de2e-d855-42fd-a931-537e1d3884b0
  azureResourceGroup: <redacted>
  azureSubscriptionID: <redacted>
```

You'll see the corresponding infra profile.

![Infra profile](../images/posts/2024-12-18-federated-identity/infra-profile.png)

# Test it

A simple way to test it is to recreate a legacy storage class
```
allowVolumeExpansion: true
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: azuredisk-legacy
parameters:
  kind: Managed
  storageaccounttype: Premium_LRS
provisioner: kubernetes.io/azure-disk
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
```

Create an application that use it for instance [use this guide](https://github.com/michaelcourcy/basic-app) to create a simple stateful application and create a policy to export.

# Conclusion

With the support for Azure federated identity you don't need anymore to store your azure credential for Kasten anywere which brings a lot more security and simplify your configuration.

You can also check our [documenation](https://docs.kasten.io/latest/install/openshift/helm.html#federated-identity) and [our support](https://docs.kasten.io/latest/install/azure/azure.html#installing-veeam-kasten-with-managed-identity) for Managed identity on AKS.
