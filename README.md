# 📚 SmartBookLM — Intelligent Multimodal Knowledge Base & AI Research Studio

> **Transform PDFs, websites, YouTube videos, and notes into an interactive, grounded AI knowledge workspace in seconds.**  
> Asynchronous multimodal document ingestion, semantic chunking, Pinecone vector search, Mem0 cross-session memory, live web search, and AI-powered learning artifact generation (Mindmaps, Flashcards, Quizzes, Summaries, Reports).

---

## ✨ Features

- **⚡ Event-Driven Multimodal Ingestion**: Ingest PDFs, YouTube videos, live websites, raw text, and Markdown files asynchronously using **Inngest** background queues with auto-retries, cancellation support, and self-healing execution.
- **🔍 Precision Semantic Vector Search**: High-dimensional vector search powered by **Pinecone** with namespace isolation per workspace, source-level tracking, and top-$K$ similarity matching.
- **🎯 Zero-Hallucination Grounding & Citations**: Strict prompt engineering constrains LLM generation to indexed sources, displaying verified citations with source titles, page numbers, excerpts, and similarity scores.
- **🧠 Adaptive Long-Term Memory**: Integrates **Mem0 AI** to autonomously extract, persist, and retrieve user preferences, context, and project goals across sessions for tailored RAG responses.
- **🌐 Agentic Real-Time Web Search**: Built-in **Tavily Core** tool calling allowing the model to autonomously search and incorporate live web data when workspace sources need external augmentation.
- **🎨 Interactive AI Learning Studio**: Transform knowledge into rich study and research artifacts:
  - 🗺️ **Visual Mindmaps**: Node-and-edge graph visualizations powered by **@xyflow/react** (React Flow).
  - 🃏 **Interactive Flashcards**: Smooth flip-card study modules for active recall.
  - 📝 **Self-Grading Quizzes**: Multi-question assessments with instant scoring and detailed explanations.
  - 📋 **Executive Summaries & Takeaways**: Bulleted key concepts and structured overviews.
  - 📑 **Comprehensive Reports**: Structured deep-dive research reports with multi-section breakdowns.
