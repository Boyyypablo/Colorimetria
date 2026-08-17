import { generateText, Output } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { AnalysisGoalId } from "@/lib/color/goals";
import { wantsSkinCorrection } from "@/lib/color/goals";
import type { ColorFeatures, PhotoQuality } from "@/lib/color/types";
import { getGeminiApiKey, isGeminiConfigured } from "@/lib/vto/types";
import {
  CONSULTANT_JSON_SCHEMA_HINT,
  formatCardsForPrompt,
  formatRubricForPrompt,
} from "@/lib/ai/consultant-context";
import {
  consultantAllowsVision,
  resolveConsultantAiProvider,
  type ConsultantAiProvider,
} from "@/lib/ai/consultant-provider";
import { buildConsultantPlanFromCards } from "@/lib/ai/consultant-cards";
import { ollamaChatJson } from "@/lib/ai/ollama";
import {
  consultantPlanSchema,
  type ConsultantPlan,
  type ConsultantPlanMeta,
} from "./consultant-plan-schema";
import { evaluateWithRubric } from "@/lib/knowledge/evaluate";
import { getCardById } from "@/lib/knowledge/retrieve";
import { rerankCardsByQuery } from "@/lib/knowledge/rag";
import type { KnowledgeCard } from "@/lib/knowledge/types";

const VISION_INTENT =
  /olheira|mancha|vermelh|tra[cç]o|sobrancelha|l[aá]bio|nariz|olho|olhar|cabelo|pele|exaltar|valorizar|suavizar|assimetr|espinha|poro|base|batom|sombra|maquiagem|rosto/i;

export function isConsultantAiConfigured(): boolean {
  return resolveConsultantAiProvider() !== "none";
}

export function shouldUseVision(opts: {
  intention: string;
  goals: AnalysisGoalId[] | string[];
}): boolean {
  if (wantsSkinCorrection(opts.goals)) return true;
  if (opts.goals.includes("maquiagem") || opts.goals.includes("cabelo")) {
    return true;
  }
  return VISION_INTENT.test(opts.intention);
}

function resolveGeminiModel() {
  const modelId =
    process.env.CONSULTANT_AI_MODEL?.trim() || "gemini-2.5-flash";

  if (
    process.env.AI_GATEWAY_API_KEY?.trim() ||
    (process.env.VERCEL && !isGeminiConfigured())
  ) {
    const gatewayModel = modelId.includes("/")
      ? modelId
      : `google/${modelId}`;
    return { model: gatewayModel, label: gatewayModel };
  }

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error(
      "GOOGLE_GENERATIVE_AI_API_KEY (ou GEMINI_API_KEY) não configurada.",
    );
  }
  const google = createGoogleGenerativeAI({ apiKey });
  const id = modelId.includes("/") ? modelId.split("/").pop()! : modelId;
  return { model: google(id), label: id };
}

function factsBlock(input: {
  intention: string;
  goals: string[];
  context: string;
  seasonId: string;
  seasonName: string;
  undertoneLabel: string;
  confidence: number;
  features: ColorFeatures;
  photoQuality: Record<string, unknown>;
}): string {
  const f = input.features;
  return [
    `Intenção da pessoa: ${input.intention}`,
    `Objetivos marcados: ${input.goals.join(", ") || "nenhum"}`,
    `Contexto: ${input.context}`,
    `Estação medida (motor Lab — NÃO invente outra): ${input.seasonName} (${input.seasonId})`,
    `Subtom: ${input.undertoneLabel}`,
    `Confiança do motor: ${input.confidence.toFixed(2)}`,
    `Scores: temp=${f.temperatureScore.toFixed(1)}, value L*=${f.valueScore.toFixed(1)}, chroma=${f.chromaScore.toFixed(1)}, contraste=${f.contrastScore.toFixed(1)} (${f.contrastSource ?? "n/a"})`,
    `Lab undertone: L=${f.labUndertone.L.toFixed(1)} a=${f.labUndertone.a.toFixed(1)} b=${f.labUndertone.b.toFixed(1)}`,
    `Qualidade foto: ${JSON.stringify({
      band: input.photoQuality.qualityBand,
      faceDetected: input.photoQuality.faceDetected,
      warnings: input.photoQuality.warnings,
    })}`,
  ].join("\n");
}

