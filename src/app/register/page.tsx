"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { GlowingLogo } from "@/components/GlowingLogo";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lgpdConsent, setLgpdConsent] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name")),
      email: String(fd.get("email")),
      password: String(fd.get("password")),
      lgpdConsent,
    };

    if (!payload.lgpdConsent) {
      setError("Aceite o termo de privacidade para criar a conta.");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, lgpdConsent: true }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Não foi possível criar a conta.");
      setLoading(false);
      return;
    }

    const login = await signIn("credentials", {
      email: payload.email,
      password: payload.password,
      redirect: false,
    });
    setLoading(false);
    if (login?.error) {
      setError(
        "Não foi possível criar a conta com este e-mail. Tente entrar ou use outro e-mail.",
      );
      return;
    }
    router.push("/analyze");
    router.refresh();
  }

  return (
    <main className="shell flex min-h-screen items-center justify-center py-10">
      <div className="card w-full max-w-md space-y-5">
        <div>
          <Link href="/" className="inline-block">
            <GlowingLogo size="md" bg="light" />
          </Link>
          <h1 className="mt-3 font-display text-3xl">Criar conta</h1>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name" className="label mb-2">
              Nome
            </Label>
            <input
              id="name"
              name="name"
              required
              className="input"
              autoComplete="name"
            />
          </div>
          <div>
            <Label htmlFor="email" className="label mb-2">
              E-mail
            </Label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="input"
              autoComplete="email"
            />
          </div>
          <div>
            <Label htmlFor="password" className="label mb-2">
              Senha
            </Label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              className="input"
              autoComplete="new-password"
            />
            <p className="mt-1 text-xs text-[var(--muted)]">
              Mínimo de 8 caracteres.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <Checkbox
              id="lgpdConsent"
              checked={lgpdConsent}
              onCheckedChange={(v) => setLgpdConsent(v === true)}
              className="mt-0.5"
              required
            />
            <Label
              htmlFor="lgpdConsent"
              className="text-sm font-normal leading-snug text-[var(--muted)]"
            >
              Autorizo o tratamento dos meus dados pessoais e da imagem facial
              para colorimetria, conforme a LGPD. Posso solicitar exclusão
              posteriormente. Seus dados ficam em servidor próprio da Glowing.
            </Label>
          </div>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? "Criando…" : "Criar conta"}
          </button>
        </form>
        <p className="text-sm text-[var(--muted)]">
          Já tem conta?{" "}
          <Link href="/login" className="underline">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
