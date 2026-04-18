# How I think
> Opinions, preferences, and the way I work.

## Engineering philosophy
> What I believe about shipping software.

### On complexity
Most production AI systems fail because they're too clever. A stack of three simple components with clear interfaces is almost always easier to reason about, debug, and extend than a single "smart" system that tries to do too much. When in doubt, split.

### On vector DBs
I'm not anti-vector — they're the right answer for a lot of retrieval problems. But they've become the default when they shouldn't be. Vector similarity is a blunt instrument. If your docs have real structure, vectorless RAG over a tree often wins on accuracy, interpretability, and operational simplicity.

### On fine-tuning
Fine-tune small models when a frontier model is wrong in a specific, narrow way. Don't fine-tune as a first response — prompt engineering and better context are usually cheaper. But when the failure mode is consistent and domain-specific (like geospatial), a fine-tuned small model is often the right answer.

## How I work
> Day-to-day habits.

### On prototyping
Ship the ugly version first. Streamlit or a quick CLI, not a polished UI. The faster you get something end-to-end, the faster you find out what's actually hard — and what was a worry that didn't matter.

### On debugging
Read the error. Read the actual error, not the first line. Most LLM-adjacent bugs are upstream of the LLM — bad context, wrong format, a quiet exception in an ingestion step. The model is almost never the problem.

## What I'd like to work on next
> The unfair version of "where do you see yourself in 5 years."

### Direction
Production-grade agentic systems — not demos, not prototypes. The kind that run unattended for weeks, recover from failure, and make real decisions on real data. Voice is part of this. Reliable tool use is part of this. Interpretability is part of this.
