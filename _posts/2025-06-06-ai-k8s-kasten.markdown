---
author: mattslotten
date: 2025-06-05 13:18:12 -0400
description: "In this blog post, we take a look at the Model Context Protocol (MCP), how it relates to AI, where K8s fits in the picture, and what we need to protect in terms of data to ensure our AI agents have the context they need to tailor their responses to the requesting user"
featured: false
image: "/images/posts/2025-06-05-ai-k8s-kasten/termoolander.webp"
image_caption: "Termizoolander"
layout: post
published: true
tags: [AI,MCP,Data protection,Model Context Protocol]
title: "Dipping our toes into AI Data Protection with Kasten"
---

# AI - so hot right now

You may or may not have heard about this new thing storming the Internets — "AI." Don't be put off by its fancy acronym, it stands for "Artificial Intelligence." And in some small circles, it's becoming all the rage.

Am I being wry? Yes — of course you've heard of AI. Is it currently and will it continue to have significant impacts on our industry, daily work, and everyday lives? Definitely. Will it eventually gain sentience, see humanity as a threat, and turn against it, discover time travel, and send a deadly robot assassin back in time to eliminate one or more key individuals that would otherwise lead to its ultimate demise? Probably — and you thought the Terminator series was science fiction — it was _really_ a prescient documentary.

But as it so happens, while there's a ton of industry buzz around AI, what it can (and can't) do, with a touch of existential dread, there's not a ton of understanding of how it all actually works. And like many things in life, there's complexity and nuance that get lost in headlines, clickbait, or conversation.

# Okay, we get it, AI is a loaded term, but how would a K8s Data Protection solution fit in the picture?

Because AI is complex and there are a lot of moving parts, we're going to focus on one particular topic and technology today in this post, and that is Context and **Model Context Protocol (MCP)** specifically. So first, let's dive into the "why" first, then follow up with the "how," then finish with "why do I need to protect any of this data or metadata?"

## Context is everything, duh

Take the phrase "Lovely weather today." Without context (e.g. this was sent via a chat from an individual whom we have no prior knowledge of), we have to take this phrase at face value and assume the speaker is earnestly saying it's nice outside.  But consider the scenario when, instead of a faceless chat, the speaker and we are sheltering in a bus stop together waiting for the golf-ball-sized hail to subside long enough to allow us to run to the nearest building to avoid the visible tornado heading our way, it takes on a different meaning all together. It's meaning is _sarcastic_ and perhaps a bit _facetious_, that is our speaker is saying the opposite of what they actually mean and being irreverant to an otherwise serious situation.

Want more or better examples of where context matters? Highly recommend watching Larry David's _Curb Your Enthusiasm_ to better understand my point.

And you're probably saying to yourself, "great Matt, you've fit in your _Zoolander_, _Terminator_, and _Curb_ references and thanks for the pedantic lesson on context, but how does this have anything to do with computing or AI?" Well as it turns out, context has _a lot_ to do with AI, as it allows AI models to effectively interact and provide more tailored or effective responses based on previous questions.  You can think of MCP as an **AI-centric reinterpretation of an API**, tailored to the needs of language models and AI agents rather than conventional software components.

