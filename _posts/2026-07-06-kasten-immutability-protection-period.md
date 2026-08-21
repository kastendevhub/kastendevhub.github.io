---
layout: post
title: "Understanding Kasten immutability: retention vs. protection period"
description: "Two concepts people constantly conflate — the retention of a restore point, set in the policy, and the immutability protection period, set on the location profile — and how the Blob Lifecycle Manager keeps your backups locked for exactly as long as they need to be."
date: 2026-07-06 09:00:00 +0200
author: clarencepouthier-michaelcourcy
image: '/images/posts/2026-07-06-kasten-immutability-protection-period/immutability.png'
image_caption: 'Understanding Kasten immutability: retention vs. protection period'
tags: [Kasten, immutability, object-lock, S3, azure-blob, retention, ransomware, sizing]
featured: false
published: true
---

When immutability comes up with a customer, one question always follows: *"how long are my backups actually protected against deletion or tampering?"* Answering it well means separating two things people tend to conflate: the **retention** of a restore point, and the **immutability protection period** applied to the objects that back it.

## Two different clocks

It is worth being precise from the start, because these two settings look similar but answer completely different questions.

- **Retention** is defined in your Kasten **policy**. It decides *how long a restore point stays alive* — how many daily, weekly, or monthly restore points Kasten keeps before letting them expire. This is a data-lifecycle decision: "I want 7 daily and 3 monthly restore points."

- **Immutability (the protection period)** is defined on the **location profile** — the object storage configuration — and enforced on the underlying storage through **S3 Object Lock** or **Azure Blob** immutability. It does not decide how long a restore point lives. It decides *how long the objects stay locked against deletion or tampering* — including how long you can still recover a restore point after it has been deleted locally and flagged as deleted on the object store.

In other words: retention answers *"how far back can I restore?"*, while the protection period answers *"how long do I have to react if something goes wrong before my backups become exposed again?"*

Kasten relies on the object-lock capability of the object storage (S3 Object Lock, Azure Blob immutability) to enforce this. As long as the lock is in place, nobody — not an attacker, not a compromised admin account, not Kasten itself — can delete or overwrite the object.

## Where each setting lives — and why it matters

This is the part that trips up most readers, so it is worth stating bluntly:

| | Retention | Protection period (immutability) |
|---|---|---|
| Configured in | The **policy** | The **location profile** (S3 / Azure Blob configuration) |
| Granularity | Per policy, per restore point class (hourly / daily / weekly / monthly / yearly) | One single value for the whole profile |
| Answers | How far back can I restore? | How long do I have to react to a compromise? |

Because the protection period lives on the location profile, **it is a single value that applies to every object written to that profile**. There is no such thing as "a monthly restore point gets a one-month lock and a daily restore point gets a one-day lock." A monthly restore point and a daily restore point exported to the same profile carry **exactly the same protection period**, because that number is a property of the target storage, not of the restore point's class in the retention schedule.

The two settings are not just independent — they are configured in two different objects, by two different mechanisms. Retention is a *tiered* schedule; the protection period is a *flat* value. If you genuinely need two different protection periods, the only way to get them is two different location profiles (typically two buckets with different Object Lock defaults) and two policies pointing at them — not a retention tier.

## Starting point: the business requirement

Take a concrete case. A customer states the following requirement:

- 1 daily backup
- 7 day retention for daily backups, 3 month retention for monthly backups
- immutability across all of these restore points

Note that the first two bullets are policy settings, and the third one is a location profile setting. The daily and the monthly restore points do not get their own protection periods: they share the one configured on the profile they are exported to.

Technically, this requirement can be satisfied with a protection period of just **1 day**. This is the point that usually surprises technical teams on the customer side, who tend to think in terms of "total immutability duration" rather than "detection window."

## What the protection period actually does

The protection period should not be read as *"how long are my backups locked."* It should be read as *"how long do I have to detect a compromise before my backups become exposed again."*

With a 4 day protection period, this means concretely: you have **4 days to detect an attack and initiate a recovery** before your backups could become vulnerable.

