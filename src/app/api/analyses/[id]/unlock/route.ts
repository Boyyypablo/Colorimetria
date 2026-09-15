import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

/**
 * POST /api/analyses/:id/unlock
 * 
 * Grant entitlement for "resultado-completo" (confidence + axes + palette).
 * 
 * Board v3: Single entitlement blocks for confidence+axes+palette together.
 * Free: station name only.
 * Paid (R$97): confidence band + 4 axes + basic palette.
 * 
 * Flow:
 * S1: CTA "Liberar resultado completo" + secondary "Já comprei"
 * S2: Title "Confirmar resultado completo" (payment/confirmation)
 * S4: "Resultado completo liberado" (success state)
 * 
 * TODO: Integrate with Stripe/Pagar.me for actual payment.
 * For now, this is a mock endpoint that grants entitlement immediately.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id: analysisId } = await params;

  try {
    // Check if analysis exists and belongs to user
    const analysis = await prisma.analysis.findUnique({
      where: { id: analysisId },
      include: { entitlement: true },
    });

    if (!analysis) {
      return NextResponse.json({ error: "Análise não encontrada" }, { status: 404 });
    }

    if (analysis.userId !== session.user.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    // Check if already unlocked
    if (analysis.entitlement?.paymentStatus === "completed") {
      return NextResponse.json({
        message: "Resultado já liberado",
        entitlement: analysis.entitlement,
      });
    }

    // Board v3: No paywall on confidence <65%
    if (analysis.confidence != null && analysis.confidence < 0.65) {
      return NextResponse.json({
        error: "Resultado com confiança <65% é gratuito (estações possíveis)",
      }, { status: 400 });
    }

    // TODO: Integrate with Stripe/Pagar.me
    // For now, grant entitlement immediately (mock)
    const body = await req.json().catch(() => ({}));
    const paymentRef = body.paymentRef || `mock-${Date.now()}`;

    const entitlement = await prisma.analysisEntitlement.upsert({
      where: { analysisId },
      create: {
        analysisId,
        userId: session.user.id,
        sku: "resultado-completo",
        paymentRef,
        paymentStatus: "completed", // TODO: "pending" until webhook confirms
        priceCents: 9700, // R$97.00
      },
      update: {
        paymentRef,
        paymentStatus: "completed",
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: "Resultado completo liberado",
      entitlement,
    });
  } catch (error) {
    console.error("[Unlock] Error:", error);
    return NextResponse.json(
      { error: "Erro ao liberar resultado" },
      { status: 500 }
    );
  }
}
