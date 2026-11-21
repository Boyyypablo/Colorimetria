import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { saveUserImage } from "@/lib/storage/local";
import {
  ageFromBirthDate,
  BR_UFS,
  parseBirthDateInput,
} from "@/lib/user-profile";

const patchSchema = z.object({
  name: z.string().min(2).max(80),
  city: z.string().trim().min(2).max(80).optional().or(z.literal("")),
  state: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => !v || (BR_UFS as readonly string[]).includes(v), "UF inválida")
    .optional()
    .or(z.literal("")),
  birthDate: z.string().optional().or(z.literal("")),
  about: z.string().trim().max(500).optional().or(z.literal("")),
  avatarDataUrl: z.string().max(2_100_000).optional().or(z.literal("")),
});

function parseDataUrl(dataUrl: string): { buffer: Buffer; ext: string } | null {
  const m = /^data:(image\/(jpeg|jpg|png|webp));base64,(.+)$/i.exec(dataUrl);
  if (!m) return null;
  const mime = m[2]!.toLowerCase();
  const ext = mime === "jpg" || mime === "jpeg" ? "jpg" : mime;
  try {
    const buffer = Buffer.from(m[3]!, "base64");
    if (buffer.length < 32 || buffer.length > 1.5 * 1024 * 1024) return null;
    return { buffer, ext };
  } catch {
    return null;
  }
}

function publicProfile(user: {
  id: string;
  email: string;
  name: string | null;
  avatarPath: string | null;
  birthDate: Date | null;
  city: string | null;
  state: string | null;
  about: string | null;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarPath: user.avatarPath,
    avatarUrl: user.avatarPath ? `/api/uploads/${user.avatarPath}` : null,
    birthDate: user.birthDate
      ? user.birthDate.toISOString().slice(0, 10)
      : null,
    age: ageFromBirthDate(user.birthDate),
    city: user.city,
    state: user.state,
    about: user.about,
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      avatarPath: true,
      birthDate: true,
      city: true,
      state: true,
      about: true,
    },
  });
  if (!user) {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  }
  return NextResponse.json({ profile: publicProfile(user) });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const birthDate = parsed.data.birthDate
    ? parseBirthDateInput(parsed.data.birthDate)
    : null;
  if (parsed.data.birthDate && !birthDate) {
    return NextResponse.json(
      { error: "Data de nascimento inválida." },
      { status: 400 },
    );
  }

  let avatarPath: string | undefined;
  if (parsed.data.avatarDataUrl) {
    const img = parseDataUrl(parsed.data.avatarDataUrl);
    if (!img) {
      return NextResponse.json(
        { error: "Foto inválida (use JPEG/PNG/WebP até 1,5 MB)." },
        { status: 400 },
      );
    }
    avatarPath = await saveUserImage(session.user.id, img.buffer, img.ext);
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: parsed.data.name,
      city: parsed.data.city?.trim() || null,
      state: parsed.data.state?.trim() || null,
      about: parsed.data.about?.trim() || null,
      birthDate,
      ...(avatarPath ? { avatarPath } : {}),
    },
    select: {
      id: true,
      email: true,
      name: true,
      avatarPath: true,
      birthDate: true,
      city: true,
      state: true,
      about: true,
    },
  });

  return NextResponse.json({ profile: publicProfile(user) });
}
