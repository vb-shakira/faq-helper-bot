export type Chunk = { text: string; embedding: number[] };

export async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buffer }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text +=
      content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ") + "\n\n";
  }
  return text.trim();
}

// Recursive character splitting (same strategy as LangChain's splitter)
export function splitText(text: string, chunkSize = 1000, overlap = 150): string[] {
  const separators = ["\n\n", "\n", ". ", " ", ""];

  function split(input: string, seps: string[]): string[] {
    if (input.length <= chunkSize) return input.trim() ? [input] : [];
    const [sep, ...rest] = seps;
    if (sep === undefined) return [input];
    const pieces = sep === "" ? input.split("") : input.split(sep);

    const out: string[] = [];
    let current = "";
    for (const piece of pieces) {
      const candidate = current ? current + sep + piece : piece;
      if (candidate.length <= chunkSize) {
        current = candidate;
      } else {
        if (current) out.push(current);
        if (piece.length > chunkSize) out.push(...split(piece, rest));
        else current = piece;
        if (piece.length > chunkSize) current = "";
      }
    }
    if (current) out.push(current);
    return out;
  }

  const raw = split(text, separators).filter((c) => c.trim().length > 0);

  // apply overlap
  const merged: string[] = [];
  for (let i = 0; i < raw.length; i++) {
    const prev = i > 0 ? (raw[i - 1] as string).slice(-overlap) : "";
    merged.push((prev ? prev + " " : "") + (raw[i] as string));
  }
  return merged;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i] as number;
    const bi = b[i] as number;
    dot += ai * bi;
    na += ai * ai;
    nb += bi * bi;
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

export function topChunks(chunks: Chunk[], queryEmbedding: number[], k = 4): Chunk[] {
  return [...chunks]
    .map((c) => ({ c, score: cosineSimilarity(c.embedding, queryEmbedding) }))
    .sort((x, y) => y.score - x.score)
    .slice(0, k)
    .map((x) => x.c);
}
