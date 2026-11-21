import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { paymentsEnabled } from "@/lib/payments/config";
import { assertReviewOrderPaid } from "@/lib/payments/orders";
import { readUpload } from "@/lib/storage/local";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });
  }

  const { id } = await params;
  const analysis = await prisma.analysis.findUnique({
    where: { id },
    include: {
      season: true,
      overrideSeason: true,
      reviews: {
        orderBy: { createdAt: "desc" },
        include: { reviewer: { select: { name: true, email: true } } },
      },
      simulations: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!analysis) {
    return NextResponse.json({ error: "Não encontrada." }, { status: 404 });
  }

  const isOwner = analysis.userId === session.user.id;
  const isStaff =
    session.user.role === "CONSULTANT" || session.user.role === "ADMIN";
  if (!isOwner && !isStaff) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  return NextResponse.json({ analysis });
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  // Usuária solicita revisão
  if (body.action === "request_review") {
    const analysis = await prisma.analysis.findUnique({ where: { id } });
    if (!analysis || analysis.userId !== session.user.id) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }
    if (analysis.status === "APPROVED") {
      return NextResponse.json(
        { error: "Esta análise já foi aprovada." },
        { status: 400 },
      );
    }
    if (paymentsEnabled()) {
      try {
        await assertReviewOrderPaid({
          userId: session.user.id,
          analysisId: id,
          orderId: typeof body.paymentOrderId === "string" ? body.paymentOrderId : null,
        });
      } catch (err) {
        return NextResponse.json(
          {
            error:
              err instanceof Error
                ? err.message
                : "Pagamento da revisão necessário.",
            code: "PAYMENT_REQUIRED",
          },
          { status: 402 },
        );
      }
    }
    const updated = await prisma.analysis.update({
      where: { id },
      data: { status: "NEEDS_REVIEW" },
    });
    return NextResponse.json({ analysis: updated });
  }

  return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
}

/** Endpoint interno para validar leitura de imagem (staff/owner). */
export async function HEAD(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse(null, { status: 401 });
  }
  const { id } = await params;
  const analysis = await prisma.analysis.findUnique({ where: { id } });
  if (!analysis) return new NextResponse(null, { status: 404 });

  const isOwner = analysis.userId === session.user.id;
  const isStaff =
    session.user.role === "CONSULTANT" || session.user.role === "ADMIN";
  if (!isOwner && !isStaff) {
    return new NextResponse(null, { status: 403 });
  }

  try {
    await readUpload(analysis.imagePath);
    return new NextResponse(null, { status: 200 });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
