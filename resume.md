# Pranav P

+91-7025052042 · aikkara.pranav@gmail.com · Palakkad, Kerala
**Portfolio:** aikkaraportfolio.vercel.app   ·   **LinkedIn:** linkedin.com/in/pranavaikkara

---

## Professional Summary

Data Scientist and GenAI Engineer building production LLM systems end-to-end — agentic RAG pipelines, reliable voice agents, ingestion infrastructure, and fine-tuned domain models deployed on AWS. I pick the right retrieval approach for the job (vectorless tree-walk when documents have real structure and accuracy matters more than speed; semantic similarity when it doesn't) and ship small fine-tuned models that outperform frontier LLMs on narrow tasks. Strong classical ML background — time-series, satellite imagery, and explainable models for high-stakes decisions — which informs how I evaluate AI systems beyond surface benchmarks.

---

## Work Experience

### FarmwiseAI Pvt. Ltd. — Perungudi, Chennai
**Associate Data Scientist** · April 2025 – Present

- **Vectorless-RAG agentic system:** Built a PageIndex-style retrieval pipeline for internal documents — an LLM walks a tree-of-contents and answers from selected nodes, without embeddings or a vector database. Migrated off the original Qdrant + bge-large pipeline after cosine similarity kept returning text that *looked like* the question rather than text that *answered* it; the tree-walk approach delivered noticeably better answers on long structured documents (policies, runbooks, product specs).

- **Production voice agents:** Built reliable STT ↔ LLM ↔ TTS loops with per-hop latency budgets, interrupt handling, and a state machine that handles mid-response interruptions cleanly. Solved two production issues with a companion-agent pattern: an *auto-compact agent* that summarizes context every 200k–300k tokens (preventing drift from conversation bloat), and a *parallel tool-calling agent* that runs tools while the voice agent is still speaking (so the user never hears a pause on lookups).

- **Universal ingestion pipeline:** Built a pipeline that normalizes PDFs, scans, audio, spreadsheets, and images into clean, LLM-friendly structured context. Each input type is routed to the right normalizer (OCR for scans, STT for audio, table parsers for spreadsheets) so downstream retrieval doesn't need to special-case format. OCR runs LightOnOCR-2 1B on AWS SageMaker, served through vLLM with PagedAttention and KV caching for high throughput.

- **Internal intelligence platform:** Stood up a company-wide assistant on OpenWebUI, RAG-backed against curated internal sources (policies, docs, onboarding material). Self-hosted, with a swappable model backend (Groq, local, etc.) that doesn't require changing the UI.

- **Fine-tuned geospatial small models on AWS:** Deployed specialized small models on SageMaker for location, terrain, and coordinate queries where frontier LLMs hallucinate. Called as a tool from the main agent when the query is geospatial — much better accuracy and lower cost than routing every geo query through a GPT-4-class model.

- **Agentic chatbot with Google ADK + MCP:** Built a chatbot using Google ADK, integrating MCP tools (database queries, Google Search, Qdrant-backed RAG). Sub-agent routing to smaller models for lightweight tasks, Pydantic validation on every LLM response, and WebSocket streaming for live execution updates.

- **Satellite imagery time-series:** Processed one year of Tamil Nadu agricultural field imagery — pixel-level vegetation signals extracted across time, then Dynamic Time Warping (DTW) to align growth curves across fields planted at different dates. Used to infer sowing dates for fields without explicit metadata.

- **Tamil LLM tokenization:** Trained a BPE tokenizer on a Tamil text corpus to extend an open-source LLM's Tamil understanding. Used a custom tokenizer because English-trained general tokenizers fragment Tamil text into far more tokens than necessary, reducing efficiency and effective context length.

- **Cross-cutting stack:** **LiteLLM** as the LLM gateway across every project (provider swaps without rewriting calling code). **Langfuse** for end-to-end observability — every LLM call, trace, latency, and cost logged so production debugging becomes a diff, not guesswork. **MCP** as the standard protocol for connecting tools between agents.

### Infosys — India, Remote
**Data Visualization and Analyst Engineer Intern** · February 2025 – April 2025

- Worked on data visualization and analytics to transform complex datasets into actionable insights for non-analyst stakeholders.
- Built interactive dashboards and visual reports using Power BI and Python.
- Performed data preprocessing, exploratory data analysis (EDA), and trend analysis to surface key patterns from real-world datasets.

### Descpro Pvt. Ltd. — Palakkad, Kerala
**Machine Learning Developer Intern (NBFC Loan Approval System)** · December 2023 – April 2024

- Developed an AI-powered system to automate loan approval and monitor customer repayment patterns for a non-banking financial company (NBFC).
- Built and deployed machine learning models to evaluate loan eligibility based on income, age, expenses, and other risk parameters.
- Designed an individual customer monitoring model using LSTM to predict repayment delays at the per-customer level.
- Built a loan inquiry forecasting model to predict upcoming application volumes, supporting operations capacity planning.

### Thapovan Info Systems Pvt. Ltd. — T. Nagar, Chennai
**Machine Learning Intern (Predictive Disease Modeling)** · September 2023 – November 2023

- Built a heart attack risk model from raw clinical data — translating a clear medical need into a defensible predictive system.
- Curated and engineered 20+ key health indicators into a model-ready dataset, improving data quality before training.
- Applied SHAP and LIME (explainable AI) so doctors could see *why* the model flagged any individual case, not just the score — important in a setting where the prediction has to be defensible to a clinician.
- Built an LSTM-based alert system to flag time-series patterns suggesting rising risk, giving doctors earlier warning windows.

---

## Technical Skills

- **GenAI & LLM Systems:** RAG (vectorless + traditional), Agentic Systems, LangChain, LangGraph, Google ADK, Model Context Protocol (MCP), Tool Calling, Pydantic AI / Instructor, PageIndex, Qdrant, FAISS, HuggingFace, vLLM, LiteLLM, OpenRouter, Ollama, Langfuse (observability), Unsloth, QLoRA
- **Machine Learning & Data Science:** Random Forest, LSTM, Time-Series Analysis, Dynamic Time Warping (DTW), Explainable AI (SHAP, LIME), Data Interpolation, Data Leakage Prevention, Feature Engineering
- **Backend & AI Infrastructure:** Python, FastAPI, Pydantic, WebSockets, Streamlit, AWS SageMaker, llama.cpp, Vercel, Git
- **Data & Analytics:** SQL, Power BI, Pandas, NumPy, PySpark, Satellite Imagery Processing

---

## Projects

**Domain-Specific Loan Officer Agent** · Unsloth, QLoRA, Gemma-2B, llama.cpp
- **Fine-tuning:** Fine-tuned Gemma-2B on a synthetic instruction dataset using QLoRA and Unsloth for memory efficiency, training a compliance-aware tone for the domain.
- **Edge deployment:** Quantized to GGUF and deployed via llama.cpp for low-latency CPU inference — proof that a well-fine-tuned small model is a real production path for narrow domains, no GPU required.

**Companion AI — Voice-Enabled ICU Support System** · PyTorch, Transformers, STT/TTS
- **Pipeline:** Integrated real-time Speech-to-Text with BERT-based sentiment analysis to detect emotional distress in ICU patients, triggering context-aware empathetic responses via TTS. Built for patients who are alone, disoriented, and unable to use a phone or tablet — voice is the right modality for them.

**Agentic Recruitment Platform** · Google Opal, Selenium, LangChain
- **Automation:** Built an autonomous agent that scrapes job boards and uses Google's experimental Opal model to rewrite resumes in real-time, mapping candidate skills to job descriptions via a RAG pipeline. Most of the engineering went into error recovery — stale selectors, captcha walls, rate limits — not the LLM call itself.

**Portfolio Site with Vectorless-RAG Chatbot** · Vercel, Groq, PageIndex, Node.js
- **The chatbot is the demo:** The portfolio site (linked at the top of this résumé) is itself a vectorless-RAG application. An LLM walks a tree-of-contents of a hand-authored markdown knowledge base about my work and answers from selected nodes — the reasoning panel under each answer shows which nodes were chosen, so the retrieval approach is a live demo rather than just a claim on the page.
- **Zero-cost infrastructure:** Single Node serverless function on Vercel, Groq Llama-3.3 for inference, no vector store, no database. Runs entirely on free tiers — zero dollars per month.

---

## Education

**Vellore Institute of Technology** — Chennai, India · 2021 – 2025
B.Tech in Computer Science with Specialization in AI and ML · CGPA: 7.98

**Palghat Lions School** — Palakkad, Kerala · 2020 – 2021
XII · 86.8%

---

## Certifications

- NPTEL Entrepreneurship
- TATA Data Visualization: Empowering Business with Effective Insights
- Internship at Thapovan PVT LTD
- Power BI Certificate
- OCI Gen AI Professional Course
- Infosys Springboard Internship — TechA Data Analytics using Power BI Foundation
- Cisco Packet Tracer