The reason a 1 day protection period can still satisfy a 3 month retention requirement is the mechanism described next: as long as a restore point is alive, the objects behind it keep having their lock renewed automatically.

## The role of the Blob Lifecycle Manager (BLM)

Veeam Kasten runs a background service, the **Blob Lifecycle Manager**, which continuously walks the repositories tied to location profiles. Its job is simple: for every object still referenced by a restore point, it checks and, if needed, **extends the retention lock** applied to that object.

This service guarantees it will inspect, and extend if necessary, every object in the repository within a **20 day window**. That guarantee is the basis for the formula found throughout the documentation: **protection period + 20 days**.

## Walking through a concrete example

Take a monthly restore point created on **July 1st**, with a protection period set to **4 days** on the location profile.

1. **Initial write (July 1st)**: the objects referenced by this restore point immediately receive a retention lock set 24 days out — 4 days of protection plus 20 days of BLM cycle margin. The initial lock date is therefore **July 25th**.
2. **BLM pass (before July 25th)**: the service guarantees that, before this deadline, it will have re-inspected the objects and extended their retention to at least 4 more days from the date of that pass, so **July 29th**.
3. **Following cycles**: this mechanism repeats throughout the lifetime of the restore point. So by October 1st, the associated objects will still carry a retention lock guaranteeing at least 4 more days, so **October 5th**.
4. **Restore point expiration**: once the restore point expires, and provided the objects are not referenced by any other restore point, they stop receiving retention extensions and are flagged for deletion.

The restore point in this example is a *monthly* one, but nothing in the calculation above depends on that. Run the same walkthrough for a daily restore point written to the same profile and you get the same 4 + 20 lock, the same extensions, the same dates. The only thing the "monthly" label changes is *when the restore point expires* — step 4 — because that comes from the retention schedule in the policy.

> **A note on the numbers.** We deliberately picked 4 days rather than a rounder value. With a 10 day protection period the initial lock lands at 10 + 20 = 30 days, which looks a lot like "one month" and invites the wrong conclusion — that the lock is somehow derived from the monthly retention tier. It is not. The 20 days come from the BLM cycle guarantee and nothing else. Using 4 days makes the initial lock 24 days, which maps to no retention frequency at all, and the arithmetic stays unambiguous.

## Illustrative diagram

![Veeam Kasten protection period timeline](/images/posts/2026-07-06-kasten-immutability-protection-period/protection-period-timeline-kasten.png)

## Why this mechanism changes how you size protection

This logic has a direct impact on sizing: **there is no need to match the protection period to the business retention duration.** A 3 month retention policy does not require a 3 month protection period. The protection period only sizes the detection and response window in case of compromise, while the BLM keeps immutability continuous for as long as the restore point stays active.

And since the protection period is a single value on the location profile, there is nothing to size *per restore point class* either. You size one number, once, per profile: the detection window you are willing to accept for everything landing in that bucket.

This is an important technical talking point in pre-sales, because it reassures a customer on two fronts at once: **compliance** (objects stay locked for as long as they are referenced) and **operational efficiency** (no unnecessary over-sizing of the protection period).

## Summary

- **Retention** (set in the **policy**) decides how long a restore point lives; **immutability / protection period** (set on the **location profile**, enforced via object lock) decides how long the objects stay locked — two independent settings, configured in two different places.
- The protection period is a **single flat value per location profile**. Daily, weekly and monthly restore points written to the same profile all carry the same lock duration; the lock is never derived from the retention tier.
- The protection period defines a **detection window**, not a total immutability duration.
- The Blob Lifecycle Manager guarantees a pass over every object within a 20 day window, hence the **"protection + 20 days"** formula for the initial lock.
- Every referenced object keeps having its retention extended until the restore point that references it expires.
- Once the restore point expires and the object is no longer referenced elsewhere, it is flagged for deletion.

This mechanism allows for robust immutability without oversized protection periods, while guaranteeing that no active object loses protection before its restore point legitimately expires.

## Frequently asked questions

### Can I set a different protection period for my monthly and my daily restore points?

