---
layout: post
title: Airgapped Kasten Operator Installation for OpenShift 4.16
description: Learn how to install Kasten OpenShift operators in an airgapped environment.
date: 2025-06-10 00:00:35 +0300
author: michaelcourcy
image: '/images/posts/2025-06-11-oc-mirror/kasten-deep-water.png'
image_caption: 'Airgapped Kasten OpenShift Operator Installation'
tags: [OpenShift, Operators, Kasten, Backup, Airgapped, Disconnected, Installation]
featured:
---

## The Challenge of Airgapped OpenShift Operator Installations

In regulated environments or high-security zones, Kubernetes clusters often operate in airgapped (disconnected) networks. This presents unique challenges for OpenShift administrators who need to install specific operator versions without direct internet access. 

Since OpenShift 4.14, the process of mirroring operators has been refined, but still requires careful planning. This post demonstrates how to mirror and install operators at exactly version 8.0.1 in an airgapped OpenShift 4.16 environment.


## Prerequisites

- A source machine with internet access
- A destination machine in the disconnected environment 
- A destination OpenShift 4.16 cluster in an airgapped environment
- A private registry where you can push and pull image (in this tutorial we show an optional step to build a minimal one)

![Global workflow](/images/posts/2025-06-11-oc-mirror/global-workflow.png)

## Step 1: Install the oc mirror tool 

At the moment of this writing a linux platform with podman is mandatory.
I used for this tutorial a Rhel9 t3xlarge.
```
sudo dnf update -y
sudo dnf install -y podman
podman --version
```

Ouput
```
podman version 5.4.0
```

