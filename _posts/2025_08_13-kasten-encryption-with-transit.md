---
layout: post
title: Manage Kasten encryption with Harshicorp Transit engine
description: Understand the Kasten envelope encryption model and Learn how to change the default encryption for the Transit Harshicorp Vault engine
date: 2025-08-13 00:00:35 +0300
author: michaelcourcy
image: '/images/posts/2025-06-11-oc-mirror/kasten-deep-water.png'
image_caption: 'Airgapped Kasten OpenShift Operator Installation'
tags: [Encryption, Envelope Encryption, Kasten, Security, Key rotation]
featured:
---

# The kasten encryption model 

Kasten follow the envelope encryption model. 

## What is envelope encryption ?

Envelope encryption is a cryptographic technique that uses multiple layers of encryption to protect data, similar to placing a sealed letter inside another sealed envelope.

1. **Data Encryption Key (DEK)**: Your actual data is encrypted using a symmetric encryption key called the Data Encryption Key
2. **Key Encryption Key (KEK)**: The DEK itself is then encrypted using another key called the Key Encryption Key
3. **Storage**: The encrypted data and the encrypted DEK are stored together, while the KEK is stored separately, often in a key management service (KMS)

Because The KEK is managed in a KMS **if an attacker manage to compromise your storage it still need to compromise your KMS to access your KEK and decrypt your DEK and finally access the data**, that makes its job much harder.

Beside you can rotate the credential access to your KMS regulary making sure that old access can not be reused. 

This is particulary powerful when you use that in combination with cloud Workload Identity or cloud Federated Identity because the access is very short lived and automatically expired and renewed. 


## How is it implemented with Kasten ?

1. **Key Encryption Key (KEK)**: is called the master key in Kasten, the master key is stored encrypted in the catalog (we'll comeback on that later).
2. **Data Encryption Key (DEK)**: is derived from the master Key and the policy name for the backup of metadata or derived from the master key and the namespace UID for the data. Kasten never stores the DEK. Instead, they’re derived on-demand. 
3. **Storage**: The backup is encrypted at rest with the DEK before being sent to the backup repository.

How the Master key (KEK) is encrypted and decrypted in and from the catalog ? 

This is where the PassKey object come into play, each encryption instance of the Master Key in the catalog is mapped to a `passkeys.vault.kio.kasten.io` instance. 

**There is only one Master Key** but potentially `n` encryptions of the master key in the catalog, each are materialized by a `passkey` instance (n is at minimum 1 and cannot be 0 of course)

Today Kasten supports 3 kinds of passkey :

- The passphrase passkey
- The Harshicorp Transit engine passkey 
- The AWS KMS passkey 

But later Kasten may add other kind of passkey depending of the market demand.

Kasten will let you create as much passkey as you want with a minimum of 1 passkey, kasten won't let you delete the last passkey.

## Can we rotate the KEK(master key) and the DEK ? 

No ! Backup are immutable, hence the DEK must remain the same and conscequently the Master key must remain the same. 

But you can easily rotate the passkey by just creating a new one and deleting the old, the old encrypted version of the master key will be removed and replaced by the new one in the catalog.

**In other words what you rotate is not the master key but the encryption of the master key**

## Disater recovery

When you execute the disaster recovery of Kasten, you restore the passkeys and the catalog hence the encryptions of the master key in the catalog related to those passkeys. 

# A end to end guide to replace the default passkey by a transit passkey 

## Prerequisites

- A kuberntes cluster 
- Kasten installed  

## Worflow 

Kasten at startup will use one of the passkey to determine 

## Let's install the harshicorp transit engine 

Tansit engine is actually a sub component of the Harshi corp vault solution. 

