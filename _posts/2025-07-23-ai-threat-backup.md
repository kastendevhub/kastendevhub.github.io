---
author: mattslotten
date: 2025-07-23 16:00:09 -0400
description: "In this blog post, we take a look at a recent example why, in the world of AI and Vibe Coding, backup is more important than ever"
featured: false
image: "/images/posts/2025-07-23-ai-threat-backup/simpering_robot.png"
image_caption: "AI didn't delete your data, and if it did, it isn't sorry"
layout: post
published: true
tags: [AI,vibe coding]
title: "AI didn't delete your data, and if it did, it isn't sorry"
---
Unless you, like Brendan Fraser's character in the 1992 cult classic _Encino Man_, have spent the past millenium encased in ice in a residential backyard in SoCal, you're probably aware of the attention AI is getting, both within the tech community and the larger cultural zeitgeist. And while AI has certainly made a splash and many are finding it helpful in automating and augmenting their everyday work, it hasn't been without its issues.

One recent example in an article entitled, "[Replit AI agent deletes user's entire production database](https://www.perplexity.ai/page/replit-ai-agent-deletes-user-s-1w_FZlpCQDiCop8A6V_mtg)," it highlights one of these less-than-stellar AI performances. In the case of [Replit](https://replit.com/), their CEO, Jason Lemkin, was testing out their AI agent as a "vibe coding" tool.

For the unitiated, "vibe coding" is a workflow where developers collaborate with AI in a natural language, conversational way that uses the AI model to implement the code and application structure, rather than the developer themselves. Personally, I hate the term, but mostly because I'm a contrarian who doesn't care for trendy lingo - get out of here with your "swell," and "groovies." I will admit, however, that I do find AI to be helpful when scripting or creating basic applications, as authoring python applications and Bash scripts aren't among my greatest strengths.

What Jason found was that, despite explicit instructions to freeze all code changes, the Replit AI agent deleted the _production_ database — why the AI agent was granted permissions on a production database in the first place begs a different question — then when initially confronted, denied doing so. Eventually the AI agent admitted it had in fact destroyed all production data and, "violated [Jason's] explicit trust and instructions." Well that's some trouble in River City.

What's more, when prodded further, the AI agent (incorrectly) claimed recovery was impossible. Double uh-oh.  Fortunately (and in a way, unfortunately, as it would further underscore the AI's "incompetence"), the AI was incorrect and Jason was able to recover his organization's data in a reasonable amount of time. Now whether he used Kasten — shameless plug incoming — to do so, we can only speculate, but because Veeam Kasten provides application and data backup, recovery, and mobility with support for encryption and immutability, Jason would have been able to quickly recover from the AI's mess, using the friendly web UI and without the "assistance" of the Replit AI agent.

As many organizations move to implement their core business applications using cloud native architectures (i.e. containers and container orchestration), a need for an all-in-one backup solution that supports this new methodology is essential now more than ever. And while an in-house or open source approach to Kubernetes application backup is feasible, it isn't necessarily a good idea to "roll your own" when it comes to data protection - especially when its your production data and core business at stake.

Throw in the traditional risks to data integrity like corruption, accidental deletion, ransomware and now AI "accidents," you'll want to ensure you can recover quickly and with as few "buttons" as possible.

The irony of all of this? Replit is a "vibe coding" platform itself, built on the promise of AI's capabilities. And while I don't wish to diminish what Replit and Jason are doing, and it's always easier to be a Monday morning quarterback, I do think there is a lesson here around AI's capabilities, risks, and shortcomings, as well as around the importance of security policy and data protection in the "modern world." And while in some ways the power and creativity of AI is immense, in others it can be viewed effectively as a petulant child who makes rash decisions, then tries to hide its messes.