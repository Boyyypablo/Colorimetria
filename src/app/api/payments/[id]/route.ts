import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { AsaasError } from "@/lib/payments/asaas";
import {
  serializePaymentOrder,
  syncOrderFromAsaas,
} from "@/lib/payments/orders";
import { clientSafeErrorMessage } from "@/lib/security/redact";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });
  }

  const { id } = await params;
  const order = await prisma.paymentOrder.findUnique({ where: { id } });
  if (!order || order.userId !== session.user.id) {
    return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const sync = searchParams.get("sync") === "1";

  try {
    const fresh =
      sync && order.status !== "PAID" && order.asaasPaymentId
        ? await syncOrderFromAsaas(order)
        : order;
    return NextResponse.json({ order: serializePaymentOrder(fresh) });
  } catch (err) {
    if (err instanceof AsaasError) {
      return NextResponse.json(
        { order: serializePaymentOrder(order), warning: "Falha ao sincronizar com Asaas." },
        { status: 200 },
      );
    }
    return NextResponse.json(
      {
        error: clientSafeErrorMessage(err, "Não foi possível consultar o pagamento."),
      },
      { status: 500 },
    );
  }
}
