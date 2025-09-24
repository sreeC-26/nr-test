# RAG with Astra DB, Genkit, PDF ingestion, NASA enrichment, and REST API

This is an example of using [DataStax Astra DB](https://www.datastax.com/products/datastax-astra) with [Firebase Genkit](https://firebase.google.com/docs/genkit). It uses the [genkitx-astra-db](https://www.npmjs.com/package/genkitx-astra-db) plugin to make it easy to access Astra DB through Genkit.

## Prerequisites

- Node.js 18+
- Free database: DataStax Astra DB Serverless (free tier, no credit card)
  - Create a DB and collection, then set env vars below.
- (Optional) NASA API key for enrichment

## One-time installation (cloned repo)

Clone this repo, then install all dependencies (runtime + type packages already listed in `package.json`):

```
git clone <your-fork-or-repo-url>
cd genkit-astra-db-rag
npm install
```

What this installs:
- `genkit`, `@genkit-ai/googleai` (Gemini models + embeddings)
- `genkitx-astra-db` (Astra DB indexer/retriever)
- `express`, `cors`, `multer` (server + uploads)
- `pdf-parse` (PDF text extraction)
- `jsdom`, `@mozilla/readability` (URL content extraction)
- `undici` (HTTP client)
- `tsx` (run TypeScript directly)
- Dev types: `@types/node`, `@types/express`, `@types/multer`, `@types/jsdom`, and local `types.d.ts`

## Environment variables

Create a `.env` file with:

```
ASTRA_DB_APPLICATION_TOKEN=token
ASTRA_DB_API_ENDPOINT=https://xxxxx-xxxxxx.apps.astra.datastax.com
ASTRA_DB_COLLECTION_NAME=your_collection
GOOGLE_GENAI_API_KEY=your_gemini_key
NASA_API_KEY=your_nasa_key # optional
PORT=4000
```

## Running the application

First clone the app from GitHub:

```sh
git clone https://github.com/philnash/genkit-astra-db-rag.git
cd genkit-astra-db-rag
```

Install the dependencies:

```sh
npm install
```

Start the REST server and Genkit UI:

```sh
npm start
```

- REST API runs at `http://localhost:4000`
- Genkit UI proxies your app, open `http://localhost:4000`

If you see IDE type squigglies, restart the TypeScript server in VS Code (Command Palette → “TypeScript: Restart TS server”).

## REST API

### Health

```
GET /api/health
```

### Index a URL

```
POST /api/index/url
Content-Type: application/json
{ "url": "https://example.com/article" }
```

### Index a PDF

```
POST /api/index/pdf (multipart/form-data)
file: <pdf>
```

Batch index PDFs from a local folder:

```
npm run index:pdfs -- ./path/to/folder
```

### RAG query (NASA auto-enrichment for APOD-like queries)

```
POST /api/rag
Content-Type: application/json
{ "query": "What is..." }
```

## Flutter integration

- Use standard HTTP client in Flutter to call the above endpoints.
- For uploads, use `multipart/form-data` with `file` field.

## File and function overview

- `index.ts`
  - Initializes Genkit with Google AI and Astra DB plugins.
  - Embeddings: `text-embedding-004`; Generation: `gemini-2.0-flash`.
  - Exports `ai`, `astraDBIndexer`, `astraDBRetriever`.
  - `indexWebPage(url)`: fetch + extract readable text, chunk, index.
  - `ragFlow({ query, extraContext? })`: retrieve from Astra DB, add optional context, generate answer.
  - `indexPlainText(text, metadata)`: chunk + index helper.

- `server.ts`
  - Express API: health, URL/PDF indexing, NASA APOD fetch, and RAG endpoint.
  - `/api/rag` auto-detects APOD-like queries, parses dates (today/tomorrow/natural formats), and enriches with APOD.

- `batchIndex.ts`
  - Batch index all PDFs in a folder: `npm run index:pdfs -- ./path`

- `tsconfig.json` and `types.d.ts`
  - TS configuration and ambient types to smooth local development.

## Deployment (Render)

1) Push this repo to your GitHub account (do not commit `.env`).

2) On Render → New → Web Service → connect the repo.

3) Settings
- Branch: `main`
- Instance Type: `Free`
- Build Command: `npm install`
- Start Command: `npm start` (IMPORTANT)
- Health Check Path: `/api/health`

4) Environment Variables (Render Dashboard → Environment)
- `ASTRA_DB_APPLICATION_TOKEN`
- `ASTRA_DB_API_ENDPOINT`
- `ASTRA_DB_COLLECTION_NAME`
- `GOOGLE_GENAI_API_KEY`
- `NASA_API_KEY`
- `PORT` (Render sets automatically; optional)

5) Deploy, then test:
```
curl -X GET  https://<your-app>.onrender.com/api/health
curl -X POST https://<your-app>.onrender.com/api/rag \
  -H "Content-Type: application/json" \
  -d '{"query":"When was NASA formed"}'
```

## Local testing (Windows Command Prompt)

Health:
```
curl.exe http://localhost:4000/api/health
```

RAG (answer from your indexed PDFs):
```
curl.exe -X POST http://localhost:4000/api/rag -H "Content-Type: application/json" -d "{\"query\":\"When was NASA formed\"}"
```

APOD-like (auto NASA enrichment, returns image URL in response.apod):
```
curl.exe -X POST http://localhost:4000/api/rag -H "Content-Type: application/json" -d "{\"query\":\"What would the galaxy look like on 12 September 2025?\"}"
```

Index a public URL:
```
curl.exe -X POST http://localhost:4000/api/index/url -H "Content-Type: application/json" -d "{\"url\":\"https://example.com/article\"}"
```

Index a local PDF (multipart/form-data):
```
curl.exe -X POST http://localhost:4000/api/index/pdf -F "file=@C:\\absolute\\path\\file.pdf"
```

Batch index all PDFs in a folder:
```
npm run index:pdfs -- ./path/to/folder
```

## Features
- Astra DB vector store via `genkitx-astra-db`
- Gemini text embeddings and generation
- URL extraction → chunk → index
- PDF ingestion via API and batch CLI
- NASA APOD enrichment built into `/api/rag` for APOD-like queries

## Batch index PDFs
```
npm run index:pdfs -- ./path/to/folder
```

## Security notes
- Do not expose indexing endpoints to untrusted users in production.
- Keep API keys in server-side env vars; never ship to clients.
- Consider adding auth (e.g., Firebase Auth ID tokens) and validate on `/api/rag`.
