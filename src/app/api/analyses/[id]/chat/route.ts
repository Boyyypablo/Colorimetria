import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { resolveChatAccess } from "@/lib/desk/chat-access";
import { listClientChat, postClientChat } from "@/lib/desk/client-chat";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const postBody = z.object({
  body: z.string().trim().min(1).max(2000),
});

const CONTACT_RE =
  /(?:\+?\d[\d\s().-]{7,}\d)|(?:[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})|(?:whatsapp|telegram|instagram\.com|t\.me)/i;

async function assertOwner(analysisId: string, userId: string) {
  const analysis = await prisma.analysis.findUnique({
    where: { id: analysisId },
    select: { userId: true },
  });
  if (!analysis) return { ok: false as const, status: 404 as const };
  if (analysis.userId !== userId) return { ok: false as const, status: 403 as const };
  return { ok: true as const };
}

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticada." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const access = await assertOwner(id, session.user.id);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.status === 404 ? "Não encontrado." : "Sem permissão." },
      { status: access.status },
    );
  }

  const [messages, chatAccess] = await Promise.all([
    listClientChat(id),
    resolveChatAccess(session.user.id),
  ]);
  return NextResponse.json({ messages, access: chatAccess });
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticada." }, { status: 401 });
  }

  const rl = rateLimit(
    `chat:${session.user.id}:${clientIp(request)}`,
    20,
    60_000,
  );
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Muitas mensagens. Aguarde um momento." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const { id } = await ctx.params;
  const access = await assertOwner(id, session.user.id);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.status === 404 ? "Não encontrado." : "Sem permissão." },
      { status: access.status },
    );
  }

  const parsed = postBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Mensagem inválida." }, { status: 400 });
  }

  if (CONTACT_RE.test(parsed.data.body)) {
    return NextResponse.json(
      {
        error:
          "Mantenha o contato nesta conversa — sem telefone, e-mail ou redes.",
      },
      { status: 422 },
    );
  }

  const chatAccess = await resolveChatAccess(session.user.id);
  if (!chatAccess.canSend) {
    return NextResponse.json(
      {
        error:
          "Sua semana de chat acabou. Pague a revisão para continuar a conversa.",
        code: "CHAT_PAYMENT_REQUIRED",
        access: chatAccess,
      },
      { status: 402 },
    );
  }

  const messages = await postClientChat({
    analysisId: id,
    userId: session.user.id,
    body: parsed.data.body,
  });

  return NextResponse.json(
    { message: messages[messages.length - 1], messages },
    { status: 201 },
  );
}
