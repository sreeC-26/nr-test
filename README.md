# RAG with Astra DB, Genkit, PDF ingestion, NASA enrichment, and REST API

This is an example of using [DataStax Astra DB](https://www.datastax.com/products/datastax-astra) with [Firebase Genkit](https://firebase.google.com/docs/genkit). It uses the [genkitx-astra-db](https://www.npmjs.com/package/genkitx-astra-db) plugin to make it easy to access Astra DB through Genkit.

## Prerequisites

- Node.js 18+
- Free database: DataStax Astra DB Serverless (free tier, no credit card)
  - Create a DB and collection, then set env vars below.
- (Optional) NASA API key for enrichment

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

### RAG query (optional NASA enrichment)

```
POST /api/rag
Content-Type: application/json
{ "query": "What is...", "nasa": true, "date": "2024-01-01" }
```

## Flutter integration

- Use standard HTTP client in Flutter to call the above endpoints.
- For uploads, use `multipart/form-data` with `file` field.

## Notes

- This project continues to work with Genkit UI flows:
  - `indexPage` to index a URL
  - `rag` to query with optional extra context
  - PDF indexing is exposed via REST.

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
