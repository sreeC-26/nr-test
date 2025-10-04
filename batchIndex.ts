import fs from "node:fs";
import path from "node:path";
import pdf from "pdf-parse";
import { indexPlainText } from "./index";

async function indexPdfFile(filePath: string) {
  const buf = await fs.promises.readFile(filePath);
  const data: any = await pdf(buf);
  const text = (data?.text as string) || "";
  const filename = path.basename(filePath);
  await indexPlainText(text, { filename, source: "batch" });
  return { filename, pages: (data?.numpages as number) ?? null };
}

async function main() {
  const folder = process.argv[2];
  if (!folder) {
    console.error("Usage: tsx --env-file .env batchIndex.ts <folder>");
    process.exit(1);
  }
  const abs = path.resolve(folder);
  const entries = await fs.promises.readdir(abs, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".pdf"))
    .map((e) => path.join(abs, e.name));
  console.log(`Found ${files.length} PDFs in ${abs}`);

  let ok = 0;
  for (const file of files) {
    try {
      const res = await indexPdfFile(file);
      ok++;
      console.log(`Indexed: ${res.filename} (pages: ${res.pages ?? "?"})`);
    } catch (err: any) {
      console.error(`Failed: ${file}: ${err?.message || err}`);
    }
  }

  console.log(`Done. Indexed ${ok}/${files.length} PDFs.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