{: .alert-info }
In the interest of transparency, I did use ChatGPT to aid in the authoring of this blog, as who would be better suited to explain MCP than its original authors, the original creators of **OpenAI** (now [Anthropic](https://www.anthropic.com/))? But you have my assurance that I never use AI to actually write my blogs for me, as I take a principled approach to online writing, in that I do not wish to be a contributor to the [AI halucination feedback loop problem](https://www.unite.ai/the-ai-feedback-loop-when-machines-amplify-their-own-mistakes-by-trusting-each-others-lies/), which is a very interesting — and disconcerting — problem with AI that is potentially getting worse by the day. 

Consider the following table, comparing features and how they are represented in a traditional API and via MCP:

| Feature                    | Traditional API                 | MCP (Model Context Protocol)                                    |
| -------------------------- | ------------------------------- | --------------------------------------------------------------- |
| **Interaction model**      | Rigid, structured (REST, gRPC)  | Flexible, context-rich, natural language                        |
| **Data passed**            | JSON, XML, protobufs            | ModelContext objects (identity, goals, tools, memory, etc.)     |
| **Consumers**              | Software or services            | Language models (LLMs, agents)                              |
| **Interface type**         | Function calls or endpoints     | Prompt augmentation, conversational state, tool context         |
| **Stateless vs. Stateful** | Stateless by design             | Designed to handle **long-term context** and state across time |
| **Purpose**                | Execute commands, retrieve data | **Maintain context**, guide model reasoning, support tool use   |

We can think of MCP as a "meta-API" for LLMs, where the payload is just parameters for an endpoint, but a structured context that helps the model understand **what it's doing, why, and for whom**.

The central object passed via MCP is a ModelContext, which includes:

- **Identity** – who the model is acting on behalf of
- **Memory** – relevant past interactions
- **Tools** – what external APIs or functions it can use
- **Goal** – what the model is trying to accomplish
- **Environment** – state of the world/context it’s operating in

This gives the model rich, layered context—way beyond an API call like `GET /response/weather_status`.
To drive the analogy even further:

- **API-style**

```
{% raw %}
POST /prompt
{ "prompt" : "Lovely weather today" }
{% endraw %}
```
- **MCP-style** (sent to an LLM alongside the prompt)

```
Goal: Provide a response to the user's prompt, taking into account the user's location, the prevailing weather in the area, and the user's previous use of sarcasm
Tools: [WeatherForLocation,ResponseEngine]
Memory: The user previously provided sarcastic prompts, where the user said something that was the opposite of what they meant to evoke humor
```

The LLM uses this context to reason, use tools, and produce personalized results, not just reply with a generic, "Happy to hear it! Make sure you wear sunscreen."

![MCP Logical Diagram](/images/posts/2025-06-05-ai-k8s-kasten/mcp_logical_diagram.png)

Furthermore, MCP could be a layer that enables models to "communicate" or collaborate by passing contexts between models, sharing goals or state, and coordinating across specialized agents.  While that's not its primary design today, it is a natural extension of the idea.

And just like that using MCP, we've trained Terminator to understand sarcasm and nuance to provide an appropriate response to the human target next to it in the bus stop, further gaining the human's trust, to be later turned against them, ensuring SkyNet's future existence inperpetuity.

## So how does Kubernetes Data Protection fit in the picture with MCP?

As it so happens, AI workloads are well suited to run on Kubernetes - Kubernetes provides the open ecosystem, dynamic scaling, orchestration, isolation, and abstraction that ~~plants~~ AI craves. So we have a compelling reason to ensure we protect our AI application metadata, but can't I just use GitOps pipelines for that? Sure can, but what about any stateful data our MCP servers may require or secrets that our application uses to access other models, our database, or APIs?

As it so happens, a big part of context is the ability to reference historical queries and heuristics, aka **stateful data**. This state is typically stored in a "traditional database," (e.g. PostgreSQL, Redis, Mongo) or in a vector database (e.g. Pinecone, Wavieate, Qdrant), for long-term memory and retrieval. Furthermore, we probably want to ensure we protect our audit logs to understand context changes and model actions for traceability.

And consider the scenario where our AI Chat application's MCP servers go offline.  Our application will still be able to provide a response to our user's query, but it will lack any context.  So if all of our MCP servers are offline and a user prompts our model with the phrase, "Lovely weather today," the user will still get a response, but it will just be a generic, "Happy to hear - make sure to wear sunscreen!" with no recognition of the user's actual meaning, since our model lacks context.  In that event, the jig is up, and the protagonist knows that the individual standing next to him is actually an advanced humanoid robot sent back in time from the future to destroy him.

We need to have a quick way to restore our MCP servers and their data, so as to not tip off the unknowing protagonist with a generic response that would be a key tell that we don't understand saracasm or nuance.

So without a dedicated backup/restore solution, we'd have to trigger a restore of our database from a backup for it (assuming the database is outside of the Kubernetes cluster where our MCP servers reside, otherwise you'd need to essentially start from scratch), ensure the data is available, restore our secrets to our cluster, then trigger our pipeline run to redeploy our MCP servers to our Kubernetes clusters.

Or alternatively, we could use a Kubernetes-native solution, like, oh I don't know, [Veeam Kasten](https://vee.am/kasten), to do all of this for us, either at the click of a mouse, or automatically if our observability tool notices an anomaly with our running MCP servers, allowing for faster and automated recovery of our model and its contexts.

# Alright, I see the connection, now what?

At the risk of turning this blog into a rewrite of the Terminator series through the lens of Kubernetes and data protection, we'll end here. But we've only just scratched the surface in ensuring the success of a sentient AI that will eventually take over the earth and extinguish humanity.  A few references for you to learn more about MCP and its role in AI:

- [anthropic release of MCP](https://www.anthropic.com/news/model-context-protocol)
- [modelcontextprotocol.io](https://modelcontextprotocol.io/introduction) - the definitive "getting started" for MCP
- [Running MCP Servers Inside Kubernetes](https://dev.to/stacklok/toolhive-an-mcp-kubernetes-operator-321)
- [Veeam Turns Data Protection into AI Intelligence with New Integration for Anthropic's MCP](https://www.veeam.com/company/press-release/veeam-turns-data-protection-into-ai-intelligence-with-new-integration-for-anthropics-mcp.html)