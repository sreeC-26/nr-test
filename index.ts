import { z, genkit, Document } from "genkit";
import { textEmbedding004, googleAI, gemini20Flash } from "@genkit-ai/googleai";
import {
  astraDBIndexerRef,
  astraDBRetrieverRef,
  astraDB,
} from "genkitx-astra-db";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import { chunk } from "llm-chunk";

const collectionName = process.env.ASTRA_DB_COLLECTION_NAME!;

const ai = genkit({
  plugins: [
    googleAI(),
    astraDB([
      {
        clientParams: {
          applicationToken: process.env.ASTRA_DB_APPLICATION_TOKEN!,
          apiEndpoint: process.env.ASTRA_DB_API_ENDPOINT!,
        },
        collectionName: collectionName,
        embedder: textEmbedding004,
      },
    ]),
  ],
});

export const astraDBIndexer = astraDBIndexerRef({ collectionName });
export const astraDBRetriever = astraDBRetrieverRef({ collectionName });

async function fetchTextFromWeb(url: string) {
  const html = await fetch(url).then((res) => res.text());
  const doc = new JSDOM(html, { url });
  const reader = new Readability(doc.window.document);
  const article = reader.parse();
  return article?.textContent || "";
}

export const indexWebPage = ai.defineFlow(
  {
    name: "indexPage",
    inputSchema: z.string().url().describe("URL"),
    outputSchema: z.void(),
  },
  async (url: string) => {
    const text = await ai.run("extract-text", () => fetchTextFromWeb(url));

    const chunks = await ai.run("chunk-it", async () =>
      chunk(text, { minLength: 128, maxLength: 1024, overlap: 128 })
    );

    const documents = chunks.map((text) => {
      return Document.fromText(text, { url });
    });

    return await ai.index({
      indexer: astraDBIndexer,
      documents,
    });
  }
);

export const ragFlow = ai.defineFlow(
  { name: "rag", inputSchema: z.string(), outputSchema: z.string() },
  async (input: string) => {
    const docs = await ai.retrieve({
      retriever: astraDBRetriever,
      query: input,
      options: { k: 3 },
    });

    const { text } = await ai.generate({
      model: gemini20Flash,
      prompt: `
You are a helpful AI assistant that can answer questions.

Use only the context provided to answer the question.
If you don't know, do not make up an answer.

Question: ${input}`,
      docs,
    });

    return text;
  }
);
