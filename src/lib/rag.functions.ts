import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function callOpenAI(path: string, apiKey: string, body: unknown) {
  const res = await fetch(`https://api.openai.com/v1/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    let message = text;
    try {
      message = JSON.parse(text).error?.message ?? text;
    } catch {
      /* keep raw text */
    }
    throw new Error(`OpenAI error (${res.status}): ${message}`);
  }
  return JSON.parse(text);
}

export const embedTextsFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({ apiKey: z.string().min(1), texts: z.array(z.string()).min(1) })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const vectors: number[][] = [];
    for (let i = 0; i < data.texts.length; i += 64) {
      const batch = data.texts.slice(i, i + 64);
      const json = await callOpenAI("embeddings", data.apiKey, {
        model: "text-embedding-3-small",
        input: batch,
      });
      for (const item of json.data) vectors.push(item.embedding as number[]);
    }
    return { vectors };
  });

export const answerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        apiKey: z.string().min(1),
        question: z.string().min(1),
        context: z.string().min(1),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const json = await callOpenAI("chat/completions", data.apiKey, {
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "You answer questions using only the provided company FAQ context. If the answer is not in the context, say you don't know.",
        },
        {
          role: "user",
          content: `Context:\n${data.context}\n\nQuestion: ${data.question}`,
        },
      ],
    });
    return {
      answer: json.choices?.[0]?.message?.content ?? "No answer returned.",
    };
  });