Not within a single location profile. The protection period is a property of the profile — the S3 or Azure Blob configuration — not of the policy and not of the retention tier. Every object written to that profile gets the same lock duration, whether it backs a daily, weekly, monthly or yearly restore point.

If you really need two protection periods, you need **two location profiles** — in practice two buckets or containers with their own Object Lock settings — and two policies, each exporting to its own profile. That is an infrastructure decision, not a retention-schedule tweak.

### Why is the initial retention 24 days in this example?

Because the initial retention always follows this formula: protection period + 20 days of margin tied to the Blob Lifecycle Manager cycle. In this example, the configured protection period is 4 days. The BLM guarantees it will inspect, and extend if necessary, every object in the repository within a 20 day window. Kasten cannot set the retention to just 4 days, otherwise an object could lose its immutability before the BLM even gets a chance to check it. Hence the calculation: 4 (protection) + 20 (BLM margin) = 24 days, giving an initial lock of July 25th for a restore point created on July 1st. This 20 day margin is not usable retention, it is a safety buffer that guarantees the BLM will always have time to run its pass and renew protection before the initial deadline.

Note that the 20 days are a constant of the BLM, not something derived from your policy. If the protection period were 10 days the initial lock would be 30 days — which happens to look like "one month" and is a classic source of confusion. That 30 is 10 + 20, not a monthly retention tier leaking into the lock calculation.

### How does the Blob Lifecycle Manager detect which objects to extend?

The principle relies on the structure of the repository. Each restore point corresponds to a manifest in the repository, and that manifest references a set of objects (blobs) that make up the backup data. The BLM walks the repository and, for each object, checks whether it is still referenced by at least one active manifest, meaning a restore point that has not yet expired under the retention policy.

- If the object is still referenced, its retention — the lock on the underlying object storage (S3 Object Lock) — is extended.
- If the object is no longer referenced by any active restore point, its retention stops being extended and it becomes eligible for deletion, in line with the garbage collection cycle.

This background service monitors repositories that hold immutable backups, and each export can write new blobs or reuse existing ones (deduplication).

### What happens if the restore point is still referenced after several cycles?

The mechanism simply keeps repeating, indefinitely, for as long as the restore point stays active. Each time the BLM runs its pass, it checks whether the object is still referenced by an active restore point. If so, it extends the retention by at least the configured protection period, starting from the date of that pass. Since the BLM guarantees a pass over every object within a 20 day window, the effective retention of an object that is still referenced never drops below the protection period, no matter how many cycles have already run.

Take the example of a restore point created on July 1st with a 4 day protection period:

- Initial lock: July 25th (4 + 20)
- 1st BLM pass (before July 25th): extended to July 29th
- 2nd BLM pass (before July 29th): extended again, another 4 days from that pass
- and so on, cycle after cycle

There is no ceiling and no degradation of the mechanism. A restore point kept for 6 months, 2 years, or 5 years will keep being extended in exactly the same way, for as long as it stays referenced. What changes is not the mechanism itself, but the total duration the object stays protected, which becomes directly tied to the lifetime of the restore point.

### What happens to an object once the restore point expires?

Once the restore point expires, the object stops receiving extensions, but it is not deleted immediately.

1. **Extensions stop**: the BLM stops renewing the object's retention, since it is no longer referenced by any active manifest in the repository.
2. **Natural end of the lock**: the last retention lock applied (protection + margin) keeps running until its own deadline. The object therefore stays immutable until that date, even though the restore point that referenced it has already expired.
3. **Flagged for deletion**: once the lock reaches its deadline, the object is flagged for deletion and becomes eligible for the garbage collection cycle.

An object is never deleted the moment the restore point expires. There is always a residual delay corresponding to the last lock window set by the BLM, which prevents any risk of premature deletion for an object that just became unreferenced.

Worth mentioning: if the object is still referenced by another restore point (deduplication across multiple restore points), it keeps being protected and extended normally, regardless of the expiration of the restore point in question. Deletion can only happen once no active restore point references the object anymore.
