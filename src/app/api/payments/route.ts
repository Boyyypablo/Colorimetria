import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { AsaasError, normalizeCpfCnpj } from "@/lib/payments/asaas";
import { paymentsEnabled } from "@/lib/payments/config";
import {
  createOrReusePaymentOrder,
  findReusableOrder,
  serializePaymentOrder,
} from "@/lib/payments/orders";
import { clientSafeErrorMessage } from "@/lib/security/redact";

export const runtime = "nodejs";

const bodySchema = z.object({
  sku: z.enum(["ANALYSIS", "REVIEW"]),
  analysisId: z.string().min(1).optional().nullable(),
  cpfCnpj: z.string().min(11).max(18),
  billingType: z.enum(["PIX", "CREDIT_CARD", "UNDEFINED"]).optional(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sku = searchParams.get("sku");
  const analysisId = searchParams.get("analysisId");

  if (sku === "ANALYSIS" || sku === "REVIEW") {
    const order = await findReusableOrder({
      userId: session.user.id,
      sku,
      analysisId: analysisId || null,
    });
    return NextResponse.json({
      enabled: paymentsEnabled(),
      order: order ? serializePaymentOrder(order) : null,
    });
  }

  const orphans = await prisma.paymentOrder.findMany({
    where: {
      userId: session.user.id,
      sku: "ANALYSIS",
      status: "PAID",
      analysisId: null,
    },
    orderBy: { paidAt: "desc" },
    take: 5,
  });

  return NextResponse.json({
    enabled: paymentsEnabled(),
    orders: orphans.map(serializePaymentOrder),
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });
  }

  if (!paymentsEnabled()) {
    return NextResponse.json(
      { error: "Pagamentos desabilitados neste ambiente." },
      { status: 503 },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos. Informe SKU e CPF/CNPJ." },
      { status: 400 },
    );
  }

  const { sku, analysisId, billingType } = parsed.data;
  const cpfCnpj = normalizeCpfCnpj(parsed.data.cpfCnpj);
  if (cpfCnpj.length !== 11 && cpfCnpj.length !== 14) {
    return NextResponse.json({ error: "CPF/CNPJ inválido." }, { status: 400 });
  }

  if (sku === "REVIEW") {
    if (!analysisId) {
      return NextResponse.json(
        { error: "analysisId obrigatório para revisão." },
        { status: 400 },
      );
    }
    const analysis = await prisma.analysis.findUnique({ where: { id: analysisId } });
    if (!analysis || analysis.userId !== session.user.id) {
      return NextResponse.json({ error: "Análise não encontrada." }, { status: 404 });
    }
    if (analysis.status === "APPROVED") {
      return NextResponse.json(
        { error: "Esta análise já foi aprovada — revisão não disponível." },
        { status: 400 },
      );
    }
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  }

  try {
    const order = await createOrReusePaymentOrder({
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      asaasCustomerId: user.asaasCustomerId,
      sku,
      analysisId: sku === "REVIEW" ? analysisId : null,
      cpfCnpj,
      billingType: billingType || "PIX",
    });
    return NextResponse.json({ order: serializePaymentOrder(order) });
  } catch (err) {
    const status = err instanceof AsaasError ? (err.status >= 400 && err.status < 500 ? err.status : 502) : 500;
    return NextResponse.json(
      {
        error: clientSafeErrorMessage(
          err,
          err instanceof Error ? err.message : "Não foi possível criar a cobrança.",
        ),
      },
      { status },
    );
  }
}