- **📄 Full-Fidelity Document Pipeline**: Automated PDF text extraction with **unpdf** coupled with **Cloudinary** for scalable cloud file hosting.
- **🎬 Web & Video Scraping**: Instant YouTube transcript extraction and clean markdown web scraping via **Firecrawl**.
- **🔒 Frictionless Google Authentication**: Powered by **Better-Auth** with Google OAuth 2.0, partitioned cross-domain cookies, and session management.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | [Next.js 16](https://nextjs.org/) (App Router), [React 19](https://react.dev/) |
| **Backend Framework** | [Express 5](https://expressjs.com/), [Node.js](https://nodejs.org/) (ES Modules, `tsx`) |
| **Languages** | [TypeScript](https://www.typescriptlang.org/), [JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript) |
| **AI & RAG Framework** | [Vercel AI SDK](https://sdk.vercel.ai/) (`ai`, `@ai-sdk/react`), OpenAI / OpenRouter (`gpt-4o-mini`, `text-embedding-3-small`) |
| **Vector Database** | [Pinecone](https://www.pinecone.io/) (Namespace-per-workspace isolation) |
| **Memory Layer** | [Mem0 AI](https://mem0.ai/) (Cross-session user preference & concept memory) |
| **Web Scraping & Search** | [Firecrawl](https://www.firecrawl.dev/), [Tavily Search API](https://tavily.com/), `youtube-transcript`, `unpdf` |
| **Primary Database & ORM** | [PostgreSQL](https://www.postgresql.org/), [Prisma ORM](https://www.prisma.io/) (`@prisma/adapter-pg`) |
| **File & Asset Storage** | [Cloudinary](https://cloudinary.com/) (PDF and media uploads) |
| **Job Queue & Orchestration** | [Inngest](https://www.inngest.com/) (Durable background workflows & event queues) |
| **Authentication** | [Better-Auth](https://better-auth.com/) (Google OAuth 2.0 & Session Management) |
| **Visualizations & Canvas** | [@xyflow/react](https://reactflow.dev/) (React Flow Mindmaps), Recharts |
| **Styling & UI** | [Tailwind CSS v4](https://tailwindcss.com/), `@base-ui/react`, Radix UI, Lucide Icons, Tabler Icons, `react-resizable-panels` |
| **Markdown Rendering** | React Markdown, Remark GFM |
| **Client State** | [TanStack React Query](https://tanstack.com/query) |

---

## 🏗️ Architecture Flow

```mermaid
flowchart TD
    subgraph Ingestion["1. Multimodal Ingestion"]
        PDF[PDF Uploads] -->|Cloudinary + unpdf| Extract[Text Extraction]
        YT[YouTube Videos] -->|youtube-transcript| Extract
        WEB[Websites] -->|Firecrawl| Extract
        TXT[Raw Notes / MD] --> Extract
    end

    subgraph Processing["2. Asynchronous Queue & Indexing"]
        Extract --> INGEST[Inngest Background Job]
        INGEST --> CHUNK[Semantic Text Chunking]
        CHUNK --> EMBED[OpenAI / OpenRouter Embeddings]
        EMBED --> VEC[(Pinecone Vector DB)]
        INGEST --> DB[(PostgreSQL Database)]
    end

    subgraph RAG["3. Hybrid RAG & Chat Pipeline"]
        USER[User Prompt] --> API[POST /api/workspaces/:id/chat]
        API --> SIM[Pinecone Top-K Search]
        API --> MEM[Mem0 Memory Recall]
        VEC -->|Context Chunks| SIM
        SIM --> CTX[Aggregated Context & Citations]
        MEM --> CTX
        CTX --> AI_SDK[Vercel AI SDK / LLM]
        AI_SDK -.->|Tool Call| TAVILY[Tavily Web Search]
        TAVILY -.-> AI_SDK
        AI_SDK --> STREAM[Streamed Answer + Exact Citations]
    end

    subgraph Studio["4. AI Learning Studio"]
        STUDIO_REQ[Artifact Generation Request] --> INGEST_ART[Inngest Artifact Queue]
        INGEST_ART --> GEN[LLM Structured Generation]
        GEN --> MM[Mindmaps / React Flow]
        GEN --> FC[Interactive Flashcards]
        GEN --> QZ[Self-Grading Quizzes]
        GEN --> REP[Executive Summaries & Reports]
    end

    STREAM --> UI[Next.js Interactive UI]
    MM --> UI
    FC --> UI
    QZ --> UI
    REP --> UI
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v20+ recommended
- **PostgreSQL Database** (e.g., Neon, Supabase, or local PostgreSQL instance)
- **Pinecone Account**: An active Pinecone index (dimension `1536` for `text-embedding-3-small` or standard OpenAI embeddings)
- **OpenRouter or OpenAI API Key**: For chat inference and vector embeddings
- **Inngest Account / CLI**: For background job orchestration
- **Cloudinary Account**: For PDF and asset storage
- **Google Cloud Console Project**: For Google OAuth client credentials (Better-Auth)
- *(Optional)* **Firecrawl API Key**: For crawling and scraping live websites
- *(Optional)* **Tavily API Key**: For agentic real-time web search
- *(Optional)* **Mem0 API Key**: For persistent cross-session user memory

---

### 2. Clone and Install

```bash
# Clone the repository
git clone https://github.com/your-username/smartbookLM.git
cd smartbookLM

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

---

### 3. Environment Variables

#### Backend (`server/.env`)
Create a `.env` file inside the `server/` directory:

```env
PORT=8081
CLIENT_URL=http://localhost:3000

# PostgreSQL Database
DATABASE_URL=postgresql://user:password@localhost:5432/smartbooklm
DIRECT_URL=postgresql://user:password@localhost:5432/smartbooklm

# Better-Auth & Google OAuth
BETTER_AUTH_SECRET=your_better_auth_secret_here
BETTER_AUTH_URL=http://localhost:8081
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret

# AI & Embeddings
OPENROUTER_API_KEY=your_openrouter_or_openai_api_key
OPENROUTER_MODEL=openai/gpt-4o-mini
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX=smartbooklm

# File & Document Storage
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Inngest Background Worker
INNGEST_DEV=1

# External Services (Web Search, Scraper, Memory)
FIRECRAWL_API_KEY=your_firecrawl_api_key
TAVILY_API_KEY=your_tavily_api_key
MEM0_API_KEY=your_mem0_api_key
```

#### Frontend (`client/.env.local`)
Create a `.env.local` file inside the `client/` directory:

```env
NEXT_PUBLIC_SERVER_URL=http://localhost:8081
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:8081
```

---

### 4. Database Setup

Run Prisma migrations and generate the Prisma Client for the backend:

```bash
cd server
npx prisma generate
npx prisma db push
```

---

### 5. Start the Development Servers

Run the following services in separate terminal windows:

#### Step 1: Start Backend API Server
```bash
cd server
npm run dev
```
*Backend server runs on [http://localhost:8081](http://localhost:8081)*

#### Step 2: Start Inngest Dev Server (Background Jobs)
```bash
npx inngest-cli@latest dev -u http://localhost:8081/api/inngest
```
*Inngest dashboard opens at [http://localhost:8288](http://localhost:8288)*

#### Step 3: Start Frontend
```bash
cd client
npm run dev
```
*Frontend web application runs on [http://localhost:3000](http://localhost:3000)*

---

## ⚡ How It Works

| Step | Action | Description |
| :---: | :--- | :--- |
| **1** | **Multi-Source Ingestion** | Upload PDFs (via Cloudinary & `unpdf`), provide YouTube links (via `youtube-transcript`), enter URLs (via `Firecrawl`), or paste markdown/text notes. |
| **2** | **Asynchronous Orchestration** | Inngest enqueues `source/created` events. Content is stripped of boilerplate and divided into semantic chunks with overlapping boundaries. |
| **3** | **Embedding & Vector Upsert** | Chunks are converted into 1536-dimensional embeddings and upserted into workspace-specific namespaces in Pinecone along with page metadata and text excerpts. |
| **4** | **Hybrid Grounded RAG Chat** | Asking questions queries Pinecone for top-$K$ semantic matches and Mem0 for long-term user context. Vercel AI SDK streams answers with exact source citations and can trigger Tavily web search. |
| **5** | **Artifact Studio Generation** | Select one or more sources to generate visual Mindmaps (`@xyflow/react`), flip Flashcards, self-grading Quizzes, Summaries, or multi-chapter Reports. |

---

## 📦 Available Scripts

### Backend (`/server`)
- `npm run dev` — Starts the Express API server with live reload via `tsx watch`.
- `npm run build` — Generates the Prisma client and compiles TypeScript (`prisma generate && tsc`).
- `npm start` — Runs the compiled production Node.js server from `dist/index.js`.

### Frontend (`/client`)
- `npm run dev` — Starts the Next.js development server.
- `npm run build` — Compiles an optimized production build.
- `npm run start` — Runs the production Next.js server.
- `npm run lint` — Runs ESLint checks across Next.js and React components.

---

## 🌐 Deployment

### Frontend (Vercel)
1. Push your repository to GitHub.
2. Import the `client/` directory as the Root Directory in [Vercel](https://vercel.com).
3. Set the environment variables `NEXT_PUBLIC_SERVER_URL` and `NEXT_PUBLIC_BETTER_AUTH_URL` to your production backend URL.
4. Deploy!

### Backend (Render / Railway / VPS)
1. Deploy the `server/` directory on [Render](https://render.com/) or [Railway](https://railway.app/).
2. Set Build Command: `npm install && npm run build`.
3. Set Start Command: `npm start`.
4. Configure all environment variables from `server/.env`.
5. Connect your production Inngest webhook to `https://your-backend-domain.com/api/inngest`.
