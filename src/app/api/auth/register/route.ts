import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { saveUserImage } from "@/lib/storage/local";
import {
  BR_UFS,
  parseBirthDateInput,
} from "@/lib/user-profile";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
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
  /** Data URL opcional da foto (jpeg/png/webp, até ~1.5MB). */
  avatarDataUrl: z.string().max(2_100_000).optional().or(z.literal("")),
  lgpdConsent: z.literal(true),
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

export async function POST(request: Request) {
  try {
    const rl = rateLimit(`register:${clientIp(request)}`, 5, 15 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Muitas tentativas. Aguarde alguns minutos." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
      );
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            "Dados inválidos. Preencha nome, e-mail, senha (8+) e aceite o termo.",
        },
        { status: 400 },
      );
    }

    const email = parsed.data.email.toLowerCase();
    const birthDate = parsed.data.birthDate
      ? parseBirthDateInput(parsed.data.birthDate)
      : null;
    if (parsed.data.birthDate && !birthDate) {
      return NextResponse.json(
        { error: "Data de nascimento inválida." },
        { status: 400 },
      );
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json(
        { error: "Já existe uma conta com este e-mail. Faça login." },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        name: parsed.data.name,
        passwordHash,
        lgpdConsentAt: new Date(),
        role: "USER",
        city: parsed.data.city?.trim() || null,
        state: parsed.data.state?.trim() || null,
        about: parsed.data.about?.trim() || null,
        birthDate,
      },
    });

    if (parsed.data.avatarDataUrl) {
      const parsedImg = parseDataUrl(parsed.data.avatarDataUrl);
      if (parsedImg) {
        const avatarPath = await saveUserImage(
          user.id,
          parsedImg.buffer,
          parsedImg.ext,
        );
        await prisma.user.update({
          where: { id: user.id },
          data: { avatarPath },
        });
      }
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível criar a conta." },
      { status: 500 },
    );
  }
}
