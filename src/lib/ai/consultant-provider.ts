export type ConsultantAiProvider = "none" | "ollama" | "gemini";

function rawProvider(): string {
  return (process.env.CONSULTANT_AI || "").trim().toLowerCase();
}

/**
 * none = só coaching estático.
 * ollama = local, sem token.
 * gemini = nuvem (se houver chave).
 * Sem CONSULTANT_AI: gemini se a chave existir (compatível com o que já rodava).
 */
export function resolveConsultantAiProvider(): ConsultantAiProvider {
  const raw = rawProvider();
  if (raw === "none" || raw === "off" || raw === "false") return "none";
  if (raw === "ollama") return "ollama";
  if (raw === "gemini") return "gemini";
  if (
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    process.env.AI_GATEWAY_API_KEY?.trim()
  ) {
    return "gemini";
  }
  return "none";
}

export function ollamaBaseUrl(): string {
  const host = (process.env.OLLAMA_HOST || "http://127.0.0.1:11434").trim();
  return host.replace(/\/$/, "");
}

export function ollamaChatModel(): string {
  return (
    process.env.OLLAMA_MODEL?.trim() ||
    (process.env.CONSULTANT_AI === "ollama"
      ? "qwen2.5:7b"
      : process.env.CONSULTANT_AI_MODEL?.trim() || "qwen2.5:7b")
  );
}

export function ollamaEmbedModel(): string {
  return process.env.OLLAMA_EMBED_MODEL?.trim() || "nomic-embed-text";
}
