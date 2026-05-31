# Screening Call Script — Pranav P
*Talk, don't read. These are the points in the order I'd say them, in my own voice. Aligned with the résumé the recruiter has (naukri). Loose enough to go off-script and come back.*

---

## 0. Opener — "tell me about yourself"

So, I'm Pranav. I'm a data scientist and GenAI engineer, and right now I'm at FarmwiseAI as an Associate Data Scientist, about a year now. What I mostly do is build production LLM systems end to end. So agentic RAG pipelines, reliable voice agents, the ingestion infrastructure that feeds them, and fine-tuned domain models that we deploy on the cloud.

Before this my background was more classical ML, time-series, satellite imagery, explainable models for high-stakes decisions. So I sit kind of in the middle of data science and LLM engineering. And honestly that classical side really helps, it's how I judge whether an AI system is actually good or just looks good on a benchmark.

One thing I care about a lot is picking the right approach instead of the trendy one. Like for retrieval, I'll use a vectorless tree-walk when the documents have real structure and accuracy matters more than speed, and plain semantic similarity when that's good enough. I'll come back to that.

*(Stop here, let them steer.)*

---

## 1. Framing the FarmwiseAI year

So at FarmwiseAI the whole point was getting GenAI into actual products, not demos. Over the year I touched a bunch of different pieces, retrieval, voice, ingestion, model fine-tuning, some classical data work. Let me start with the one I'm most proud of, and then I can go wherever's useful.

---

## 2. Vectorless RAG *(my flagship, lead with this)*

So the piece I'm proudest of is a vectorless RAG system. Most RAG setups embed everything into a vector database and retrieve by cosine similarity. We started that way too, Qdrant with bge-large embeddings. But on our long, structured internal docs, policies, runbooks, product specs, it kept failing in this specific way: it'd return text that *looked* like the question instead of text that actually *answered* it. Similarity isn't the same as relevance.

So I moved us to a vectorless approach, it's PageIndex-style. Instead of embeddings, the LLM walks a tree-of-contents of the document and reasons its way to the right nodes, then answers from those. No embeddings, no vector DB. And on those structured docs it gave noticeably better answers, plus it's traceable, you can see exactly which sections it pulled from.

The bigger point for me is that it's about matching the method to the problem. Vectorless tree-walk when the document has real structure and you care about accuracy. Plain semantic similarity when the content's flat and speed matters more. I don't think one is universally better, you pick.

**If they ask "so embeddings are bad?"** — No, not at all, they're great when content is unstructured and you just need rough semantic matching. They just struggled on long structured docs where two passages can look very similar but only one answers the question. Different tool for a different shape of problem.

---

## 3. Production voice agents *(strong second)*

The other big one was voice agents, and the hard part there isn't the AI, it's making it reliable in real time. So it's a speech-to-text, then LLM, then text-to-speech loop, and I built it with per-hop latency budgets, interrupt handling, and a state machine so if the user cuts in mid-response it handles that cleanly instead of talking over them.

I solved two production headaches with what I'd call a companion-agent pattern. One was conversation drift, long calls bloat the context and the model starts losing the thread, so I built an auto-compact agent that summarizes the context every couple hundred thousand tokens. The other was the awkward pause when the agent has to look something up, so I added a parallel tool-calling agent that runs the tools while the main agent is still talking. So the user never hears dead air.

---

## 4. The cloud side *(group the AWS + Azure story here)*

On infrastructure, I've worked across both AWS and Azure, and I've got a few concrete things on each.

On **AWS**, the main one is a universal ingestion pipeline. It takes any input, PDFs, scans, audio, spreadsheets, images, and normalizes it into clean, LLM-friendly context. Each type gets routed to the right normalizer, so OCR for scans, speech-to-text for audio, table parsers for spreadsheets. The OCR part runs LightOnOCR-2, the 1B model, on **AWS SageMaker**, served with vLLM using PagedAttention and KV caching for throughput. I also fine-tuned and deployed small geospatial models on SageMaker, for location, terrain, and coordinate queries where the big frontier models just hallucinate. The main agent calls them as a tool, and it's both more accurate and a lot cheaper than routing every geo question through a GPT-4-class model.

On **Azure**, the big one was the satellite imagery project. The data lived in Azure Blob storage, a full year of imagery, so I used PySpark to parallelize the processing across a cluster instead of going field by field. I'll get into what it actually did in a sec if that's interesting.

**Quick version if they just ask "have you used cloud?"** — Yeah, both. AWS mainly for model serving, SageMaker plus vLLM with PagedAttention and KV caching, and for the fine-tuned geospatial models. And Azure for large-scale data, Blob storage plus PySpark on the satellite imagery.

---

## 5. Satellite imagery + DTW *(the classical-ML story)*

So that satellite project, the goal was to figure out when each farm field in Tamil Nadu got planted, even when there was no record of the date.

Like I said, the imagery was in Azure Blob and I processed it with PySpark in parallel. What I pulled out was a vegetation signal per pixel over time, basically a growth curve for each field. The catch is fields get planted on different dates, so their curves are all shifted in time and you can't just line them up. So I used Dynamic Time Warping, DTW, which matches two time-series by shape even when they're stretched or shifted. Once they were aligned I could work backwards and infer the sowing date for fields that had no metadata.

**If they ask "why DTW?"** — Because a straight day-by-day comparison breaks when two crops are at the same growth stage on different calendar days. DTW matches on the shape of the curve, not the timestamp, which is exactly the problem.

---

## 6. The other FarmwiseAI builds *(go quick, mention if relevant)*

