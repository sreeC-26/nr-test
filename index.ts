import { z, genkit, Document } from "genkit";
import { textEmbedding004, googleAI, gemini20Flash } from "@genkit-ai/googleai";
import {
  astraDBIndexerRef,
  astraDBRetrieverRef,
  astraDB,
} from "genkitx-astra-db";
import { chunk } from "llm-chunk";

const collectionName = process.env.ASTRA_DB_COLLECTION_NAME!;

export const ai = genkit({
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


export const ragFlow = ai.defineFlow(
  {
    name: "rag",
    inputSchema: z.object({ query: z.string(), extraContext: z.string().optional() }),
    outputSchema: z.string(),
  },
  async ({ query, extraContext }) => {
    const retrievedDocs = await ai.retrieve({
      retriever: astraDBRetriever,
      query,
      options: { k: 3 },
    });

    const docs = extraContext
      ? [Document.fromText(extraContext, { source: "extra" }), ...retrievedDocs]
      : retrievedDocs;

    const { text } = await ai.generate({
      model: gemini20Flash,
      prompt: `
You are a helpful AI assistant that can answer questions.

Use only the context provided to answer the question.
If you don't know, do not make up an answer.

IMPORTANT: 
- Keep your answer to a maximum of 4 lines. Be concise and direct.
- If the APOD doesn't have an image available yet, mention that the image is not yet available.
- Focus on the factual content from the APOD explanation.

Question: ${query}`,
      docs,
    });

    return text;
  }
);

export async function indexPlainText(text: string, metadata: Record<string, string>) {
  const chunks = await ai.run("chunk-it", async () =>
    chunk(text, { minLength: 128, maxLength: 512, overlap: 64 })
  );

  // Filter out chunks that exceed 8000 bytes (Astra DB limit)
  const validChunks = chunks.filter(chunk => Buffer.byteLength(chunk, 'utf8') <= 8000);
  
  if (validChunks.length === 0) {
    console.warn(`All chunks for ${metadata.filename || 'document'} exceed size limit, skipping`);
    return;
  }

  const documents = validChunks.map((textChunk) => Document.fromText(textChunk, metadata));
  return ai.index({ indexer: astraDBIndexer, documents });
}
