import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { Role } from "@prisma/client";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { authConfig } from "@/lib/auth.config";

declare module "next-auth" {
  interface User {
    role: Role;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: Role;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
    roleCheckedAt?: number;
  }
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(128),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  // Let Auth.js v5 handle cookies with defaults (trustHost + AUTH_URL determine secure/naming)
  // Custom cookies config was causing issues with Cloudflare tunnel
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(raw, request) {
        console.log("[Auth] authorize() called, AUTH_URL:", process.env.AUTH_URL);
        
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) {
          console.error("[Auth] Invalid credentials schema");
          throw new Error("INVALID_CREDENTIALS");
        }

        const ip = request ? clientIp(request) : "unknown";
        const email = parsed.data.email.toLowerCase();
        console.log("[Auth] Login attempt for:", email, "from IP:", ip);
        
        const rlIp = rateLimit(`login:ip:${ip}`, 30, 15 * 60 * 1000);
        const rlEmail = rateLimit(`login:email:${email}`, 10, 15 * 60 * 1000);
        
        if (!rlIp.ok || !rlEmail.ok) {
          console.warn(`[Auth] Rate limit hit for ${email} / ${ip}`);
          throw new Error("RATE_LIMIT");
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });
        
        if (!user) {
          console.warn("[Auth] User not found:", email);
          throw new Error("INVALID_CREDENTIALS");
        }

        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) {
          console.warn("[Auth] Invalid password for:", email);
          throw new Error("INVALID_CREDENTIALS");
        }

        console.log("[Auth] ✓ authorize() successful for:", email, "role:", user.role);
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger }) {
      if (user) {
        console.log("[Auth] jwt() callback with user:", user.email, "trigger:", trigger);
        token.id = user.id!;
        token.role = user.role;
        token.roleCheckedAt = Date.now();
        return token;
      }
      // Revalida role no Node (não no Edge middleware)
      const checkedAt =
        typeof token.roleCheckedAt === "number" ? token.roleCheckedAt : 0;
      if (token.id && Date.now() - checkedAt > 15 * 60 * 1000) {
        const dbUser = await prisma.user.findUnique({
          where: { id: String(token.id) },
          select: { role: true },
        });
        if (!dbUser) {
          token.id = "";
          return token;
        }
        token.role = dbUser.role;
        token.roleCheckedAt = Date.now();
      }
      return token;
    },
    async session({ session, token }) {
      console.log("[Auth] session() callback, token.id:", token.id);
      if (session.user) {
        session.user.id = String(token.id ?? "");
        session.user.role = (token.role as Role) ?? "USER";
      }
      return session;
    },
  },
});
