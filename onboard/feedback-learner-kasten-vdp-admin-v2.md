# Reflection — Kasten VDP Implementer, v2 review

**Reviewer:** Kasten VDP Implementer (VDP admin tasked with deploying Kasten)
**Reviewed:** Veeam Kasten for Kubernetes Fundamentals — for the Veeam Data Platform Administrator, v2 build (index.html + Lessons 01–05)
**Reading stance:** my change window is booked. I read all five modules once, straight through, as the runbook I'd actually execute against, not as study material.

---

## 1. What I (think I) now know

I came in strong on the backup side and weak on everything Kubernetes, and that's exactly the gap the course targets, so I'll say where I landed rather than re-litigate what I already knew.

I now have a working model of what I'm about to stand up: Veeam Kasten runs *inside* the cluster it protects, as a set of Pods in its own namespace (`kasten-io` by default), installed with one Helm command, and confirmed healthy by watching every Pod reach `Running`. I know the four things that gate the install — platform, Helm, namespace, storage — and I know that of those four, the storage question (does my CSI driver actually support VolumeSnapshots, and is exactly one VolumeSnapshotClass per provisioner annotated `k10.kasten.io/is-snapshot-class: "true"`) is the one worth spending real preparation time on, because no install flag fixes a capability the driver doesn't have. I know to run the primer tool before I touch anything else, and I know the deeper CSI check (`csi -s ${STORAGE_CLASS}`) is a real write-snapshot-restore-read rehearsal, not a formality.

I have the concept map I'll use to talk to my team: backup job → policy, backup repository → location profile, and — the one I will say out loud every time — snapshot is not a backup until it's exported. I know a policy with only the snapshot action will report green forever and still leave me with nothing recoverable if the array dies, because the export is a separate action I have to turn on deliberately. I know the difference between a local snapshot, an exported restore point, and an imported one, and I have a working decision rule for picking between them under pressure: is the local snapshot still trustworthy, and does the data need to land on the running application or somewhere else.

I know day-two ownership has a shape I recognize: patch → Helm upgrade (four-version window, 50% free catalog storage), read job sessions → dashboard compliance states plus Prometheus action metrics, configuration backup → the KDR policy protecting Kasten's own catalog. I know the two alerts to wire up on day one (`state=failed`, catalog volume >50%) and the escalation order before I ever open a support case (dashboard → System Information logs → debug script → k10tools → case).

## 2. What actually landed

The parts of this course that taught best are the parts that gave me something to *do*, not just something to know, and they're concentrated in Module 03 and Module 04:

- **The install "click each stage" flow in Module 03** is the single best-executed section in the course from my seat. Each stage names the exact command, cites its source, and tells me what I should see afterward. That's the standard I want every hands-on step held to.
- **The deployment-readiness checklist widget** (Module 03, Section 2) is a genuinely useful pre-implementation artifact — it's shaped exactly like the go/no-go checklist I'd already keep for a VBR upgrade, split cleanly into blocking vs. follow-up items.
- **The diagnostics stepper in Module 04** ("dashboard → System Information logs → debug script → k10tools → case") is the best piece of day-two material in the course. It's the first thing in five modules that reads like an actual runbook a tired person would follow at 2 a.m., in the right order, cheapest evidence first.
- **The restore-path decision tool in Module 05** maps directly onto real triage — "is the local snapshot still trustworthy, does the data need to land on the running application" is a rule I will actually carry into an incident.
- **The VDP-habit-to-Kasten-equivalent tables** (Module 04's day-two table, Module 05's "what carries over from a backup job" table) are exactly the bridge I asked for, and they're honest about where the parallel breaks rather than smoothing it over — "paused policies are ignored for compliance purposes, so your green dashboard is telling you nothing" is the kind of sentence that will save me from a real mistake.
- The insistence, repeated in every module, that snapshot ≠ backup landed hard, in a good way. By Module 05 I didn't need it restated — I was already asking "does this policy export, and to where?" on my own.

## 3. What confused me / the exact steps where my implementation would have stalled

This is the part of the reflection that matters most for my lane, so I'm listing it as a sequence of actual stall points, not general impressions.

