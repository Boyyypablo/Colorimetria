import { SignJWT, jwtVerify } from "jose";

export const DESK_COOKIE = "desk_session";

const DEFAULT_SECRET = "dev-desk-secret-change-me";

function isProductionDesk(): boolean {
  return process.env.DESK_ENV === "production";
}

export function assertJwtSecretConfigured(): void {
  const secret = process.env.DESK_JWT_SECRET;
  if (isProductionDesk()) {
    if (!secret || secret === DEFAULT_SECRET || secret.length < 32) {
      throw new Error(
        "DESK_JWT_SECRET obrigatório em produção (mín. 32 caracteres, sem default).",
      );
    }
  } else if (!secret || secret === DEFAULT_SECRET) {
    console.warn(
      "[desk] DESK_JWT_SECRET ausente/default — ok só em desenvolvimento local.",
    );
  }
}

function secretKey(): Uint8Array {
  const raw = process.env.DESK_JWT_SECRET || DEFAULT_SECRET;
  if (raw.length < 16) {
    throw new Error("DESK_JWT_SECRET muito curto (mín. 16).");
  }
  return new TextEncoder().encode(raw);
}

export type DeskTokenPayload = {
  sub: string;
  email: string;
  name: string;
};

export async function signDeskToken(
  payload: DeskTokenPayload,
  expiresIn = "7d",
): Promise<string> {
  return new SignJWT({ email: payload.email, name: payload.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey());
}

export async function verifyDeskToken(
  token: string,
): Promise<DeskTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const sub = typeof payload.sub === "string" ? payload.sub : null;
    const email = typeof payload.email === "string" ? payload.email : null;
    const name = typeof payload.name === "string" ? payload.name : null;
    if (!sub || !email || !name) return null;
    return { sub, email, name };
  } catch {
    return null;
  }
}

export function cookieOptions(maxAgeSeconds = 60 * 60 * 24 * 7) {
  const secure = process.env.DESK_COOKIE_SECURE === "true";
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    maxAge: maxAgeSeconds,
  };
}
