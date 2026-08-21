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
    const prev = i > 0 ? raw[i - 1].slice(-overlap) : "";
    merged.push((prev ? prev + " " : "") + raw[i]);
  }
  return merged;
}

async function openai(path: string, apiKey: string, body: unknown) {
  const res = await fetch(`https://api.openai.com/v1/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text();
    let message = detail;
    try {
      message = JSON.parse(detail).error?.message ?? detail;
    } catch {
      /* keep raw text */
    }
    throw new Error(`OpenAI error (${res.status}): ${message}`);
  }
  return res.json();
}

export async function embedTexts(texts: string[], apiKey: string): Promise<number[][]> {
  const vectors: number[][] = [];
  for (let i = 0; i < texts.length; i += 64) {
    const batch = texts.slice(i, i + 64);
    const data = await openai("embeddings", apiKey, {
      model: "text-embedding-3-small",
      input: batch,
    });
    for (const item of data.data) vectors.push(item.embedding as number[]);
  }
  return vectors;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
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

export async function answerQuestion(
  question: string,
  context: string,
  apiKey: string,
): Promise<string> {
  const data = await openai("chat/completions", apiKey, {
    model: "gpt-4o-mini",
    temperature: 0,
    messages: [
      {
        role: "system",
        content:
          "You answer questions using only the provided company FAQ context. If the answer is not in the context, say you don't know.",
      },
      { role: "user", content: `Context:\n${context}\n\nQuestion: ${question}` },
    ],
  });
  return data.choices?.[0]?.message?.content ?? "No answer returned.";
}
