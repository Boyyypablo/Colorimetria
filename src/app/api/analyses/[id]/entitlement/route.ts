import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

/**
 * GET /api/analyses/:id/entitlement
 * 
 * Check if user has entitlement for this analysis result.
 * Returns isLocked flag (true = needs payment, false = unlocked).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id: analysisId } = await params;

  try {
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

    // Board v3: No paywall on confidence <65%
    const lowConfidence = analysis.confidence != null && analysis.confidence < 0.65;
    const hasCompletedPayment = analysis.entitlement?.paymentStatus === "completed";

    const isLocked = !lowConfidence && !hasCompletedPayment;

    return NextResponse.json({
      isLocked,
      hasEntitlement: hasCompletedPayment,
      lowConfidence,
      entitlement: analysis.entitlement,
    });
  } catch (error) {
    console.error("[Entitlement] Error:", error);
    return NextResponse.json(
      { error: "Erro ao verificar entitlement" },
      { status: 500 }
    );
  }
}
