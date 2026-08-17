import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isGarmentKind, renderWardrobeLook } from "@/lib/wardrobe/render";
import { HEX_COLOR } from "@/lib/wardrobe/tint";

export const runtime = "nodejs";

type Params = { params: Promise<{ kind: string }> };

export async function GET(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });
  }

  const { kind } = await params;
  if (!isGarmentKind(kind)) {
    return NextResponse.json({ error: "Peça não encontrada." }, { status: 404 });
  }

  const hex = new URL(request.url).searchParams.get("hex") || "";
  if (!HEX_COLOR.test(hex)) {
    return NextResponse.json({ error: "Cor inválida." }, { status: 400 });
  }

  const jpeg = await renderWardrobeLook(kind, hex);
  return new NextResponse(new Uint8Array(jpeg), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "private, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
