# My stack
> What I actually reach for, and why.

## GenAI & LLM systems
> Where I spend most of my time.

### Models and serving
For inference: vLLM when I need throughput (PagedAttention + KV caching are huge), LiteLLM when I want a unified interface across providers, Groq when I want free fast inference for prototypes. For fine-tuning: Unsloth and QLoRA — memory-efficient, fast, and the output is compatible with llama.cpp for CPU deployment.

### Retrieval & agents
Qdrant or FAISS when I need traditional vector RAG. PageIndex-style vectorless RAG when the docs have real structure and accuracy matters more than speed. Google ADK and MCP (Model Context Protocol) for agentic workflows with tool calls — MCP especially is underrated for building tool-use systems that work across clients.

## Machine learning & data science
> The classical side.

### Models I reach for
LSTM for time-series with clear sequential structure. Random Forest when I need a strong baseline or when I need feature importances for free. DTW for time-series alignment across different scales. XAI via SHAP or LIME whenever I'm shipping to non-ML stakeholders.

### Things that matter more than the model
Data leakage prevention, proper train/test splits, interpolation strategies for missing data, feature engineering informed by domain experts. 80% of ML wins come from these, not from picking the fanciest model.

## Backend & infrastructure
> How I actually ship things.

### What I use
Python is my daily driver. FastAPI for APIs — Pydantic validation is non-negotiable when the API is fronting an LLM. WebSockets for real-time updates (agent execution logs, streaming responses). Streamlit for quick internal tools and demos. AWS SageMaker for hosted inference, Git for everything.

## Data & analytics
> When I need to understand a dataset before modeling it.

### Tools
SQL and PySpark for anything tabular at scale. Pandas and NumPy for smaller exploratory work. Power BI for stakeholder-facing dashboards. Satellite imagery processing for geospatial work.
