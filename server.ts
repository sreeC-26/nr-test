import express from "express";
import cors from "cors";
import { ai, ragFlow } from "./index";
import { z } from "genkit";
import { request } from "undici";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));


// Root helper
app.get("/", (_req, res) => res.send("RAG server running. Try GET /api/health"));

// Health
app.get("/api/health", (_req, res) => res.json({ ok: true }));


// NASA helper: simple APOD fetch
type NasaApod = {
  title: string;
  date: string;
  explanation: string;
  url?: string;
  hdurl?: string;
};

async function fetchNasaApod(apiKey: string, date?: string): Promise<NasaApod> {
  const url = new URL("https://api.nasa.gov/planetary/apod");
  url.searchParams.set("api_key", apiKey);
  if (date) url.searchParams.set("date", date);
  const res = await request(url.toString());
  if (res.statusCode >= 400) throw new Error(`NASA API error ${res.statusCode}`);
  const json = (await res.body.json()) as NasaApod;
  return json;
}

function resolveApodDateAlias(input?: string): string | undefined {
  if (!input) return undefined; // today by default (NASA APOD default)
  return input; // assume YYYY-MM-DD
}

function parseNaturalDate(text?: string): string | undefined {
  if (!text) return undefined;
  const lower = text.toLowerCase();
  
  const months = [
    "january","february","march","april","may","june","july","august","september","october","november","december"
  ];
  
  // Pattern 1: 12th September 2025, 12 September 2025, 12th september 2025
  const m1 = lower.match(/(\d{1,2})(st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)[,\s]+(\d{4})/);
  if (m1) {
    const day = parseInt(m1[1], 10);
    const monthIndex = months.indexOf(m1[3]);
    const year = parseInt(m1[4], 10);
    if (monthIndex >= 0) {
      const d = new Date(Date.UTC(year, monthIndex, day));
      return d.toISOString().slice(0, 10);
    }
  }
  
  // Pattern 2: September 12th 2025, September 12 2025, september 12th 2025
  const m2 = lower.match(/(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(st|nd|rd|th)?[,\s]+(\d{4})/);
  if (m2) {
    const monthIndex = months.indexOf(m2[1]);
    const day = parseInt(m2[2], 10);
    const year = parseInt(m2[4], 10);
    if (monthIndex >= 0) {
      const d = new Date(Date.UTC(year, monthIndex, day));
      return d.toISOString().slice(0, 10);
    }
  }
  
  return undefined;
}

function looksLikeApodQuestion(query: string): boolean {
  const q = query.toLowerCase();
  return (
    q.includes("apod") ||
    q.includes("astronomy picture of the day") ||
    /what (did|does|would) .* (look like|looked like)/.test(q) ||
    q.includes("nasa image of the day") ||
    q.includes("space picture")
  );
}

// NASA APOD endpoint
app.get("/api/nasa/apod", async (req, res) => {
  try {
    const dateParam = typeof req.query.date === "string" ? req.query.date : undefined;
    const resolved = resolveApodDateAlias(dateParam);
    const apiKey = process.env.NASA_API_KEY;
    if (!apiKey) return res.status(400).json({ ok: false, error: "NASA_API_KEY missing" });
    const apod = await fetchNasaApod(apiKey, resolved);
    res.json({ ok: true, apod });
  } catch (err: any) {
    res.status(400).json({ ok: false, error: err?.message || "Failed to fetch APOD" });
  }
});

// RAG query with automatic NASA enrichment
app.post("/api/rag", async (req, res) => {
  try {
    const schema = z.object({ query: z.string(), date: z.string().optional(), extraContext: z.string().optional() });
    const { query, date, extraContext } = schema.parse(req.body);

    let nasaContext = "";
    let apod: NasaApod | undefined;
    const shouldUseApod = looksLikeApodQuestion(query);
    if (shouldUseApod) {
      const apiKey = process.env.NASA_API_KEY;
      if (!apiKey) return res.status(400).json({ ok: false, error: "NASA_API_KEY missing" });
      const resolvedDate = resolveApodDateAlias(date) ?? parseNaturalDate(query);
      apod = await fetchNasaApod(apiKey, resolvedDate);
      const imageUrl = apod.hdurl || apod.url || "";
      // Create a brief summary of APOD content (max 2 sentences)
      const briefSummary = apod.explanation.split('. ').slice(0, 2).join('. ') + '.';
      nasaContext = `NASA APOD: ${apod.title} (${apod.date})\n${imageUrl ? `Image: ${imageUrl}` : 'Image: Not available yet'}\nBrief: ${briefSummary}`;
    }

    const mergedContext = [extraContext, nasaContext].filter(Boolean).join("\n\n");
    const answer = await ragFlow.run({ query, extraContext: mergedContext || undefined });
    // Return only essential APOD info for display, not the full content
    const displayApod = apod ? {
      title: apod.title,
      date: apod.date,
      url: apod.url,
      hdurl: apod.hdurl
    } : undefined;
        
    res.json({ ok: true, answer, apod: displayApod });
  } catch (err: any) {
    res.status(400).json({ ok: false, error: err?.message || "Invalid request" });
  }
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});