1. **Registry/image-pull reachability, Module 03 Section 1.** The module states flatly that adding the Helm chart repo "is the only step in the module that talks to the internet rather than to your cluster." That's not true by the module's own later evidence — two sections later it shows an air-gapped registry override for the primer tool (`-i repo.example.com/k10tools:9.0.2`), which only makes sense if image pulls are a real network dependency. If my cluster sits behind restrictive egress (plausible in most enterprise environments I've worked in), I would run the Helm install in Section 3 with no warning, and every Kasten Pod would sit in `ImagePullBackOff` with nothing in the runbook having told me to check this first. This is the one place I'd genuinely lose a change window to a problem the module could have flagged.

2. **No credential field on the Veeam Repository location profile, Module 03 Section 6.** This is supposed to be *my* section — the one that connects Kasten back to the B&R estate I already run and secure — and the field list for it is DNS/IP, API port, repository name. Nothing about authenticating to the backup server. As someone who manages access to B&R today, I would stop here rather than guess, because I don't know if I need to provision an API account first, what permissions it needs, or whether there's genuinely no credential step and I'm missing something the dashboard shows that the module doesn't.

3. **"Elsewhere" for public cloud install credentials, Module 03 Section 3.** AWS gets a full, runnable install command with access-key flags. Azure, GCP, and on-prem vSphere get "as specified elsewhere," with no pointer to where that is. If my cluster isn't AWS, I don't have a command to run.

4. **The htpasswd generation step, Module 03 Section 4.** Every other command in this module is quoted verbatim with a citation. This one says "use an online tool or the htpasswd binary" and gives me the resulting flag but not the command that produces the value. I'd be generating security credentials for a backup product by guessing at flags from memory or a search — not where I want to be mid-install.

5. **"Missing deletionPolicy, using default" in the primer output, Module 03 Section 2.** This is shown as an example output line and never resolved as pass or fail. I genuinely can't tell from the module whether I'm clear to proceed or whether I have a VolumeSnapshotClass to fix first.

6. **No retry/rollback guidance if pods don't reach Running, Module 03 Section 3.** The one contingency instruction in the whole install runbook is "go to support docs." I don't know if it's safe to `helm uninstall` and retry, or whether that leaves the namespace or catalog PVC in a bad state. In VBR I would never be handed an install procedure with no "if this fails" branch beyond opening a case.

7. **`k10tools` used before it's ever installed, Module 04.** The binary is invoked directly (`./k10tools primer upgrade`, `k10tools frs`, storage-class validation) in at least three places, and I never see where it comes from. First invocation, dead stop.

8. **No click-by-click policy build, Module 05 Section 01.** This is the course's stated week-one task and, unlike the Helm install, I never get a rehearsed path through the actual New Policy dialog — only concept tables and one screenshot borrowed from Module 01. I have the vocabulary (snapshot frequency, export toggle, GFS retention) but I haven't watched myself click through the form once.

9. **"Adding the user to the k10:admins group," Module 05 Section 04.** I'm told this covers both required bindings at once, but never told *how* — is that the dashboard's Group subject field (shown three paragraphs later for a different purpose), an identity-provider claim, or a manual ClusterRoleBinding? The sentence assumes an action it never demonstrates.

None of these are comprehension problems — I followed the concepts fine. They're the moments where the page stopped being a runbook and started assuming I'd figure out the next click or command on my own.

## 4. What I'd still need before I ran this against production and put my name on the change record

Before I'd execute this for real, I would need, in order:

- **A confirmed answer on registry/image-pull reachability** for the actual cluster, and — if it's air-gapped or firewalled — the specific internal mirror or registry path to use, since the module only shows the pattern for the primer tool, not for the Helm install itself.
- **A confirmed answer on how the Veeam Repository location profile authenticates** to my B&R server, and if it needs a dedicated API account, its required permissions, before I'd point Kasten at production backup infrastructure I'm accountable for.
- **The actual install command for my platform** if it isn't AWS — I would not want to be improvising Helm flags against a real cluster from a course example that doesn't match my environment.
- **One full dry run of building, running, and restoring from a policy** on a non-production cluster, specifically because Module 05 never walked me through that click path — I want to have made my mistakes there, not on the first real application.
- **A tested KDR recovery**, not just an enabled one — the module is right that this is the question a director or CISO asks first, and I'm not going to be able to answer it credibly from reading alone.
- **Verification of my own RBAC assignment** — I'd want to watch the k10:admins binding actually happen once, rather than trust that "adding the user to the group" is self-evident.

Net assessment: this build gets me from zero to a plausible mental model faster than I expected, and the day-two material (Module 04's diagnostics order, the KDR rebuild path, the VDP-habit tables) is genuinely strong operational writing. But as an implementation runbook — which is the lens I was asked to bring — Module 03 has real gaps at exactly the places where a first attempt would stall silently (network/registry reachability, B&R authentication, non-AWS install credentials), and Module 05 asks me to build the thing I'll do every week without ever showing me the form. I'd want those closed before this became the document I hand to whoever signs off on my change window.
