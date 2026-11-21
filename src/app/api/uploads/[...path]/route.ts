import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { readUpload, uploadOwnerId } from "@/lib/storage/local";

type Params = { params: Promise<{ path: string[] }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Faça login para continuar." },
      { status: 401 },
    );
  }

  const { path: segments } = await params;
  const relative = segments.join("/");

  let ownerId: string;
  try {
    ownerId = uploadOwnerId(relative);
  } catch {
    return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
  }

  const isOwner = ownerId === session.user.id;
  const isStaff =
    session.user.role === "CONSULTANT" || session.user.role === "ADMIN";

  if (!isOwner && !isStaff) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  // Staff: análise, simulação ou foto de perfil da cliente
  if (isStaff && !isOwner) {
    const linked = await prisma.analysis.findFirst({
      where: { imagePath: relative },
      select: { id: true },
    });
    const linkedSim = linked
      ? null
      : await prisma.simulationJob.findFirst({
          where: {
            OR: [{ outputPath: relative }, { analysis: { imagePath: relative } }],
          },
          select: { id: true },
        });
    const linkedAvatar =
      linked || linkedSim
        ? null
        : await prisma.user.findFirst({
            where: { avatarPath: relative },
            select: { id: true },
          });
    if (!linked && !linkedSim && !linkedAvatar) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }
  }

  try {
    const buffer = await readUpload(relative);
    const ext = relative.split(".").pop()?.toLowerCase();
    const contentType =
      ext === "png"
        ? "image/png"
        : ext === "webp"
          ? "image/webp"
          : "image/jpeg";

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
  }
}

export async function HEAD(request: Request, ctx: Params) {
  return GET(request, ctx);
}
