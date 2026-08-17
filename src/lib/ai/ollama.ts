import {
  ollamaBaseUrl,
  ollamaChatModel,
  ollamaEmbedModel,
} from "@/lib/ai/consultant-provider";

const DEFAULT_TIMEOUT_MS = 120_000;

function resolveTimeout(timeoutMs?: number): number {
  if (timeoutMs && timeoutMs > 0) return timeoutMs;
  const fromEnv = Number(process.env.OLLAMA_TIMEOUT_MS);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;
  return DEFAULT_TIMEOUT_MS;
}

async function ollamaFetch(
  path: string,
  body: unknown,
  timeoutMs?: number,
): Promise<Response> {
  const ms = resolveTimeout(timeoutMs);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(`${ollamaBaseUrl()}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function ollamaChatJson(opts: {
  system: string;
  user: string;
  schemaHint: string;
  timeoutMs?: number;
}): Promise<unknown> {
  const res = await ollamaFetch(
    "/api/chat",
    {
      model: ollamaChatModel(),
      stream: false,
      format: "json",
      options: { temperature: 0.3 },
      messages: [
        { role: "system", content: opts.system },
        {
          role: "user",
          content: `${opts.user}\n\nResponda APENAS um JSON válido com este formato:\n${opts.schemaHint}`,
        },
      ],
    },
    opts.timeoutMs,
  );
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Ollama chat ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = (await res.json()) as { message?: { content?: string } };
  const content = data.message?.content?.trim();
  if (!content) throw new Error("Ollama não retornou conteúdo.");
  return JSON.parse(content) as unknown;
}

export async function ollamaEmbed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const res = await ollamaFetch("/api/embed", {
    model: ollamaEmbedModel(),
    input: texts,
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Ollama embed ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = (await res.json()) as { embeddings?: number[][] };
  if (!data.embeddings || data.embeddings.length !== texts.length) {
    throw new Error("Ollama embed: resposta incompleta.");
  }
  return data.embeddings;
}