A few other things I built there:

- An **agentic chatbot on Google ADK**, where I wired tools in over MCP, database queries, Google Search, and a Qdrant-backed RAG pipeline. This one's a good example of the "right tool for the job" thing, here semantic retrieval was fine as one tool among several. I added sub-agent routing so lightweight tasks go to smaller models, Pydantic validation on every response, and WebSocket streaming so you see it working live.
- An **internal intelligence platform**, basically a company-wide assistant on OpenWebUI, RAG-backed against our internal docs and policies. Self-hosted, with a swappable model backend so we can switch between Groq, local models, whatever, without touching the UI.
- And a **custom Tamil BPE tokenizer**, because English-trained tokenizers chop Tamil into way more tokens than needed, which wastes context and efficiency. The custom one gives the model a far more efficient Tamil vocab.

---

## 7. The tooling I run across everything *(say if they ask about engineering practices)*

Two things I use across basically every project. **LiteLLM** as a gateway in front of all the models, so I can swap providers without rewriting any calling code. And **Langfuse** for observability, every LLM call, trace, latency, and cost gets logged, so when something breaks in production I'm looking at an actual trace instead of guessing. And MCP as the standard way I connect tools between agents.

---

## 8. How I work day to day — AI-assisted tooling *(differentiator, say it)*

One thing about how I actually work: I lean really heavily on AI-assisted tools, Claude Code especially, and not just for autocomplete. I've gone pretty deep, I'm comfortable with its skills, hooks, and plugins. So I'll build custom skills for workflows I repeat, use hooks to automate things around my edits, pull in plugins, basically tune it to fit how I work so I get the most out of it.

It's made me a lot faster, I get from "here's the problem" to a working thing much quicker, which frees me up for the design and the hard calls instead of boilerplate. I genuinely think being good at *driving* these tools is becoming its own skill, and it's one I've put real effort into.

---

## 9. Earlier experience — keep it quick *(about a minute)*

Before FarmwiseAI I did three internships, that's where my classical ML foundation comes from.

At Infosys, data viz and analytics, dashboards in Power BI and Python, plus the usual preprocessing and exploratory analysis for non-technical stakeholders.

At Descpro, a loan-approval system for an NBFC. Eligibility-scoring models, an LSTM that predicted repayment delays per customer, and a forecasting model for incoming loan-application volumes.

And at Thapovan, a heart-attack-risk model. The interesting part was explainability, I used SHAP and LIME so a doctor could see *why* the model flagged someone. In a medical setting the prediction has to be defensible, you can't just hand them a score.

---

## 10. Side projects *(only if they ask "anything outside work?")*

Yeah, a few. I fine-tuned a small loan-officer agent, Gemma-2B with QLoRA and Unsloth, then quantized it to GGUF and ran it on CPU with llama.cpp, the point being a well-tuned small model can be a real production path with no GPU.

There's Companion AI, a voice support system for ICU patients, real-time speech-to-text plus BERT sentiment to catch distress and respond gently over TTS.

An agentic recruitment platform that scrapes job boards and uses Google's Opal model to rewrite resumes on the fly, matching skills to the job description through RAG. Most of the work there was actually error recovery, stale selectors, captchas, rate limits, not the LLM call.

And honestly my portfolio site itself is a project, it's a live vectorless-RAG demo. The chatbot on it walks a tree-of-contents of a markdown knowledge base about my work, and it shows you which nodes it picked. Runs on a single serverless function on Vercel with Groq, basically zero cost.

---

## 11. The stack, if they ask

GenAI side: RAG both vectorless and traditional, agentic systems, LangChain, LangGraph, Google ADK, MCP, vector DBs like Qdrant and FAISS, vLLM, LiteLLM, Langfuse, Unsloth, QLoRA. Classical ML: LSTMs, random forests, time-series, DTW, explainability with SHAP and LIME. Backend and infra: Python, FastAPI, Pydantic, WebSockets, and cloud across AWS SageMaker and Azure. Data: SQL, Pandas, NumPy, PySpark, Power BI. And I work AI-assisted day to day, mainly Claude Code.

---

## 12. Closing — why me

So the through-line is I've done both halves, the classical data-science modeling and the LLM engineering, and I've actually shipped them to production on the cloud, not just prototyped. I like the problems where I have to pick the right method instead of the obvious one, like the vectorless RAG call, and then make it reliable enough to actually run. And I move fast because I've gotten genuinely good at using AI tooling. That's the work I want to keep doing.

---

### Cheat sheet — glance only, don't read out
- **Role:** Associate Data Scientist, FarmwiseAI, ~1 yr
- **Flagship:** vectorless RAG (PageIndex tree-walk) — moved off Qdrant/embeddings on structured docs; "right tool for the job"
- **Second:** production voice agents — latency budgets, interrupts, companion-agent pattern (auto-compact + parallel tool-calling)
- **Cloud AWS:** ingestion pipeline · OCR LightOnOCR-2 on SageMaker + vLLM · fine-tuned geospatial small models
- **Cloud Azure:** satellite imagery in Blob → PySpark parallel → DTW → infer sowing dates
- **Also:** ADK+MCP+Qdrant chatbot · OpenWebUI internal platform · Tamil BPE tokenizer
- **Cross-cutting:** LiteLLM gateway · Langfuse observability · MCP
- **How I work:** AI-assisted, Claude Code (skills / hooks / plugins)
- **Answer shape:** problem → what I did → why that choice → result
- **Breathe. Pause after each story. Let them jump in.**
