# Learner Reflection — Kasten Backup Administrator (traditional-backup learner)

**Reviewing:** v2 build, `Kasten_SelfPaced_VDP_to_Kasten` — index.html + Lessons 01–05
**Reviewer persona:** Backup Administrator, deep Veeam Data Platform / VMware background, three weeks into Kubernetes, GUI-preferring
**Read order:** index → Lesson 01 → Lesson 02 → Lesson 03 → Lesson 04 → Lesson 05, straight through, at a real learner's pace

---

## 1. What I (think I) now know

I came in able to run a Veeam Data Platform estate blind — jobs, repositories, retention, restore tests, the works — and knowing basically nothing about Kubernetes beyond "it's the container thing everyone keeps mentioning in planning meetings." Five modules later, here's the model I'm walking away with:

- **The unit of protection changed, not the job.** I still schedule, retain, and prove restores. What I'm scheduling against is an *application* — a namespace's worth of Kubernetes objects (workloads, config, secrets, storage claims) plus volumes — not a bounded object like a VM. Most of what gets captured isn't even data; it's the shape of the thing.
- **Snapshot ≠ backup, and this time it actually matters more than it did for me before.** A Kasten policy's snapshot action is fast, cheap, and lives on the same storage as the primary data. Nothing survives that storage dying unless the export action is also turned on. I now know to ask "does this policy export, and to where?" as reflexively as I'd ask "where's this job pointed?"
- **The concept map, roughly:** backup job → policy, backup repository → location profile, snapshot-vs-backup → snapshot-vs-export, app-aware processing → Kanister blueprints, proxies/agents → in-cluster services I don't place or size myself.
- **Deployment is a Helm install into its own namespace (`kasten-io`), verified by watching pods reach Running** — not an installer wizard, not a server I log into.
- **Day two:** upgrades are gated by a four-version window and 50% free catalog space; the platform watches itself through dashboard compliance states and a built-in Prometheus instance; and Veeam Kasten Disaster Recovery (KDR) is the "who backs up the backup system" answer — a dedicated policy, an immutable location profile, a passphrase I have to be able to retrieve without asking the person who set it up.
- **The restore decision tree:** local snapshot if the storage under it is fine, exported backup if it isn't, import policy only if the source cluster itself is gone. Restore into a new namespace by default when I don't need to touch the running app. And RBAC is Kubernetes objects (ClusterRoleBindings, RoleBindings), not a user list inside a console.

If someone put me in front of a Kasten dashboard tomorrow, I think I could correctly name what I'm looking at. I would not yet trust myself to build a production policy from a blank form without the course open next to me.

## 2. What actually landed

The snapshot-versus-export distinction is the one thing this course clearly built its whole spine around, and it worked on me. It's said once hard in Module 01 ("a snapshot is not a backup until you export it"), then it's quietly reinforced in every single module after — Module 02's CSI durability section, Module 03's storage integration section, Module 04's cost-lever note, Module 05's policy defaults. By the time I hit it the fourth time I wasn't being taught it anymore, I was just recognizing it. That's the repetition pattern I wish every unfamiliar concept in a course like this got.

The "where the analogy breaks" discipline is real, not decorative. Module 01's concept-map widget doesn't just say "policy is like a job" and move on — it tells me the membership model is a live selection, not a curated list, which is exactly the kind of thing that would bite me in production if nobody said it out loud. Same with the location-profile warning not to treat it like a repository folder I can poke at. I trust this course more than I'd trust a plain feature list, because it keeps telling me where my own instincts stop being safe.

The screenshots did real work, especially the policy dialog in Module 01 (frequency and retention above the line, the export toggle below it) and the three RBAC-assignment screenshots in Module 05 (same form, three fills — admin, tenant, read-only). I didn't have to imagine what any of this looks like.

The RBAC framing in Module 05 — "the instinct to look for a user list inside the product is the one to unlearn here" — named my exact expectation before I could form it wrong. That's the best kind of pre-emptive correction.

And the honesty about what doesn't map (application mobility, in Module 01) landed better than if the course had strained to invent a VDP parallel for it. Being told "this one's genuinely new, here's why it exists" is more useful than a forced analogy would have been.

