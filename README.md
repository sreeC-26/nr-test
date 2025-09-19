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
