import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { saveUserImage } from "@/lib/storage/local";
import { analyzeImageBuffer } from "@/lib/color/classifier";
import { parseAnalysisGoals } from "@/lib/color/goals";
import { buildRecommendations, getSeasonById } from "@/lib/color/recommendations";
import { generateConsultantPlan } from "@/lib/ai/consultant";
import { evaluateWithRubric } from "@/lib/knowledge/evaluate";
import { decideAnalysisStatus, presentEvaluation } from "@/lib/knowledge/explain";
import { applyPhotoIntake, parsePhotoIntake } from "@/lib/color/photo-intake";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { calculateSisterSeasons, shouldShowSisterSeasons } from "@/lib/color/sister-seasons";

export const runtime = "nodejs";
export const maxDuration = 180;

const INTENTION_MAX = 600;

function parseIntention(raw: FormDataEntryValue | null): string {
  return String(raw || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, INTENTION_MAX);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });
  }

  const rl = rateLimit(`analyses:${session.user.id}:${clientIp(request)}`, 20, 60 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Limite de análises por hora atingido. Tente mais tarde." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  if (!user?.lgpdConsentAt) {
    return NextResponse.json(
      { error: "Consentimento LGPD necessário para upload de imagem facial." },
      { status: 403 },
    );
  }

  const form = await request.formData();
  const file = form.get("image");
  const contextRaw = String(form.get("context") || "casual");
  const context =
    contextRaw === "trabalho" || contextRaw === "noite" ? contextRaw : "casual";
  const consent = form.get("biometricConsent") === "true";
  const goals = parseAnalysisGoals(form.getAll("goals"));
  const intention = parseIntention(form.get("intention"));

  if (!consent) {
    return NextResponse.json(
      { error: "Confirme o consentimento para processamento biométrico da foto." },
      { status: 400 },
    );
  }

  if (intention.length < 8) {
    return NextResponse.json(
      {
        error:
          "Conte em poucas palavras o que você quer trabalhar (ex.: valorizar o olhar, suavizar olheiras).",
      },
      { status: 400 },
    );
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Imagem obrigatória." }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Arquivo deve ser imagem." }, { status: 400 });
  }

  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "Máximo 8MB." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.type.includes("png") ? "png" : "jpg";
  const imageMediaType =
    file.type === "image/png"
      ? ("image/png" as const)
      : file.type === "image/webp"
        ? ("image/webp" as const)
        : ("image/jpeg" as const);
  const imagePath = await saveUserImage(session.user.id, buffer, ext);

  const pending = await prisma.analysis.create({
    data: {
      userId: session.user.id,
      imagePath,
      status: "PENDING",
      context,
      goals,
      intention,
    },
  });

  try {
    // P0.2: analyzeImageBuffer pode lançar erro se rosto não for detectado
    const result = applyPhotoIntake(await analyzeImageBuffer(buffer), parsePhotoIntake(form));
    const season = getSeasonById(result.seasonId);
    if (!season) {
      throw new Error("Estação não encontrada");
    }

    let recommendations = buildRecommendations(season, context, {
      temperatureScore: result.features.temperatureScore,
      goals,
      skinLab: result.features.labUndertone,
      valueScore: result.features.valueScore,
      contrastScore: result.features.contrastScore,
    });

    const opinion = evaluateWithRubric({
      features: result.features,
      photoQuality: result.photoQuality,
      seasonId: season.id,
      goals,
    });
    const evaluation = presentEvaluation(opinion, season.namePt, season.id);
    recommendations = { ...recommendations, evaluation };

    // P0.5: Calcular estações irmãs se confiança baixa
    let sisterSeasons: string[] | undefined;
    if (shouldShowSisterSeasons(result.confidence)) {
      sisterSeasons = calculateSisterSeasons(result.features, result.seasonId);
    }

    const ai = await generateConsultantPlan({
      intention,
      goals,
      context,
      seasonId: season.id,
      seasonName: season.namePt,
      undertoneLabel: result.undertoneLabel,
      confidence: result.confidence,
      features: result.features,
      photoQuality: result.photoQuality as unknown as Record<string, unknown>,
      imageBuffer: buffer,
      imageMediaType,
    });

    // Com plano IA ok, a correção de pele deixa de ser o catálogo fixo.
    if (ai.plan) {
      recommendations = {
        ...recommendations,
        skinCorrection: null,
        coaching: {
          ...recommendations.coaching,
          attentionRedirectTips: [],
        },
      };
    }

    // P0.5: Adicionar estações irmãs às recomendações
    if (sisterSeasons && sisterSeasons.length > 0) {
      recommendations = {
        ...recommendations,
        sisterSeasons,
      };
    }

    const needsReviewStatus = decideAnalysisStatus({
      classifierNeedsReview: result.needsReview,
      rubricNeedsReview: opinion.needsReview,
      planNeedsHumanReview: Boolean(ai.plan?.needsHumanReview),
      consultantError: ai.meta.status === "error",
    });

    const analysis = await prisma.analysis.update({
      where: { id: pending.id },
      data: {
        status: needsReviewStatus,
        seasonId: result.seasonId,
        confidence: result.confidence,
        confidenceBreakdown: result.confidenceBreakdown ?? Prisma.JsonNull,
        features: result.features,
        photoQuality: result.photoQuality,
        undertoneLabel: result.undertoneLabel,
        recommendations,
        detectorProvider: result.photoQuality.detectorProvider,
        predictorId: result.predictorId,
        consultantPlan: ai.plan ?? Prisma.JsonNull,
        consultantPlanMeta: ai.meta,
      },
      include: {
        season: true,
      },
    });

    try {
      await prisma.analysisSample.create({
        data: {
          analysisId: analysis.id,
          userId: session.user.id,
          featureSchemaVersion: result.features.featureSchemaVersion,
          detectorProvider: result.photoQuality.detectorProvider,
          predictorId: result.predictorId,
          features: result.features,
          predictedSeasonId: result.seasonId,
        },
      });
    } catch {
      // ignore duplicate / schema lag
    }

    return NextResponse.json({ analysis });
  } catch (err) {
    // P0.2: Se erro for de detecção de rosto, retornar 400 (bad request) sem criar análise NEEDS_REVIEW
    const errorMsg = err instanceof Error ? err.message : "Não foi possível concluir a análise.";
    const isFaceDetectionError = errorMsg.includes("localizar seu rosto") || errorMsg.includes("rosto na foto");
    
    if (isFaceDetectionError) {
      // Deletar análise pending pois foto é inválida
      await prisma.analysis.delete({ where: { id: pending.id } });
      return NextResponse.json(
        {
          error: errorMsg,
          code: "FACE_NOT_DETECTED",
        },
        { status: 400 },
      );
    }
    
    // Outros erros: marcar como NEEDS_REVIEW
    await prisma.analysis.update({
      where: { id: pending.id },
      data: { status: "NEEDS_REVIEW" },
    });
    return NextResponse.json(
      {
        error: errorMsg,
        analysisId: pending.id,
      },
      { status: 500 },
    );
  }
}
