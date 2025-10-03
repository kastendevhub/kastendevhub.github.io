---
author: mattslotten
date: 2025-10-03 16:00:09 -0400
description: "In this blog post, we dive in on Kasten's data mover and backup target sizing"
featured: false
image: "/images/posts/2025-10-03-demystifying-datamovers/odyssey4.jpg"
image_caption: ""
layout: post
published: true
tags: [Sizing,Object Storage]
title: "Demystifying Kasten's Datamover Repository Sizing"
---
Data movers are akin to a "secret sauce" when it comes to data protection solutions. They are essential to performing backup and restore operations and can be designed in a myriad of ways to optimize performance, scale, storage utilization, and security.  In the case of k8s application data protection solutions, we often see "off-the-shelf" Kopia in both opensource (e.g. Velero) and proprietary solutions (e.g. OADP, Dell PowerProtect), while other solutions either custom-build their own, or optimize existing data mover solutions (Kasten falls in the last two camps).

And with these different datamovers come tradeoffs - whether in scale, complexity, support for various workloads, performance, storage capacity, etc all while ensuring data integrity and fidelity. As a result, getting a good estimate on the actual amount of storage consumed to protect a given workload can be difficult. Then throw in things like deduplication, compression, immutability, block and fileMode disks, and we're suddenly faced with a multivariable calculus equation.

![Multivariable Calculus](/images/posts/2025-10-03-demystifying-datamovers/math_meme.webp)

In this blog, we'll dive into Kasten's backup target sizing and do our best to distill this single variable into a simplified arithmetic equation.

{: .alert-info }
**TLDR**; Kasten Backup Target Size (Worst Case Scenario) = Full backup + (Retention Period * Change Rate) + (Protection Period * Change Rate) + _up to_ 20 days worth of additional data

Consider the following scenario:

An organization is protecting their K8s applications with Kasten and they wish to size their backup target storage appropriately. The organization requires:

- A 28-day **retention period**
- A 14-day **protection period**

From the [Kasten Official Documentation](https://docs.kasten.io/latest/usage/immutable/#protection-period):

> The **protection period** represents the estimated amount of time required by your organization to recover following impact. Recovery must begin within that protection period window in order to guarantee a successful restoration from immutable backups. The longer the protection period, the more time can be afforded for the recovery from an impact event like ransomware.

Assume I have a policy that runs daily, configured to keep my last 7 dailies and 4 weekly backups. Once a given daily RestorePoint has been retired (either manually, or by the Policy due to that daily not needing to be retained as a weekly RestorePoint), the RestorePoint resource no longer exists in the Kasten catalog but all of the objects still exist within the remote backup repository and cannot be deleted for at least <Protection Period> # of days (and as long as <Protection Period + 20 days>). 

The **protection period** is defined when a Location Profile (aka a backup target) is configured in Kasten:

![Kasten Protectin Period](/images/posts/2025-10-03-demystifying-datamovers/protection_period.png)

So why the extra 20 days? The **Blob Lifecycle Manager** (BLM) service in Kasten is the maintenance process that is responsible for updating the "retain until" metadata on objects mapped to non-retired RestorePoints. You may ask yourself, why not just set the "retain until" metadata to 14 days when the object is written, then just clean it up after the 28-day retention period?

Recall how above we mentioned that data mover design often faces tradeoffs while needing to ensure data integrity? Well one pretty handy feature of Kasten is its ability to support incremental and deduplicated backups, ensuring we only move the changed bits (or chunked blocks in the case of blockMode disks). We _could_ just set the "retain until" metadata on the blob as it is written and then BLM could clean it up after the 28-day retention period passes, however using that approach, we'd have to continually move the same data to the remote repository (aka the backup target) upon every policy run (e.g. perform a full backup every policy run). With this design, we'd have optimized simplicity, but at the cost of capacity, scalability, and performance.

Instead, Kasten will first perform a full backup, then every subsequent policy run will only move the data that has changed (aka forever incremental).  Consider the scenario where a single file was changed in a persistent volume after the first full policy run - Kasten will move the changed bits of that file to the remote repository (backup target) upon the next policy run and set the "retain until date" metadata to 28 days. Now let's consider what happens if that file never changes again. With Kasten, future restore points will depend upon that earlier written blob (recall, we're forever incremental), where we've initially set the "retain until date" as the date the policy ran + 28 days. So while our restore point data "retain until date" may lapse, today's restore point references that previous data, so we need to ensure we enforce immutability on that object for as long as today's RestorePoint has not been retired plus the protection period defined by the Locadtion Profile.

Updating the "retain until date" metadata of each object using BLM is an on-going, gradual task designed to prevent overwhelming storage by avoiding massive, frequent updates. As change rates, protected workloads, or retention periods increase, more I/O operations are required to lifecycle manage the backup data. When BLM updates each object, the "retain until date" is extended to <Protection Period> + 20 days to ensure the BLM has enough time to continuously update all repo metadata in the event you had a very short protection period defined.

We've chosen 20 days as the additional buffer, as we believe this is long enough to ensure data integrity as well as the ability to recover in a disaster scenario, but not too long to consume an excessive amount of storage.

So doing daily backups and retaining the last 28 dailies (assuming that's intentional and that 7 dailies and 4 weeklies would not be sufficient) the actual remote repo would still be storing data tied to:
+ 28 most recent dailies <-- driven by Policy Retention config
+ 14 most recent retired dailies <-- driven by Protection Period
+ up to 20 days worth of additional data <-- driven by how BLM refreshes object metadata

Using this design, Kasten optimizes performance, scalability, while ensuring data integrity, but at the expense of increased complexity and a slight storage capacity penalty (although a drop in the pond compared to doing all Full backups).


<h2>Data Protection Calculator</h2>
  <form id="calcForm">
    <label for="sourceSize">Source Data Size (GB):</label>
    <input type="number" id="sourceSize" required><br><br>

    <label for="changeRate">Data Change Rate (%):</label>
    <input type="number" id="changeRate" value="5" required><br><br>

    <label for="retention">Retention Period (Days):</label>
    <input type="number" id="retention" required><br><br>

    <label for="protection">Protection Period (Days):</label>
    <input type="number" id="protection" required><br><br>

    <button type="button" onclick="calculate()">Calculate</button>
  </form>

  <h3>Result (worst case):</h3>
  <p id="result"></p>

  <script>
    function calculate() {
      const sourceSize = parseFloat(document.getElementById('sourceSize').value);
      const changeRate = parseFloat(document.getElementById('changeRate').value) / 100;
      const retention = parseInt(document.getElementById('retention').value);
      const protection = parseInt(document.getElementById('protection').value);

      const result = sourceSize +
                     (retention * changeRate * sourceSize) +
                     (protection * changeRate * sourceSize) +
                     (20 * changeRate * sourceSize);

      document.getElementById('result').textContent = result.toFixed(2) + " GB";
    }
  </script>