const SYSTEM = `Você é consultora de colorimetria pessoal da Glowing.
Recebe a INTENÇÃO da pessoa, fatos objetivos (Lab/estação) do motor e cards de conhecimento internos.
Sua tarefa: decidir de forma flexível o que suavizar, exaltar ou manter, e sugerir mudanças práticas.

Regras:
1. Respeite a intenção: ela manda na prioridade.
2. A estação/Lab vêm do motor — alinhe o plano a elas; NÃO troque a estação e NÃO proponha outra cartela.
3. Use os cards como fonte de dicas (paráfrase). Não cite cursos, autoras nem material de terceiros.
4. Seja específica: cores em hex #RRGGBB quando fizer sentido; evite frases genéricas.
5. Não faça diagnóstico médico/dermatológico.
6. needsHumanReview=true se foto ruim, confiança baixa, intenção ambígua, rubrica pediu revisão, ou conflito forte com a medição.
7. Cada change.id deve ser único, curto, slug (ex: olhar-1, sobrancelha-1).
8. seasonAlignment deve confirmar a estação medida (e a irmã, se o card sister-palette estiver no contexto).
9. Responda em português do Brasil.`;

export type GenerateConsultantPlanInput = {
  intention: string;
  goals: AnalysisGoalId[] | string[];
  context: string;
  seasonId: string;
  seasonName: string;
  undertoneLabel: string;
  confidence: number;
  features: ColorFeatures;
  photoQuality: Record<string, unknown>;
  /** Buffer da foto — só enviado no modo visão Gemini (nunca Ollama). */
  imageBuffer?: Buffer;
  imageMediaType?: "image/jpeg" | "image/png" | "image/webp";
};

export type GenerateConsultantPlanResult = {
  plan: ConsultantPlan | null;
  meta: ConsultantPlanMeta;
};

function asPhotoQuality(
  raw: Record<string, unknown> | undefined,
): PhotoQuality | undefined {
  if (!raw || typeof raw.faceDetected !== "boolean") return undefined;
  return raw as unknown as PhotoQuality;
}

async function loadContextCards(
  input: GenerateConsultantPlanInput,
): Promise<{ cards: KnowledgeCard[]; opinion: ReturnType<typeof evaluateWithRubric> }> {
  const opinion = evaluateWithRubric({
    features: input.features,
    photoQuality: asPhotoQuality(input.photoQuality),
    seasonId: input.seasonId,
    goals: input.goals,
  });
  const base = opinion.cardIds
    .map((id) => getCardById(id))
    .filter((c): c is KnowledgeCard => Boolean(c));
  const query = [
    input.intention,
    input.seasonName,
    input.seasonId,
    ...input.goals.map(String),
  ].join(" ");
  const cards = await rerankCardsByQuery(query, base, 8);
  return { cards, opinion };
}

function userPrompt(
  input: GenerateConsultantPlanInput,
  cards: KnowledgeCard[],
  opinion: ReturnType<typeof evaluateWithRubric>,
  withVision: boolean,
): string {
  return [
    factsBlock({
      intention: input.intention,
      goals: input.goals.map(String),
      context: input.context,
      seasonId: input.seasonId,
      seasonName: input.seasonName,
      undertoneLabel: input.undertoneLabel,
      confidence: input.confidence,
      features: input.features,
      photoQuality: input.photoQuality,
    }),
    formatRubricForPrompt(opinion),
    "Cards de conhecimento (única fonte de dicas além dos fatos):",
    formatCardsForPrompt(cards),
    withVision
      ? "A foto do rosto está anexada. Use-a só para avaliar traços/pele relacionados à intenção; ignore fundo e roupas."
      : "Sem foto nesta chamada — baseie-se só na intenção, nos fatos do motor e nos cards.",
    "Gere o plano estruturado agora. Não altere a estação medida.",
  ].join("\n\n");
}

