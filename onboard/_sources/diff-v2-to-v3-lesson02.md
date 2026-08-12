# diff v2 → v3 — Module 02 (Lesson02_Kubernetes_Foundations_for_Backup_Admins.html)

Round 2 reviewer rows: `_sources/rows-round2-lesson02.json` (1 row — Kasten Director, minor).
Disposition: **0 applied · 1 adjusted · 0 deferred.**

## Minor rows

- **KDO-v2-009** — **ADJUSTED.** Location: Namespaces section, dashboard screenshot figcaption. The Director's read is correct — "SLA" lands in the module as a verbatim product term without ever being unpacked, and a director-level reader really could carry "SLAs are being respected" back to their own leadership as if Veeam Kasten were reporting against an externally negotiated commitment. The gap is real and the fix belongs exactly where the row puts it.

  I did not ship the proposed sentence unchanged, though. The proposal tacks the clarifying clause onto the end of the sentence under the same `[Src: Kasten Docs 9.0.2 p.301]` citation that already covers the primary claim ("compliant... SLAs are being respected"). p.301 supports that primary claim but says nothing about what constitutes the SLA — it uses the term without defining it, same gap the Director is flagging. Citing p.301 for a clause p.301 doesn't support would trade one glossed-over term for one mis-cited claim, which is worse, not better.

  So I verified the clarifying clause against its own source before shipping it. p.382 ("Using Policy Presets"): "Operations teams can define multiple protection policy presets that specify parameters such as schedule, retention, location and infrastructure. A catalog of organizational policy presets and SLAs can be provided to the development teams..." — this is where the product ties "SLA" to policy-preset parameters (schedule, retention) rather than to any external contract. p.620 (glossary) reinforces it: "PolicyPreset... can represent organizational SLAs requiring a user to specify only the application details to be used in a Policy." Both pages confirm the Director's underlying point — a Veeam Kasten "SLA" is the policy's own configured parameters, not a negotiated external commitment — so the clarification is a verifiable claim, not just plausible-sounding filler.

  Shipped: the clause keeps the Director's exact wording ("meaning the policy's own configured schedule and retention, not a separately negotiated or externally audited service-level agreement") but carries its own citation, `[Src: Kasten Docs 9.0.2 p.382]`, placed immediately after the clause per this file's established convention of one citation per clause (see the existing p.303/p.303 and p.4/p.4 sentence pairs elsewhere in the file) rather than stacking two citations at the sentence's end. The original `[Src: Kasten Docs 9.0.2 p.301]` citation is untouched and still sits directly after "are being respected," where it belongs.

  Full sentence now reads: "...compliant when a policy applies and its service-level agreements (SLAs) are being respected [Src: Kasten Docs 9.0.2 p.301] — meaning the policy's own configured schedule and retention, not a separately negotiated or externally audited service-level agreement [Src: Kasten Docs 9.0.2 p.382]."

## Deferred

None. The single row is adjusted (re-cited, wording unchanged) and shipped.

## Net change

v3 closes the one open gap from the Round 2 audience panel: "SLA" no longer appears as an unexplained product term in the dashboard figcaption. The fix is scoped to a single sentence — one clarifying clause with its own verified citation (p.382, corroborated by the p.620 glossary entry) — and does not touch the clause's existing p.301 citation, the screenshot, the alt text, the green callout beneath it, or any other section of the file. No naming, structure, or code-block changes were needed or made.
