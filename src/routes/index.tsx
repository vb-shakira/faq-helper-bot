import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { extractPdfText, splitText, topChunks, type Chunk } from "@/lib/rag";
import { answerFn, embedTextsFn } from "@/lib/rag.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Company FAQ Q&A" },
      {
        name: "description",
        content:
          "Upload your company FAQ PDF and ask questions answered from the document using OpenAI embeddings and retrieval.",
      },
      { property: "og:title", content: "Company FAQ Q&A" },
      {
        property: "og:description",
        content:
          "Upload a company FAQ PDF and get answers grounded in the document.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [apiKey, setApiKey] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [chunks, setChunks] = useState<Chunk[] | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function processDocument() {
    setError("");
    setAnswer("");
    if (!apiKey.trim()) return setError("Please enter your OpenAI API key.");
    if (!file) return setError("Please upload a FAQ PDF document.");

    setBusy(true);
    setStatus(["Document uploaded"]);
    try {
      const text = await extractPdfText(file);
      if (!text) throw new Error("No text could be extracted from this PDF.");
      const pieces = splitText(text);
      const { vectors } = await embedTextsFn({
        data: { apiKey: apiKey.trim(), texts: pieces },
      });
      setChunks(pieces.map((t, i) => ({ text: t, embedding: vectors[i] as number[] })));
      setStatus([
        "Document uploaded",
        "Document processed successfully",
        `Number of chunks created: ${pieces.length}`,
        "FAQ is ready for questions",
      ]);
    } catch (e) {
      setChunks(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function ask() {
    setError("");
    setAnswer("");
    if (!apiKey.trim()) return setError("Please enter your OpenAI API key.");
    if (!chunks) return setError("Please process a FAQ document first.");
    if (!question.trim()) return setError("Please enter a question.");

    setBusy(true);
    try {
      const { vectors } = await embedTextsFn({
        data: { apiKey: apiKey.trim(), texts: [question.trim()] },
      });
      const queryEmbedding = vectors[0] as number[];
      const context = topChunks(chunks, queryEmbedding)
        .map((c) => c.text)
        .join("\n\n");
      const { answer: result } = await answerFn({
        data: { apiKey: apiKey.trim(), question: question.trim(), context },
      });
      setAnswer(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-foreground">Company FAQ Q&amp;A</h1>

      <div className="mt-6 space-y-5">
        <label className="block">
          <span className="text-sm text-muted-foreground">OpenAI API Key</span>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          />
        </label>

        <label className="block">
          <span className="text-sm text-muted-foreground">FAQ document (PDF)</span>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setChunks(null);
              setStatus(e.target.files?.[0] ? ["Document uploaded"] : []);
            }}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
          />
        </label>

        <button
          onClick={processDocument}
          disabled={busy}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Working..." : "Process Document"}
        </button>

        {status.length > 0 && (
          <ul className="space-y-1 text-sm text-muted-foreground">
            {status.map((s) => (
              <li key={s}>• {s}</li>
            ))}
          </ul>
        )}

        <label className="block">
          <span className="text-sm text-muted-foreground">Question</span>
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about the FAQ"
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          />
        </label>

        <button
          onClick={ask}
          disabled={busy}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Working..." : "Ask"}
        </button>

        {error && (
          <p className="rounded-md border border-destructive px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {answer && (
          <section className="rounded-md border border-border bg-card p-4">
            <h2 className="text-sm font-medium text-card-foreground">Answer</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-card-foreground">
              {answer}
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
