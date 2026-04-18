# FarmwiseAI — current role
> Associate Data Scientist, April 2025 – now. Where I ship production GenAI end-to-end.

## Vectorless RAG agentic system
> PageIndex-style retrieval — no vector DB, no semantic similarity. LLM reasons over a tree-of-contents.

### What it is
I built a retrieval pipeline that walks a hierarchical tree index of our internal documents using LLM reasoning, rather than cosine similarity over embeddings. The core insight from the PageIndex paper is that similarity ≠ relevance: vector search finds text that *looks like* the query, not text that *answers* it. By letting an LLM reason over a tree-of-contents, we get retrieval that's traceable, interpretable, and more accurate on long structured docs.

### Why it beats semantic search here
Our internal docs have real hierarchy — policies, product specs, runbooks. A chunked-and-embedded approach flattens that structure and relies on surface similarity. A tree walk preserves the doc's logical organization and lets the model explicitly reason "this question is about X, which lives under Y > Z" before fetching content. For long docs with sections that talk about the same topic in different contexts, this is a big quality win.

### How it's wired up
Build time: docs get parsed into a tree (headings become nodes; content lives at leaves). Query time: an LLM reads the ToC (titles + summaries), picks node IDs, and a second LLM call answers from just those nodes. Two calls, stateless, no vector DB to maintain.

## Production voice agents
> Reliable STT ↔ LLM ↔ TTS loops with guardrails and latency budgets.

### What I built
Voice agents that actually hold up in production — meaning they don't break when a user interrupts, when STT returns garbage, when the LLM starts rambling, or when network latency spikes. The hard parts aren't the individual models; it's the orchestration: interrupt handling, partial-transcript routing, silence detection, and fallbacks when any component times out.

### What makes them reliable
Strict latency budgets on every hop, hard cutoffs on LLM generation length, guardrails against prompt injection over voice, and a state machine that handles the "user started talking mid-response" case cleanly. I also version the system prompt aggressively — voice is less forgiving than chat because users can't see or edit their input before it gets sent.

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