export async function generateConsultantPlan(
  input: GenerateConsultantPlanInput,
): Promise<GenerateConsultantPlanResult> {
  const intention = input.intention.trim();
  if (intention.length < 8) {
    return {
      plan: null,
      meta: {
        status: "skipped",
        error: "Intenção muito curta para gerar plano.",
      },
    };
  }

  const provider = resolveConsultantAiProvider();
  if (provider === "none") {
    return {
      plan: null,
      meta: {
        status: "skipped",
        error:
          "Consultora IA desligada (CONSULTANT_AI=none). Coaching estático segue ativo.",
      },
    };
  }

  const { cards, opinion } = await loadContextCards(input);
  const knowledgeMeta = {
    cardIds: cards.map((c) => c.id),
    rubricVersion: opinion.rubricVersion,
    provider,
  };

  if (provider === "cards") {
    try {
      const plan = buildConsultantPlanFromCards({
        intention,
        goals: input.goals,
        seasonId: input.seasonId,
        seasonName: input.seasonName,
        undertoneLabel: input.undertoneLabel,
        cards,
        opinion,
      });
      return {
        plan,
        meta: {
          status: "ok",
          model: "cards",
          usedVision: false,
          generatedAt: new Date().toISOString(),
          ...knowledgeMeta,
        },
      };
    } catch (err) {
      return {
        plan: null,
        meta: {
          status: "error",
          model: "cards",
          usedVision: false,
          error: err instanceof Error ? err.message : "Falha no plano por cards.",
          generatedAt: new Date().toISOString(),
          ...knowledgeMeta,
        },
      };
    }
  }

  const usedVision =
    provider === "gemini" &&
    consultantAllowsVision() &&
    Boolean(input.imageBuffer?.length) &&
    shouldUseVision({ intention, goals: input.goals });

  const prompt = userPrompt(input, cards, opinion, usedVision);

  try {
    if (provider === "ollama") {
      const raw = await ollamaChatJson({
        system: SYSTEM,
        user: prompt,
        schemaHint: CONSULTANT_JSON_SCHEMA_HINT,
      });
      const parsed = consultantPlanSchema.safeParse(raw);
      if (!parsed.success) {
        return {
          plan: null,
          meta: {
            status: "error",
            model: process.env.OLLAMA_MODEL?.trim() || "qwen2.5:7b",
            usedVision: false,
            error: "Ollama retornou JSON fora do schema.",
            generatedAt: new Date().toISOString(),
            ...knowledgeMeta,
          },
        };
      }
      return {
        plan: parsed.data,
        meta: {
          status: "ok",
          model: process.env.OLLAMA_MODEL?.trim() || "qwen2.5:7b",
          usedVision: false,
          generatedAt: new Date().toISOString(),
          ...knowledgeMeta,
        },
      };
    }

    const { model, label } = resolveGeminiModel();
    const content: Array<
      | { type: "text"; text: string }
      | { type: "file"; mediaType: string; data: Buffer }
    > = [{ type: "text", text: prompt }];

    if (usedVision && input.imageBuffer) {
      content.push({
        type: "file",
        mediaType: input.imageMediaType || "image/jpeg",
        data: input.imageBuffer,
      });
    }

    const { output } = await generateText({
      model,
      system: SYSTEM,
      output: Output.object({ schema: consultantPlanSchema }),
      messages: [{ role: "user", content }],
      temperature: 0.4,
      maxOutputTokens: 1800,
    });

    if (!output) {
      return {
        plan: null,
        meta: {
          status: "error",
          model: label,
          usedVision,
          error: "Modelo não retornou plano estruturado.",
          generatedAt: new Date().toISOString(),
          ...knowledgeMeta,
        },
      };
    }

    return {
      plan: output,
      meta: {
        status: "ok",
        model: label,
        usedVision,
        generatedAt: new Date().toISOString(),
        ...knowledgeMeta,
      },
    };
  } catch (err) {
    return {
      plan: null,
      meta: {
        status: "error",
        usedVision,
        error: err instanceof Error ? err.message : "Falha na consultora.",
        generatedAt: new Date().toISOString(),
        ...knowledgeMeta,
      },
    };
  }
}

/** Parse seguro de JSON já persistido. */
export function parseConsultantPlan(raw: unknown): ConsultantPlan | null {
  const parsed = consultantPlanSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export type { ConsultantAiProvider };