## 3. What confused me / where I got stuck

**"Namespace" got used on me before it was mine.** Module 01 leans on the word repeatedly — "namespace selection is how most policies choose what to protect," "inside a namespace on a cluster" — and I could follow along well enough from context to guess it's some kind of boundary. But it isn't actually *defined* until Module 02, Section 4. Compare that to how the same module treats "Helm": the text explicitly says "Helm is Kubernetes' package manager, covered fully in Module 02, so file the term away rather than chasing it now." Namespace didn't get that same courtesy — it just got used as if I already had it. I got away with an approximately-right guess this time, but I noticed myself doing exactly what the persona for this review exists to catch: inferring a definition from context instead of being given one. If Module 01's own end-of-module quiz hadn't essentially handed me the definition in a wrong-answer distractor, I'm honestly not sure I'd have caught my own gap.

**The PromQL queries in Module 04 are the one spot where the course's own habits abandoned me.** Every shell command up to that point gets translated — "read it as three sentences," "what you should see is…" The two PromQL examples in the monitoring section (`sum(round(increase(action_ended_total{...}[24h])))`) get no such treatment on the first one, and only a plain-English gloss on the second one's *purpose*, not its syntax. I don't know what `increase()` does over a range vector, I don't know what `[24h]` means as notation versus a duration I'd type somewhere else, and I don't know why `sum` and `round` are both wrapped around it. I could still follow the module's actual point — create alerts for failed actions and catalog space over 50% — without decoding the query language. But if I ever have to write my own PromQL, this section didn't arm me for it the way the rest of the course armed me for `kubectl` and Helm.

**Module 03's "this module is command-line first" note is honest, but it landed a little cold.** I appreciated being told up front rather than discovering it. What I didn't get was the one reassuring sentence that would have told me *why* — that Kasten doesn't have (and can't really have) a GUI installer, because the GUI is the thing being installed. Module 02 had already given me the installer-package-plus-answer-file analogy for Helm, so the groundwork was there; Module 03 just didn't call back to it at the moment I needed the reassurance most.

**"GitOps" showed up twice with no name-tag on it.** Both times (Module 02's Helm section, Module 03's install section) the sentence around it does enough work that I could infer "keep your install command in version control," but the term itself is never spelled out, and it's exactly the kind of Kubernetes-ecosystem word I'd nod through in a meeting without admitting I didn't know it.

**Small one:** the Kopia data-mover explanation in Module 03 (dedup, encrypt, compress, "nothing for you to configure") is accurate and reassuring on its own terms, but it read to me like a new capability rather than a familiar one. It took me a beat to realize this is just doing for Kubernetes exports what a VBK file already does for me today — nobody said that out loud, so I had to make the connection myself.

## 4. What I'd still need

Before I'd trust myself to run this in production, on top of what the course already told me to go do (build one policy end to end on a real cluster, export it, restore it somewhere else, time myself):

- **A hands-on pass at reading a PromQL query, even a five-minute one.** I can create the two recommended alerts by following the module's instructions verbatim, but I couldn't write a third one from scratch, and I'd want that before I'm the person my team calls when an alert needs tuning.
- **Confirmation of where "namespace" first needed defining**, honestly more for the next learner behind me than for myself now — I got there, but on an inference I didn't fully trust until Module 02 confirmed it.
- **A real storage team conversation about CSI snapshot support on our actual array**, before I schedule anything against it — Module 03 told me to run the primer tool and the deeper CSI validation rather than take a vendor's word for it, and I intend to actually do that, not just remember that I was told to.
- **One rehearsed KDR recovery**, end to end, onto a genuinely empty cluster — the course walked me through the five stages clearly, but "I read the five stages" and "I have watched a passphrase and a location profile actually bring a catalog back" are different levels of confidence, and only one of them is the one I'd want before a real disaster.
- **Time with the RBAC "more flexible permissions model"** that Module 05 names once (scoped to specific applications, between k10-basic and k10-admin) but doesn't walk through — I'd want to see that built once before I'd offer it as an option to an application team.
