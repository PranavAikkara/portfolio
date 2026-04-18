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
