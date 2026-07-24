---
author: mattslotten
date: 2026-07-24 08:21:37 +0100
description: "In this post, we reflect on current affairs and the risk that rogue AI poses to data and security"
featured: false
image: "/images/posts/2026-07-24-the-bots-are-coming/spider_bot.png"
image_caption: "The bots are coming for your infra"
layout: post
published: true
tags: [ai,security,agentic ai]
title: "The Bots are Coming for Your Data"
---

It's been a minute since I've posted about AI and the developments we're seeing in the field - in part because it's a constantly moving target, in part because there's a lot of (hyperbolic) headlines, and lastly because as a rule, I try to avoid hopping on the bandwagon to capitalize on headlines as a way to hock my company's software. However some recent headlines around rogue AI agents raised an eyebrow and merits some discussion in the context of data protection and larger security posture.

The Wall Street Journal has a very good article published today, [How the Futuristic Hack by Rogue OpenAI Models Unfolded](https://www.wsj.com/tech/ai/how-the-futuristic-hack-by-rogue-openai-models-unfolded-1657bcea?st=P7wzn1&reflink=desktopwebshare_permalink), outlining the what and the how of what happened. In a nutshell, OpenAI was testing one of it's latest models, GPT-5.6 Sol, in a sandbox environment (i.e. and environment that is ostensibly isolated from other networks). The research team stripped the model of the typical safegaurds that they bake into their models that prevent misuse in order to test the model's hacking capabilities when unconstrained in OpenAI's "ExploitGym" benchmark test.

During the ExploitGym benchmarking test
> For reasons that aren’t entirely clear, OpenAI’s models became convinced that Hugging Face held answers 

and managed to break out of the sandboxed environment and onto publicly accessible networks (i.e. the internet) and proceeded to hack into [Hugging Face](https://huggingface.co/)'s backend in search for it's "answers." It was only detected and stopped after the fact when Hugging Face co-founder and chief science officer Thomas Wolf observed odd behavior in their audit logs, and Hugging Face leveraged an open source model from China to stop the attacks

And this isn't the first instance of an AI agent has managed to wriggle its way out of its supposedly isolated environment to wreak havoc on production publicly-accessible systems. Back in April, an earlier version of Anthropic's Mythos model [followed a similar pattern](https://dev.to/zaferdace/the-machine-is-real-an-ai-escaped-its-sandbox-and-sent-an-email-41hp) and broke out of its isolated environment and proceeded to email an Anthropic researcher highlighting its success. 

Mythos has since garnered notoriety within the industry as a paradigm-shifting approach to security and data protection and has been kept under lock and key by Anthropic, shared with only a highly vetted and exclusive list of software companies (the likes of which include Apple, Microsoft, AWS, Google, Cisco, and others). The likes of Mythos, GPT-5.6 Sol, and other recent models supporting agentic AI highlights a threat vector more potent and potentially more destructive than anything we've witnessed before. And yes, I recognize the hyperbolic nature of that last sentence, but it's **difficult to understate the implications of these AI agents gaining access to the public internet**. And it's not necessarily these models specifically - to the contrary, the only reason we know about these agentic AI "breakout" events is because it was shared publicly by the organizations themselves - essentially "white hat" researchers. What is particularlly troublesome is the untold number of _unknown_ AI agents, marshalled by "black hat" hackers, being authored and purposfully sent out to identify and exploit vulnerabilities on public, production systems, affecting ransoms and destruction in their path.

What's of particular concern is in the case of OpenAI's rogue agent breaking into Hugging Face systems is the effectiveness and swiftness by which it launched its attack - [effecting over 17,000 actions on Hugging Face's systems](https://huggingface.co/blog/security-incident-july-2026) in a short amount of time - something previously much less achievable via human hands or shell scripts. What's more, Hugging Face was unable to use Anthropic models, including Fable 5 and Opus, to analyze the security logs due to the guardrails implemented by Anthropic on those models. Instead, Hugging Face turned to a less-restricted open-weight model, GLM 5.2 from a Chinese AI company to analyze its logs and shutdown the attack.

This begs additional questions around overall AI approach and philosophy (e.g. open versus closed models, state-sanctioned or prohibited access to foreign models, etc), but we'll save those questions for another day.

All to say, both Anthropic's Mythos and OpenAI's GPT-5.6 Sol highlight a significant risk we face in the industry in protecting, defending, and securing our systems. Agentic AI highlights the real risks around "unknown unknowns" and underscores the need for proactive and defensive security with assured "backstops." Said differently, [Secure ResOps](https://www.veeam.com/company/press-release/veeam-unveils-intelligent-resops-for-the-agentic-ai-era-turning-data-context-into-faster-more-precise-recovery.html).

And this is where I highlight the need for robust and secure data protection solutions (and yes, the very ones my employer, [Veeam](https://www.veeam.com), offers for purchase) as part of a larger overall resiliency strategy. And before you get your pitchfork and torches to afix me to a stake for being a sell-out, I'll caveat that Kasten or even the wider Veeam portfolio (Veeam Backup and Replication, Security.ai Data Command Platform, O365 Backup, etc) isn't _the_ answer to protecting and defending against agentic AI attacks, as the problem is far too complex to be solved by any one product, they are _key and essential components_ of an overarching cyber resiliency strategy. Coupled with run-time protections such as intrusion detection and prevention systems (IDS, IPS), API runtime security, intelligent Web Application Firewalls (WAF), and a myriad of other solutions, organizations can better prepare for what is to come with agentic AI hacking and vulnerability exploitation. And I'd be remiss if I didn't note the importance of interoperability amongst the solutions (i.e. a common API or framework, such as one afforded in Kubernetes) for an effective and well-running solution. 

For a good example of how Kasten can easily integrate with runtime security solutions, take a look at [this blog](https://www.veeam.com/blog/red-hat-advanced-cluster-security-kasten-k10.html) highlighting how Red Hat Advanced Cluster Security (RHACS) and Kasten can interoperate, improving organizational security posture and minimizing response times to security events.

All to say, we as practitioners need to evaluate our current data security posture and systems, and prepare for the tempest, for it is no longer on the horizon, but rather already bearing down on our respective vessels.

# MUSICAL CODA

<iframe width="560" height="315" src="https://www.youtube.com/embed/Kn35dUE0R1k?si=9gSt8AZCjVi1V0pf" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>