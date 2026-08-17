export type ConsultantAiProvider = "none" | "ollama" | "gemini" | "cards";

function rawProvider(): string {
  return (process.env.CONSULTANT_AI || "").trim().toLowerCase();
}

function hasGeminiKey(): boolean {
  return Boolean(
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
      process.env.GEMINI_API_KEY?.trim() ||
      process.env.GOOGLE_API_KEY?.trim() ||
      process.env.AI_GATEWAY_API_KEY?.trim(),
  );
}

/** Vercel / preview não tem Ollama. */
export function isServerlessRuntime(): boolean {
  return Boolean(process.env.VERCEL);
}

/**
 * none = sem bloco Plano (só coaching da paleta).
 * cards = plano montado da rubrica + knowledge cards (gratuito, Vercel).
 * ollama = LLM local (PC).
 * gemini = nuvem paga — só se CONSULTANT_AI=gemini e houver chave.
 */
export function resolveConsultantAiProvider(): ConsultantAiProvider {
  const raw = rawProvider();
  if (raw === "none" || raw === "off" || raw === "false") return "none";
  if (raw === "gemini" && hasGeminiKey()) return "gemini";
  if (raw === "ollama" && !isServerlessRuntime()) return "ollama";
  return "cards";
}

/**
 * Visão (selfie no Gemini) só com CONSULTANT_VISION=true.
 * Padrão: off em serverless.
 */
export function consultantAllowsVision(): boolean {
  const raw = (process.env.CONSULTANT_VISION || "").trim().toLowerCase();
  if (raw === "true" || raw === "1") return true;
  if (raw === "false" || raw === "0") return false;
  return !isServerlessRuntime();
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
