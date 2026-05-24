# FarmwiseAI — current role
> Associate Data Scientist, April 2025 – now. Where I ship production GenAI end-to-end.

## Cross-cutting tools

**LiteLLM** is the LLM gateway across nearly everything below. It lets me swap providers (Groq, OpenAI, Anthropic, local models) without rewriting calling code, unifies cost and latency observability in one place, and means the rest of the system is written once instead of per-provider. I've used it on every project at FarmwiseAI — vectorless RAG, voice agents, the OpenWebUI assistant, the ingestion pipelines, and the fine-tuned-model serving stack.

**Langfuse** is the observability layer for the AI applications I ship. Every LLM call, every trace, every agent step gets logged — which means when something goes wrong in production I can actually see what the model saw, what it returned, how long it took, and what it cost. Debugging agentic systems without traces is guesswork; with Langfuse it becomes a diff.

**MCP (Model Context Protocol)** is how I connect tools between agents. Instead of building bespoke tool-call adapters for each agent framework, MCP gives me a standard protocol so the same tool server can be consumed by different agents (or different clients) without changes. It's underrated and is becoming the standard for tool-use systems that need to work across clients.

## Vectorless RAG agentic system
> PageIndex-style retrieval — no vector DB, no semantic similarity. LLM reasons over a tree-of-contents.

### What it is
I built a retrieval pipeline that walks a hierarchical tree index of our internal documents using LLM reasoning, rather than cosine similarity over embeddings. The core insight from the PageIndex paper is that similarity ≠ relevance: vector search finds text that *looks like* the query, not text that *answers* it. By letting an LLM reason over a tree-of-contents, we get retrieval that's traceable, interpretable, and more accurate on long structured docs.

### Why it beats semantic search here
Our internal docs have real hierarchy — policies, product specs, runbooks. A chunked-and-embedded approach flattens that structure and relies on surface similarity. A tree walk preserves the doc's logical organization and lets the model explicitly reason "this question is about X, which lives under Y > Z" before fetching content. For long docs with sections that talk about the same topic in different contexts, this is a big quality win.

### How it's wired up
Build time: docs get parsed into a tree (headings become nodes; content lives at leaves). Query time: an LLM reads the ToC (titles + summaries), picks node IDs, and a second LLM call answers from just those nodes. Two calls, stateless, no vector DB to maintain.

### How we got here
We didn't start vectorless. The first version was the standard playbook — Qdrant for the vector store, bge-large for embeddings, cosine similarity for retrieval. It ran fine, but the answers were often wrong. The retriever was pulling text that *looked like* the question rather than text that *answered* it. On our long structured documents — policies, runbooks, product specs — that gap kept showing up as bad answers. I came across the PageIndex approach, built a version on top of the same document set, and answer quality went up immediately. We've stayed on it since. The honest trade-off: two LLM calls per query costs more latency and more tokens than one embedding lookup, but for internal documents where being correct matters more than being instant, that's the right side of the trade.

## Production voice agents
> Reliable STT ↔ LLM ↔ TTS loops with guardrails and latency budgets.

### What I built
Voice agents that actually hold up in production — meaning they don't break when a user interrupts, when STT returns garbage, when the LLM starts rambling, or when network latency spikes. The hard parts aren't the individual models; it's the orchestration: interrupt handling, partial-transcript routing, silence detection, and fallbacks when any component times out.

### What makes them reliable
Strict latency budgets on every hop, hard cutoffs on LLM generation length, guardrails against prompt injection over voice, and a state machine that handles the "user started talking mid-response" case cleanly. I also version the system prompt aggressively — voice is less forgiving than chat because users can't see or edit their input before it gets sent.

### The two problems we hit in production
Two things kept biting us once real users started talking to these agents — both solved with a small companion-agent pattern alongside the main voice agent.

**Context bloat.** Conversations accumulate. Once the running context crossed a couple hundred thousand tokens, latency and cost both climbed and the model started to drift. The fix was an *auto-compact agent* that runs every 200k–300k tokens — it summarizes the conversation down to what's actually needed for continuity, then hands the compressed version back to the voice agent's context. The voice agent never sees the bloat.

**Tool-call latency.** When the voice agent needs to look something up — a RAG call, a resource lookup, anything that takes a real round-trip — the user hears a pause. The fix was a *parallel tool-calling agent* that lives alongside the main one. The voice agent signals its intent to call a tool before it starts speaking; the second agent runs the tool in parallel while the voice agent is still talking. By the time the result is needed, it's already there. The user just hears a fluent response.

## Universal ingestion pipelines
> Normalize any input — PDFs, scans, audio, spreadsheets, images — into LLM-friendly structured context.

### The problem
Every RAG system is only as good as the context it gets. Real-world inputs are messy: scanned PDFs, Excel files with merged cells, audio files, mixed-language text. Naive ingestion produces noisy context, which produces bad answers.

### What I built
A pipeline that routes each input by type, applies the right normalization (OCR for scans, speech-to-text for audio, table parsers for spreadsheets, image-to-text for screenshots), and produces a clean, structured, LLM-friendly representation with metadata. Output is consistent regardless of source format, which means downstream retrieval and generation don't have to special-case anything.

## Internal intelligence platform (OpenWebUI)
> A company-wide assistant — employees query internal docs, policies, and data through a RAG-backed chat.

### What it does
Anyone at FarmwiseAI can open the internal OpenWebUI instance and ask questions about company documents, policies, onboarding material, or internal data. Answers come from a RAG pipeline sitting behind the UI, pulling from curated internal sources.

### Why OpenWebUI
Self-hosted, open-source, easy to customize. No vendor lock-in, no per-seat cost, full control over the retrieval backend. It also means we can swap models (local, Groq, whatever) without changing the UI.

## Fine-tuned geospatial small models on AWS
> Specialized small models deployed on AWS for location / terrain / coordinate queries that frontier LLMs get wrong.

### Why fine-tune
Frontier LLMs hallucinate on geospatial questions constantly — they'll confidently give you wrong coordinates, mis-identify terrain types, or invent relationships between regions. For our agricultural use case, that's unacceptable. A small model fine-tuned on curated geospatial data, deployed on AWS, answers correctly where GPT-4-class models fail.

### How it's deployed
Small model (quantized where possible), hosted on SageMaker, fronted by a lightweight API. Calls are cheap and fast enough to be invoked as a tool from the main agent when a question looks geospatial.

## OCR at scale (LightOnOCR-2 on vLLM)
> Production OCR for document extraction.

### What I shipped
I deployed the LightOnOCR-2 1B model from HuggingFace on AWS SageMaker and served it through vLLM with PagedAttention and KV caching. This made OCR throughput high enough for real document pipelines — we use it as the scan-extraction step of the ingestion system above.

## Satellite imagery time-series
> A year of Tamil Nadu field imagery, pixel-level vegetation curves, DTW to infer sowing dates.

### What I built
Processed one year of satellite imagery data from Tamil Nadu agricultural fields. For each field, I extracted per-pixel vegetation signals across time and applied Dynamic Time Warping to align growth curves across fields planted at different dates. The aligned curves let us infer sowing dates for fields without explicit metadata — useful for yield prediction and insurance.
