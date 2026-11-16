import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { clientIp, rateLimit } from "@/lib/rate-limit";

type ChatMessage = {
  id: string;
  role: "user" | "consultant" | "system";
  body: string;
  createdAt: string;
  userId: string;
};

/** Memória de processo (scaffold). Trocar por tabela/desk depois. */
const threads = new Map<string, ChatMessage[]>();

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

  const messages = (threads.get(id) || []).map(({ userId: _u, ...rest }) => rest);
  return NextResponse.json({ messages });
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

  const list = threads.get(id) || [];
  const message: ChatMessage = {
    id: crypto.randomUUID(),
    role: "user",
    body: parsed.data.body,
    createdAt: new Date().toISOString(),
    userId: session.user.id,
  };
  list.push(message);
  threads.set(id, list);

  const publicMessages = list.map(({ userId: _u, ...rest }) => rest);
  return NextResponse.json(
    { message: publicMessages[publicMessages.length - 1], messages: publicMessages },
    { status: 201 },
  );
}