Grab the oc mirror plugin tool for your [platform](https://console.redhat.com/openshift/downloads#tool-oc-curl -o mirror-plugin) (Not the mirror registry)
Untar,make it executable and copy it to your machine.
```
curl -o oc-mirror.tar.gz https://mirror.openshift.com/pub/openshift-v4/x86_64/clients/ocp/latest/oc-mirror.rhel9.tar.gz
tar xvzf oc-mirror.tar.gz 
chmod +x oc-mirror
sudo mv oc-mirror /usr/local/bin/.
oc-mirror version 
```

ouput 
```
W0613 12:03:25.053932   29339 mirror.go:102] 

⚠️  oc-mirror v1 is deprecated (starting in 4.18 release) and will be removed in a future release - please migrate to oc-mirror --v2

WARNING: This version information is deprecated and will be replaced with the output from --short. Use --output=yaml|json to get the full version.
Client Version: version.Info{Major:"", Minor:"", GitVersion:"4.18.0-202506021034.p0.g1b20848.assembly.stream.el9-1b20848", GitCommit:"1b2084872f25a83e88ea1586afa0b5bda01c407c", GitTreeState:"clean", BuildDate:"2025-06-02T11:13:45Z", GoVersion:"go1.22.12 (Red Hat 1.22.12-2.el9_5) X:strictfipsruntime", Compiler:"gc", Platform:"linux/amd64"}
```

## Step 2: Create an ImageSetConfiguration File

### Understanding ImageSetConfiguration

The `ImageSetConfiguration` file is a critical component when mirroring OpenShift content for disconnected environments. It serves several key purposes:
1. **Content Specification**: It precisely defines which OpenShift platform versions and operator packages to mirror, allowing for granular control of what gets downloaded and transferred.
2. **Version Control**: Through `minVersion` and `maxVersion` parameters, administrators can pin specific versions or ranges, ensuring that only desired and tested versions are deployed in production environments.
3. **Storage Configuration**: It specifies where mirrored content will be stored, whether in a registry (as shown in our example) or in local filesystem storage.
4. **Dependency Resolution**: The `oc-mirror` tool uses this configuration to automatically identify and include all dependent images and metadata required for the specified operators to function properly.
5. **Reproducibility**: By maintaining this configuration file in version control, teams can ensure consistent operator deployments across multiple environments and easily update specific components when needed.

First, create an `ImageSetConfiguration` file that precisely specifies OpenShift version 4.14 and operator version 8.0.1:

```yaml
cat <<EOF > isc.yaml
apiVersion: mirror.openshift.io/v2alpha1
kind: ImageSetConfiguration
mirror:
  operators:
    - catalog: registry.redhat.io/redhat/redhat-marketplace-index:v4.16
      packages:
        - name: k10-kasten-operator-rhmp
          channels:
            - name: stable
              minVersion: "8.0.1"
              maxVersion: "8.0.1"
EOF
```

### Create authentication to the redhat registry 

From the same link copy your pull secret under “Tokens” 

![Token section in the redhat site](/images/posts/2025-06-11-oc-mirror/token.png)

```
mkdir -p ~/.docker
cat > ~/.docker/config.json <<EOF
<TOKEN>
EOF
```

Test that you can connect to the redhat registry 
```
podman login registry.redhat.io
```
You should get 
```
Authenticating with existing credentials for registry.redhat.io
Existing credentials are valid. Already logged in to registry.redhat.io
```

Try pulling 
```
podman pull registry.redhat.io/redhat/redhat-marketplace-index:v4.16
```

#### The GPG error 

The following section come from this [Redhat verified solution](https://access.redhat.com/solutions/6542281)

If you get this output
```
Trying to pull registry.redhat.io/redhat/redhat-marketplace-index:v4.16...
Error: copying system image from manifest list: Source image rejected: Invalid GPG signature: gpgme.Signature{Summary:128, Fingerprint:"1AC4971355A34A82", Status:gpgme.Error{err:0x9}, Timestamp:time.Date(2025, time.June, 12, 16, 0, 18, 0, time.Local), ExpTimestamp:time.Date(1970, time.January, 1, 0, 0, 0, 0, time.Local), WrongKeyUsage:false, PKATrust:0x0, ChainModel:false, Validity:0, ValidityReason:error(nil), PubkeyAlgo:1, HashAlgo:8}
```

Store the Red Hat ISV Container Signing Key under /etc/pki/rpm-gpg and name it RPM-GPG-KEY-redhat-isv.
```
sudo curl -s -o /etc/pki/rpm-gpg/RPM-GPG-KEY-redhat-isv https://security.access.redhat.com/data/55A34A82.txt
```

Modify the file `/etc/containers/policy.json` to be as follows:
```
{
  "default": [
      {
          "type": "insecureAcceptAnything"
      }
  ],
  "transports":
    {
      "docker-daemon":
          {
              "": [{"type":"insecureAcceptAnything"}]
          },
      "docker":
        {
          "registry.redhat.io/redhat/certified-operator-index": [
            {
              "type": "signedBy",
              "keyType": "GPGKeys",
              "keyPath": "/etc/pki/rpm-gpg/RPM-GPG-KEY-redhat-isv"
            }
          ],
          "registry.redhat.io/redhat/community-operator-index": [
            {
              "type": "signedBy",
              "keyType": "GPGKeys",
              "keyPath": "/etc/pki/rpm-gpg/RPM-GPG-KEY-redhat-isv"
            }
          ],
          "registry.redhat.io/redhat/redhat-marketplace-index": [
            {
              "type": "signedBy",
              "keyType": "GPGKeys",
              "keyPath": "/etc/pki/rpm-gpg/RPM-GPG-KEY-redhat-isv"
            }
          ],
          "registry.redhat.io": [
            {
              "type": "signedBy",
              "keyType": "GPGKeys",
              "keyPath": "/etc/pki/rpm-gpg/RPM-GPG-KEY-redhat-release"
            }
          ]
        }
    }
}
```

and try again 
```
podman pull registry.redhat.io/redhat/redhat-marketplace-index:v4.16
```

You should get this output 
```
Trying to pull registry.redhat.io/redhat/redhat-marketplace-index:v4.16...
Getting image source signatures
Checking if image destination supports signatures
Copying blob 76368146ad88 [==================>-------------------] 16.9MiB / 33.2MiB | 113.3 MiB/s
Copying blob ca13384aa552 done   | 
Copying blob ae0badd53767 [==>-----------------------------------] 6.9MiB / 75.9MiB | 109.1 MiB/s
Copying blob db6f7a934b82 [>-------------------------------------] 4.0MiB / 109.0MiB | 112.1 MiB/s
Copying blob de8f8118158d [=>------------------------------------] 7.7MiB / 164.8MiB | 92.6 MiB/s
```

## Step 3: Create a tarball for your operator 

We use the workflow mirrorToDisk : the mirror is the redhat registry while the disk is the local storage of this computer. 
This operation will generate a tarball file that you will reuse in the airgapped environment.

```
oc-mirror -c ./isc.yaml file:///home/ec2-user/oc-mirror/mirror1 --v2
```

You should get an output like this one (you may run this command few times because some timeout can happen)
```
oc-mirror -c ./isc.yaml file:///home/ec2-user/oc-mirror/mirror1 --v2

2025/06/12 13:28:21  [INFO]   : 👋 Hello, welcome to oc-mirror
2025/06/12 13:28:21  [INFO]   : ⚙️  setting up the environment for you...
2025/06/12 13:28:21  [INFO]   : 🔀 workflow mode: mirrorToDisk 
2025/06/12 13:28:21  [INFO]   : 🕵  going to discover the necessary images...
2025/06/12 13:28:21  [INFO]   : 🔍 collecting release images...
2025/06/12 13:28:21  [INFO]   : 🔍 collecting operator images...
 ✓   (11s) Collecting catalog registry.redhat.io/redhat/redhat-marketplace-index:v4.16 
2025/06/12 13:28:32  [INFO]   : 🔍 collecting additional images...
2025/06/12 13:28:32  [INFO]   : 🔍 collecting helm images...
2025/06/12 13:28:32  [INFO]   : 🔂 rebuilding catalogs
 ✓   (1m14s) Rebuilding catalog docker://registry.redhat.io/redhat/redhat-marketplace-index:v4.16 
2025/06/12 13:29:46  [INFO]   : 🚀 Start copying the images...
2025/06/12 13:29:46  [INFO]   : 📌 images to copy 34 
 ✓   (39s) k10-operator@sha256:0c2b7910b9d084ed48f453339a92857cd7914cad34e3fb151049b5dab152b804 ➡️  cache 
 ✓   (7m52s) jobs@sha256:07cf33d8125d2f0d049704e93e3742f45ff85f6b390fd28ea921b011498e4e69 ➡️  cache 
 ✓   (7m53s) crypto@sha256:10ff73774019f3fa3a5ce8f5c6a4c14fd3677a8df9a463d9b0ba4bbeabaf319a ➡️  cache 
 ✓   (7m53s) catalog@sha256:0453ee093c5f0184f702d586c9cba47c82fc537e74d8d7899ad6b05b7d43ff23 ➡️  cache 
 ✓   (7m59s) bloblifecyclemanager@sha256:b1d914165ec815eed56afb51f9676292de4c3c2ec40338ad6dbf581fcb29a793 ➡️  cache 
 ✓   (8m0s) dashboardbff@sha256:5823813fa58120218514882821105a3825a9b3389d434e9f7b03e7218072da6f ➡️  cache 
 ✓   (8m4s) aggregatedapis@sha256:4699e366251d830a1c5396f8b5d15a392b39e3f2767f12801614f1a7dd2ff995 ➡️  cache 
 ✓   (8m5s) controllermanager@sha256:586e7cce34a606ce88d99b57f37f85d7e8fc43ba17ae044a1d6636ee95abb73a ➡️  cache 
 ✓   (6s) init@sha256:663d55bb2a48eddfb6b88c5ef28c617cedb00070d9ef025f95a311e89f61eaf9 ➡️  cache 
 ✓   (24s) frontend@sha256:40da1f6dd94217a2a6c5f0d9fcbec4ffff8ff2c7eba923d8c3d4ca8a6961433e ➡️  cache 
 ✓   (37s) events@sha256:abca1e8325dc422f2961b9c46674c2fdcccd56fa96dc83b9adaf825f4ed6b02f ➡️  cache 
 ✓   (25s) configmap-reload@sha256:686529987d26bcc45055a2ade0a034613050989b98e334c08b9063b6fab831d5 ➡️  cache 
 ✓   (32s) gateway@sha256:77c10f633a8bc92c35b543c4ab7932fc203463970ef565daca2b96d517a11a38 ➡️  cache 
 ✓   (42s) garbagecollector@sha256:32e44bff75a603f596d45fa7812c7b0fdb9795608f67d254e66741c6dd44284a ➡️  cache 
 ✓   (1m0s) k10tools@sha256:58cc799c1f68630f46bfa244a333e9b7ff6aa8c44ca14dbfaa39855a7f48a8a2 ➡️  cache 
 ✓   (1m1s) executor@sha256:dc00dd22f2a7482e9ff21937d7665a18b028077918d264d71bc2f533672b9910 ➡️  cache 
 ✓   (33s) dex@sha256:30c0ee0f2244094f244c01827f59a637dcaa1928452dcabea94ec576be9e2c6a ➡️  cache 
 ✓   (38s) ose-kube-rbac-proxy@sha256:bb84ead437042603254efcb703442be8500a9450b10bbcaaee81b48a6ed869ea ➡️  cache 
 ✓   (57s) auth@sha256:1bb857e67a59b3199a20931da68f816ac369c4448877b9921ad0a4aee04fb2ca ➡️  cache 
 ✓   (52s) kanister-tools@sha256:af7acde947c1534da83566b7ccc2517dc36a1295fcff28abebc365f3a0837bfc ➡️  cache 
 ✓   (53s) kanister@sha256:06cf711a89c09f5f78eedc3aaba53dbbb272444fc0c52c81c14e8a64bbc5ffec ➡️  cache 
 ✓   (43s) logging@sha256:f771786e94ced8be52152e1356d604f0ad175c44418a20a7c86a69db8e9dbc48 ➡️  cache 
 ✓   (37s) metric-sidecar@sha256:9da7589f49ab4f580762f9a9836200fe5548eed2eccd1286709a2dfb067221be ➡️  cache 
 ✓   (47s) metering@sha256:ed6c54438e1a4d667eeee747bd0f1213bc948e01f7bdcb845f8a843f3abcf810 ➡️  cache 
 ✓   (29s) ocpconsoleplugin@sha256:5439118dd25c6e3d82a177dbedb26e51bad2300d0ac3fc322de6e5b4b3a95733 ➡️  cache 
 ✓   (9s) upgrade@sha256:0b3d01d788fc8763d9ac5e42ef2e0861150965b1d665df5db35aa78cfa9c87b9 ➡️  cache 
 ✓   (3s) kasten-rhmp-bundle@sha256:9613e2bc15a9f2f8dc708d072b3200831d41a9a704ef1e79f4eb60025430382f ➡️  cache 
 ✓   (2s) redhat-marketplace-index:v4.16 ➡️  cache 
 ✓   (9m24s) datamover@sha256:816040b6ad9ac1a6edd502959b2c4a85de66ae805d159fc069d0c05e09ae43d1 ➡️  cache 
 ✓   (42s) prometheus@sha256:cb9ebec8ea19b9201367cb5c7ab0731a99639269f2217aa38ea08777c67f903c ➡️  cache 
 ✓   (52s) restorectl@sha256:f09479ec7cd78752a13841eb47d08feb4a4aa9ec136a21137e1d5caa7ed527b7 ➡️  cache 
 ✓   (56s) repositories@sha256:23231edd8d26874e618e3cfc76b0bf5045f43502816c666d9b898e69ecfc0624 ➡️  cache 
 ✓   (56s) state@sha256:66d33455a331282ec3ccd4db96d0ec308c9034631cded253e0dc3400006b7b26 ➡️  cache 
34 / 34 (10m43s) [============================================================================================================================================================================================================================] 100 %
 ✓   (1m0s) vbrintegrationapi@sha256:49f924acc8ebb6d7c5c143e9cfab8bae71343566ae02e1033ce23b1950c528cc ➡️  cache 
2025/06/12 13:40:30  [INFO]   : === Results ===
2025/06/12 13:40:30  [INFO]   :  ✓  34 / 34 operator images mirrored successfully
2025/06/12 13:40:30  [INFO]   : 📦 Preparing the tarball archive...
2025/06/12 13:43:57  [INFO]   : mirror time     : 15m36.702589312s
2025/06/12 13:43:57  [INFO]   : 👋 Goodbye, thank you for using oc-mirror
```

I had to relaunch this command few times before it completes. As you can see all the image of Kasten are retreived to build a tarball that 
we will reuse in the disconnected environment.

```
ls -alh oc-mirror/mirror1/mirror_000001.tar 
-rw-r--r--. 1 ec2-user ec2-user 13G Jun 12 13:43 oc-mirror/mirror1/mirror_000001.tar
```

## Step 4 : Create a docker registry in your disconnected environment (optional)

This step is optional if you already have a container registry that supports Docker v2-2, such as Red Hat Quay, the mirror registry for Red Hat OpenShift, Artifactory, Sonatype Nexus Repository, or Harbor. 

Redhat propose a minimal single [instance deployment of Red Hat Quay](https://docs.redhat.com/en/documentation/openshift_container_platform/4.18/html/disconnected_environments/mirroring-in-disconnected-environments#installation-about-mirror-registry_installing-mirroring-installation-images) to aid bootstrapping the first disconnected cluster. 


you can download the tarball in the [mirror](https://console.redhat.com/openshift/downloads#tool-mirror-registry) section of the redhat download page for openshift.

You end up with a file `mirror-registry.tar.gz` that you untar : 
```
tar xvzf mirror-registry-amd64.tar.gz 
```

output 
```
image-archive.tar
execution-environment.tar
mirror-registry
sqlite3.tar
```

Make mirror-registry executable 
```
chmod +x mirror-registry
```

Then I followed the instruction [here](https://docs.redhat.com/en/documentation/openshift_container_platform/4.18/html/disconnected_environments/mirroring-in-disconnected-environments#mirror-registry-localhost_installing-mirroring-creating-registry) :
```
mkdir ~/quay-install
./mirror-registry install \
  --quayHostname my-registry.local \
  --quayRoot /home/ec2-user/quay-install
```

At the end you should get this output 
```
PLAY RECAP ******************************************************************************************************************************************************************************************************************************************
ec2-user@ip-172-31-26-144.eu-north-1.compute.internal : ok=49   changed=29   unreachable=0    failed=0    skipped=15   rescued=0    ignored=0   

INFO[2025-06-13 13:01:50] Quay installed successfully, config data is stored in /home/ec2-user/quay-install 
INFO[2025-06-13 13:01:50] Quay is available at https://my-registry.local:8443 with credentials (init, S5N7k42ZEpyVK8rM69vWTwf3JgUt1b0e) 
```

Take note of the username (init) and the password (S5N7k42ZEpyVK8rM69vWTwf3JgUt1b0e)

And try to login 

```
podman login my-registry.local:8443 --tls-verify=false --password=S5N7k42ZEpyVK8rM69vWTwf3JgUt1b0e --username=init
Login Succeeded!
```

## Step 4: Export the tarball to your private registry 


Now were going to push tarball to the private registry. 

In a machine (with similar tool podman + oc-mirror) in your airgapped network you will copy the tarball mirror_000001.tar and also the isc.yaml file we create before.

You connect to the private regitry to create the credential 
```
podman login my-registry.local:8443
```

```
oc-mirror -c ./isc.yaml --from file:///home/ec2-user/oc-mirror/mirror1 docker://my-registry.local:8443 --dest-tls-verify=false --v2
```

You should get this output 
```
2025/06/13 13:20:39  [INFO]   : 👋 Hello, welcome to oc-mirror
2025/06/13 13:20:39  [INFO]   : ⚙️  setting up the environment for you...
2025/06/13 13:20:39  [INFO]   : 🔀 workflow mode: diskToMirror 
2025/06/13 13:20:39  [INFO]   : 📦 Extracting mirror archive(s)...
/home/ec2-user/oc-mirror/mirror1/mirror_000001.tar (12.5 GiB / 12.5 GiB) [=====================================================================================================================================================================] 3m1s
2025/06/13 13:23:41  [INFO]   : 🕵  going to discover the necessary images...
2025/06/13 13:23:41  [INFO]   : 🔍 collecting release images...
2025/06/13 13:23:41  [INFO]   : 🔍 collecting operator images...
 ✓   (0s) Collecting catalog registry.redhat.io/redhat/redhat-marketplace-index:v4.16 
2025/06/13 13:23:41  [INFO]   : 🔍 collecting additional images...
2025/06/13 13:23:41  [INFO]   : 🔍 collecting helm images...
2025/06/13 13:23:41  [INFO]   : 🚀 Start copying the images...
2025/06/13 13:23:41  [INFO]   : 📌 images to copy 34 
 ✓   (1m54s) k10-operator@sha256:0c2b7910b9d084ed48f453339a92857cd7914cad34e3fb151049b5dab152b804 ➡️  my-registry.local:8443/kasten/ 
 ✓   (2m5s) bloblifecyclemanager@sha256:b1d914165ec815eed56afb51f9676292de4c3c2ec40338ad6dbf581fcb29a793 ➡️  my-registry.local:8443/kasten/ 
 ✓   (2m9s) catalog@sha256:0453ee093c5f0184f702d586c9cba47c82fc537e74d8d7899ad6b05b7d43ff23 ➡️  my-registry.local:8443/kasten/ 
 ✓   (2m16s) controllermanager@sha256:586e7cce34a606ce88d99b57f37f85d7e8fc43ba17ae044a1d6636ee95abb73a ➡️  my-registry.local:8443/kasten/ 
 ✓   (2m16s) jobs@sha256:07cf33d8125d2f0d049704e93e3742f45ff85f6b390fd28ea921b011498e4e69 ➡️  my-registry.local:8443/kasten/ 
 ✓   (2m28s) dashboardbff@sha256:5823813fa58120218514882821105a3825a9b3389d434e9f7b03e7218072da6f ➡️  my-registry.local:8443/kasten/ 
 ✓   (2m37s) crypto@sha256:10ff73774019f3fa3a5ce8f5c6a4c14fd3677a8df9a463d9b0ba4bbeabaf319a ➡️  my-registry.local:8443/kasten/ 
 ✓   (2m42s) aggregatedapis@sha256:4699e366251d830a1c5396f8b5d15a392b39e3f2767f12801614f1a7dd2ff995 ➡️  my-registry.local:8443/kasten/ 
 ✓   (1m38s) k10tools@sha256:58cc799c1f68630f46bfa244a333e9b7ff6aa8c44ca14dbfaa39855a7f48a8a2 ➡️  my-registry.local:8443/kasten/ 
 ✓   (1m16s) init@sha256:663d55bb2a48eddfb6b88c5ef28c617cedb00070d9ef025f95a311e89f61eaf9 ➡️  my-registry.local:8443/kasten/ 
 ✓   (1m49s) frontend@sha256:40da1f6dd94217a2a6c5f0d9fcbec4ffff8ff2c7eba923d8c3d4ca8a6961433e ➡️  my-registry.local:8443/kasten/ 
 ✓   (1m29s) gateway@sha256:77c10f633a8bc92c35b543c4ab7932fc203463970ef565daca2b96d517a11a38 ➡️  my-registry.local:8443/kasten/ 
 ✓   (1m41s) garbagecollector@sha256:32e44bff75a603f596d45fa7812c7b0fdb9795608f67d254e66741c6dd44284a ➡️  my-registry.local:8443/kasten/ 
 ✓   (2m4s) events@sha256:abca1e8325dc422f2961b9c46674c2fdcccd56fa96dc83b9adaf825f4ed6b02f ➡️  my-registry.local:8443/kasten/ 
 ✓   (2m15s) executor@sha256:dc00dd22f2a7482e9ff21937d7665a18b028077918d264d71bc2f533672b9910 ➡️  my-registry.local:8443/kasten/ 
 ✓   (1m41s) configmap-reload@sha256:686529987d26bcc45055a2ade0a034613050989b98e334c08b9063b6fab831d5 ➡️  my-registry.local:8443/kasten/ 
 ✓   (1m55s) auth@sha256:1bb857e67a59b3199a20931da68f816ac369c4448877b9921ad0a4aee04fb2ca ➡️  my-registry.local:8443/kasten/ 
 ✓   (2m3s) dex@sha256:30c0ee0f2244094f244c01827f59a637dcaa1928452dcabea94ec576be9e2c6a ➡️  my-registry.local:8443/kasten/ 
 ✓   (2m18s) kanister-tools@sha256:af7acde947c1534da83566b7ccc2517dc36a1295fcff28abebc365f3a0837bfc ➡️  my-registry.local:8443/kasten/ 
 ✓   (2m20s) kanister@sha256:06cf711a89c09f5f78eedc3aaba53dbbb272444fc0c52c81c14e8a64bbc5ffec ➡️  my-registry.local:8443/kasten/ 
 ✓   (4m42s) datamover@sha256:816040b6ad9ac1a6edd502959b2c4a85de66ae805d159fc069d0c05e09ae43d1 ➡️  my-registry.local:8443/kasten/ 
 ✓   (2m8s) logging@sha256:f771786e94ced8be52152e1356d604f0ad175c44418a20a7c86a69db8e9dbc48 ➡️  my-registry.local:8443/kasten/ 
 ✓   (2m35s) ose-kube-rbac-proxy@sha256:bb84ead437042603254efcb703442be8500a9450b10bbcaaee81b48a6ed869ea ➡️  my-registry.local:8443/openshift4/ 
 ✓   (1m58s) metering@sha256:ed6c54438e1a4d667eeee747bd0f1213bc948e01f7bdcb845f8a843f3abcf810 ➡️  my-registry.local:8443/kasten/ 
 ✓   (1m46s) metric-sidecar@sha256:9da7589f49ab4f580762f9a9836200fe5548eed2eccd1286709a2dfb067221be ➡️  my-registry.local:8443/kasten/ 
 ✓   (1m40s) ocpconsoleplugin@sha256:5439118dd25c6e3d82a177dbedb26e51bad2300d0ac3fc322de6e5b4b3a95733 ➡️  my-registry.local:8443/kasten/ 
 ✓   (1m22s) repositories@sha256:23231edd8d26874e618e3cfc76b0bf5045f43502816c666d9b898e69ecfc0624 ➡️  my-registry.local:8443/kasten/ 
 ✓   (1m8s) upgrade@sha256:0b3d01d788fc8763d9ac5e42ef2e0861150965b1d665df5db35aa78cfa9c87b9 ➡️  my-registry.local:8443/kasten/ 
 ✓   (1m17s) state@sha256:66d33455a331282ec3ccd4db96d0ec308c9034631cded253e0dc3400006b7b26 ➡️  my-registry.local:8443/kasten/ 
 ✓   (22s) kasten-rhmp-bundle@sha256:9613e2bc15a9f2f8dc708d072b3200831d41a9a704ef1e79f4eb60025430382f ➡️  my-registry.local:8443/kasten/ 
 ✓   (1m26s) restorectl@sha256:f09479ec7cd78752a13841eb47d08feb4a4aa9ec136a21137e1d5caa7ed527b7 ➡️  my-registry.local:8443/kasten/ 
 ✓   (1m38s) prometheus@sha256:cb9ebec8ea19b9201367cb5c7ab0731a99639269f2217aa38ea08777c67f903c ➡️  my-registry.local:8443/kasten/ 
 ✓   (52s) vbrintegrationapi@sha256:49f924acc8ebb6d7c5c143e9cfab8bae71343566ae02e1033ce23b1950c528cc ➡️  my-registry.local:8443/kasten/ 
34 / 34 (8m38s) [=============================================================================================================================================================================================================================] 100 %
 ✓   (47s) redhat-marketplace-index:v4.16 ➡️  my-registry.local:8443/redhat/ 
2025/06/13 13:32:20  [INFO]   : === Results ===
2025/06/13 13:32:20  [INFO]   :  ✓  34 / 34 operator images mirrored successfully
2025/06/13 13:32:20  [INFO]   : 📄 Generating IDMS file...
2025/06/13 13:32:20  [INFO]   : /home/ec2-user/oc-mirror/mirror1/working-dir/cluster-resources/idms-oc-mirror.yaml file created
2025/06/13 13:32:20  [INFO]   : 📄 No images by tag were mirrored. Skipping ITMS generation.
2025/06/13 13:32:20  [INFO]   : 📄 Generating CatalogSource file...
2025/06/13 13:32:20  [INFO]   : /home/ec2-user/oc-mirror/mirror1/working-dir/cluster-resources/cs-redhat-marketplace-index-v4-16.yaml file created
2025/06/13 13:32:20  [INFO]   : 📄 Generating ClusterCatalog file...
2025/06/13 13:32:20  [INFO]   : /home/ec2-user/oc-mirror/mirror1/working-dir/cluster-resources/cc-redhat-marketplace-index-v4-16.yaml file created
2025/06/13 13:32:20  [INFO]   : mirror time     : 11m40.466258086s
2025/06/13 13:32:20  [INFO]   : 👋 Goodbye, thank you for using oc-mirror
```
## Step 5: Configure OpenShift to Access the Private Registry

Before applying our mirror configuration files, we need to ensure that OpenShift can access images from our private registry. This involves two critical configurations:

### 5.1 Add Registry Authentication Credentials

First, we need to add our registry credentials to the global pull secret:

```bash
# Export the current global pull secret
oc extract secret/pull-secret -n openshift-config --to=.

# Add our registry credentials to the pull secret JSON
cat .dockerconfigjson | jq '.auths += {"my-registry.local:8443": {"auth": "aW5pdDpTNU43azQyWkVweVZLOHJNNjl2V1R3ZjNKZ1V0MWIwZQ==", "email": "admin@example.com"}}' > new-pull-secret.json

# Verify the new pull secret has our registry included
cat new-pull-secret.json | jq -r '.auths | keys[]'

# Update the global pull secret
oc set data secret/pull-secret -n openshift-config --from-file=.dockerconfigjson=new-pull-secret.json
```

The authentication string `aW5pdDpTNU43azQyWkVweVZLOHJNNjl2V1R3ZjNKZ1V0MWIwZQ==` is a base64 encoded version of `init:S5N7k42ZEpyVK8rM69vWTwf3JgUt1b0e`. You can generate your own with: `echo -n 'username:password' | base64`

### 5.2 Configure OpenShift to Skip TLS Verification

Since our registry uses a self-signed certificate (or might not have a valid certificate for the `my-registry.local` hostname), we need to tell OpenShift to skip TLS verification for this registry:

```bash
# Configure the cluster to trust the insecure registry
oc patch image.config.openshift.io/cluster --type=merge --patch '{"spec":{"registrySources":{"insecureRegistries":["my-registry.local:8443"]}}}'
```

Alternatively, you can create a complete configuration:

```yaml
cat <<EOF | oc apply -f -
apiVersion: config.openshift.io/v1
kind: Image
metadata:
  name: cluster
spec:
  registrySources:
    insecureRegistries:
    - my-registry.local:8443
EOF
```

### 5.3 Wait for Machine Config Changes to Apply

After updating the global pull secret and the image configuration, OpenShift will apply these changes to all nodes, which may require a rolling reboot:

```bash
# Monitor the Machine Config Operator status
watch oc get mcp
```

Wait until all Machine Config Pools show "UPDATED: True" before proceeding to the next step.

Now that OpenShift is configured to securely connect to our private registry, we can proceed with applying the mirror configuration files.

# Step 6 : Applying Mirror Configuration Files in OpenShift

When setting up the mirrored operator in your disconnected OpenShift cluster, you need to apply all three files generated by the oc-mirror tool:

1. **IDMS (ImageDigestMirrorSet)**: This file tells OpenShift where to find mirrored images based on their digests
2. **CatalogSource**: This makes the operator visible in OperatorHub
3. **ClusterCatalog**: Contains additional metadata for the mirroring configuration

```
cat /home/ec2-user/oc-mirror/mirror1/working-dir/cluster-resources/idms-oc-mirror.yaml
---
apiVersion: config.openshift.io/v1
kind: ImageDigestMirrorSet
metadata:
  name: idms-operator-0
spec:
  imageDigestMirrors:
  - mirrors:
    - my-registry.local:8443/kasten
    source: registry.connect.redhat.com/kasten
  - mirrors:
    - my-registry.local:8443/openshift4
    source: registry.redhat.io/openshift4
status: {}
cat /home/ec2-user/oc-mirror/mirror1/working-dir/cluster-resources/cc-redhat-marketplace-index-v4-16.yaml
apiVersion: olm.operatorframework.io/v1
kind: ClusterCatalog
metadata:
  name: cc-redhat-marketplace-index-v4-16
spec:
  priority: 0
  source:
    image:
      ref: my-registry.local:8443/redhat/redhat-marketplace-index:v4.16
    type: Image
status: {}
cat /home/ec2-user/oc-mirror/mirror1/working-dir/cluster-resources/cs-redhat-marketplace-index-v4-16.yaml
apiVersion: operators.coreos.com/v1alpha1
kind: CatalogSource
metadata:
  name: cs-redhat-marketplace-index-v4-16
  namespace: openshift-marketplace
spec:
  image: my-registry.local:8443/redhat/redhat-marketplace-index:v4.16
  sourceType: grpc
status: {}
```

The correct order of application is:

```bash
# First apply the ImageDigestMirrorSet
oc apply -f /home/ec2-user/oc-mirror/mirror1/working-dir/cluster-resources/idms-oc-mirror.yaml

# Then apply the ClusterCatalog
oc apply -f /home/ec2-user/oc-mirror/mirror1/working-dir/cluster-resources/cc-redhat-marketplace-index-v4-16.yaml

# Finally, apply the CatalogSource
oc apply -f /home/ec2-user/oc-mirror/mirror1/working-dir/cluster-resources/cs-redhat-marketplace-index-v4-16.yaml
```

Applying only the CatalogSource would result in pull failures, as OpenShift wouldn't know where to find the referenced images. The IDMS file is particularly critical as it maps the original image references to your mirror registry.

After applying all three files, verify that the CatalogSource becomes ready:

```bash
oc get catalogsources -n openshift-marketplace
```

You should see your catalog source with status "READY" after a few minutes. 

Now you can install kasten using the Operator hub !! Happy backup 👋 

