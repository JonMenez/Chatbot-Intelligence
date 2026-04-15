# AI Development Guidelines & Architecture Core

This document outlines the strict architectural decisions, constraints, and patterns that MUST be followed by any AI agent or developer contributing to this repository.

## 1. Tech Stack & Primary Tools
- **Core Stack**: MERN (MongoDB, Express, React, Node.js).
- **Frontend Engine**: React 19 + Vite + TailwindCSS.
- **AI / LLM Orchestration**: `@langchain` ecosystem exclusively.
- **Inference Engine**: LLaMA-3 (hosted on Groq) via `@langchain/groq`.
- **Embeddings Layer**: Run completely locally via HuggingFace's `all-MiniLM-L6-v2` (`@huggingface/transformers` backed by ONNX Runtime).
- **Vector Database**: ChromaDB (Running as a standalone persistent Docker container).

## 2. Infrastructure & Execution Boundaries
- **Containerization First**: The entire platform operates in a sealed environment orchestrated by Docker Compose (`docker-compose up --build`).
- **No Bare-Metal Executions**: Never suggest booting services natively on the host machine using bare `node` or `npm run dev` in production contexts without the corresponding Docker containers (especially ChromaDB).
- **Volume Behaviors**: Local directories (`./chroma_data` and `./backend/documents`) are volume-mapped for hot-reloading and data persistence. Be hyper-aware of **Anonymous Volumes** masking updated `node_modules`. If deep dependencies crash, the universal fix is `docker-compose down -v`.

## 3. Strict Operating Rules
- **Node.js Environment**: The project is securely pinned to **Node >=20.x**. Do not upgrade to unstable major versions (like Node 24) as it disrupts strict peer dependencies in LangChain architectures.
- **Dependency Management**: Deep dependency additions to `/frontend` or `/backend` MUST use the `--legacy-peer-deps` flag to circumvent strict tree conflicts between nested `@langchain/community` packages and tools like `pdf-parse` or ONNX.
- **Docker OS Restrictions**: The backend container MUST utilize `FROM node:20-slim` (or any `glibc` Debian-based variant). **NEVER use `node:20-alpine`** for the backend—Alpine uses `musl` which lacks the standard `ld-linux` headers, instantly crashing the local ONNX C++ runtime needed to generate vector embeddings.

## 4. RAG Implementation Standards
- **Prompt Engineering**: The application implements strict anti-hallucination chains. Never remove the fallback prompt constraint: *"I don't have enough information in the knowledge base to answer this accurately."*
- **Memory Optimization**: Chunk size is strictly mapped via `RecursiveCharacterTextSplitter` (Size: 600, Overlap: 150). Do not alter this balance without explicit benchmarking.
- **Retrieval Engine**: Use `.similaritySearchWithScore()` (not the primitive baseline function) to allow distances scaling and relevance thresholds in ChromaDB.

## 5. Language & Interaction Standards
- **Codebase Language**: All source code, variable names, function names, pull requests, and internal project comments MUST be written exclusively in English.
- **Communication Language**: When the AI agent converses with the developer in the chat interface, it MUST always reply and explain concepts exclusively in Spanish. All other technical artifacts or code snippets remain in English.
