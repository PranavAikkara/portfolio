# Side projects
> Things I've built outside my job — each one taught me something specific.

## Domain-Specific Loan Officer Agent
> Fine-tuned Gemma-2B with QLoRA, quantized to GGUF, deployed on CPU via llama.cpp.

### What it is
A compliance-aware loan officer agent fine-tuned on a synthetic instruction dataset. I used QLoRA and Unsloth for memory-efficient training, then quantized the model to GGUF format and ran it through llama.cpp. The point was domain-specific tone and compliance-adherence without needing GPU inference.

### Why it matters
Most people think serious LLM work needs a GPU. For a lot of narrow domains, a well-fine-tuned small model on CPU is plenty — and dramatically cheaper. This project was my proof that QLoRA + quantization + llama.cpp is a real production path.

## Companion AI — voice-enabled ICU support
> Real-time STT + BERT sentiment to detect emotional distress, empathetic TTS response.

### What it is
A voice support system for ICU patients. Real-time speech-to-text feeds a BERT-based sentiment classifier; when it detects emotional distress, the system triggers context-aware empathetic responses via TTS. Built with PyTorch and HuggingFace transformers.

### Why I built it
Because ICU patients are often alone, disoriented, and not physically able to use a phone or tablet. Voice is the right modality for them, and sentiment-aware response is the minimum viable amount of empathy.

## Agentic Recruitment Platform
> Autonomous job-scraping agent with resume rewriting via Google Opal.

### What it is
An agent that scrapes job boards and, for each relevant posting, uses Google's experimental Opal model to rewrite the candidate's resume on the fly — mapping skills to the specific job description using a RAG pipeline. Built with Selenium and LangChain.

### What I learned
Agentic systems that act on real-world web pages are much harder than they look. Most of the engineering is error recovery: stale selectors, captcha walls, rate limits, partial loads. The LLM part is almost the easy bit.

## This portfolio site (the one you're on)
> Vectorless-RAG chatbot, Groq, Vercel — the site itself is also a side project of mine.

### What it is
The website you're reading right now is one of my projects. The chatbot you're talking to uses a PageIndex-style vectorless RAG setup over a hand-authored markdown knowledge base that describes my work. Instead of embedding text and doing cosine similarity, an LLM reads a tree-of-contents of the knowledge base, picks the relevant nodes, then answers using just those nodes. Two LLM calls per question, no vector store, no database.

### The stack
Vercel for hosting (static site + one Node serverless function at /api/chat), Groq Llama-3.3-70b for both the router call and the streaming answer call, plain HTML/CSS/vanilla JS on the frontend, markdown for the knowledge base. The whole thing runs on free tiers — I pay zero dollars a month for it.

### Why I built the chatbot this way
I wanted the chatbot to actually *demonstrate* the vectorless-RAG story from my resume, not just talk about it. The reasoning panel under each of my answers shows the exact tree nodes the model routed through — so the retrieval approach is a live demo, not a claim. It also proves the $0 infra story: you're watching a production chatbot that costs nothing to run.

## Newsletter Reader — a cleaner way to read what I subscribe to
> A personal web app that pulls newsletters out of my Gmail and displays them in one clean reading view.

### The problem
My personal Gmail was a mess. Important newsletters — the ones I actually wanted to read — were buried under receipts, work threads, notifications, and promotions. I was skipping issues I cared about just because I couldn't find them in the noise.

### What I built
A web app that connects to my Gmail account via the Gmail API, identifies messages from the newsletters I'm subscribed to, and renders them in a dedicated reader view. Single page, chronological, clean typography, nothing else on screen. My inbox stays chaotic; the newsletter reader stays quiet.

### Why it works
The problem wasn't "too many newsletters" — it was "newsletters mixed with everything else." Pulling them into their own view costs almost nothing (they still live in Gmail; I don't forward or copy anything) and it makes me much more likely to actually read them. Small project, disproportionately useful to me day-to-day.
