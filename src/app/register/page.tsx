"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";
import { Label } from "@/components/ui/label";
import { GlowingLogo } from "@/components/GlowingLogo";
import { BR_UFS } from "@/lib/user-profile";

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Falha ao ler a foto"));
    reader.readAsDataURL(file);
  });
}

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lgpdConsent, setLgpdConsent] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const fd = new FormData(e.currentTarget);
      const password = String(fd.get("password") || "");
      const passwordConfirm = String(fd.get("passwordConfirm") || "");

      if (password.length < 8) {
        setError("A senha precisa ter no mínimo 8 caracteres.");
        return;
      }
      if (password !== passwordConfirm) {
        setError("As senhas não coincidem. Digite a mesma senha nos dois campos.");
        return;
      }

      const avatarFile = fd.get("avatar");
      let avatarDataUrl = "";
      if (avatarFile instanceof File && avatarFile.size > 0) {
        if (avatarFile.size > 1.5 * 1024 * 1024) {
          setError("A foto deve ter no máximo 1,5 MB.");
          return;
        }
        avatarDataUrl = await fileToDataUrl(avatarFile);
      }

      if (!lgpdConsent) {
        setError("Aceite o termo de privacidade para criar a conta.");
        return;
      }

      const payload = {
        name: String(fd.get("name")),
        email: String(fd.get("email")),
        password,
        city: String(fd.get("city") || ""),
        state: String(fd.get("state") || ""),
        birthDate: String(fd.get("birthDate") || ""),
        about: String(fd.get("about") || ""),
        avatarDataUrl,
        lgpdConsent: true as const,
      };

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data: { error?: string; ok?: boolean } = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok) {
        setError(data.error || "Não foi possível criar a conta.");
        return;
      }

      setSuccess("Conta criada. Entrando…");

      const login = await signIn("credentials", {
        email: payload.email,
        password: payload.password,
        redirect: false,
      });

      if (login?.error || login?.ok === false) {
        setSuccess(null);
        setError(
          "Conta criada, mas o login automático falhou. Entre com seu e-mail e senha.",
        );
        router.push("/login");
        return;
      }

      setSuccess("Conta criada com sucesso. Redirecionando…");
      // Navegação hard: cookie de sessão já gravado; evita ficar preso no /register
      window.location.assign("/analyze");
    } catch {
      setSuccess(null);
      setError("Falha de conexão. Verifique a internet e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center py-10">
      <div className="shell card w-full max-w-lg space-y-5">
        <div>
          <Link href="/" className="inline-block">
            <GlowingLogo size="md" bg="light" />
          </Link>
          <h1 className="mt-3 font-display text-3xl">Criar conta</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            E-mail e senha para entrar. Foto, idade e cidade ajudam a consultora
            a te conhecer melhor.
          </p>
        </div>
        <form
          method="post"
          action="/register"
          onSubmit={onSubmit}
          className="space-y-4"
          noValidate
        >
          <div className="flex flex-wrap items-center gap-4">
            <div className="h-20 w-20 overflow-hidden rounded-full bg-[var(--line)]">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview}
                  alt="Prévia da foto"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-[var(--muted)]">
                  Foto
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <Label htmlFor="avatar" className="label mb-2">
                Foto de perfil (opcional)
              </Label>
              <input
                id="avatar"
                name="avatar"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="input text-sm"
                onChange={(ev) => {
                  const f = ev.target.files?.[0];
                  if (!f) {
                    setPreview(null);
                    return;
                  }
                  void fileToDataUrl(f)
                    .then(setPreview)
                    .catch(() => setPreview(null));
                }}
              />
              <p className="mt-1 text-xs text-[var(--muted)]">
                JPEG, PNG ou WebP · máx. 1,5 MB
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="name" className="label mb-2">
              Nome completo
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
          <div>
            <Label htmlFor="passwordConfirm" className="label mb-2">
              Confirmar senha
            </Label>
            <input
              id="passwordConfirm"
              name="passwordConfirm"
              type="password"
              required
              minLength={8}
              className="input"
              autoComplete="new-password"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="birthDate" className="label mb-2">
                Data de nascimento
              </Label>
              <input
                id="birthDate"
                name="birthDate"
                type="date"
                className="input"
                autoComplete="bday"
              />
            </div>
            <div>
              <Label htmlFor="state" className="label mb-2">
                Estado (UF)
              </Label>
              <select id="state" name="state" className="input" defaultValue="">
                <option value="">—</option>
                {BR_UFS.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="city" className="label mb-2">
              Cidade
            </Label>
            <input
              id="city"
              name="city"
              className="input"
              autoComplete="address-level2"
              placeholder="Ex.: São Paulo"
            />
          </div>

          <div>
            <Label htmlFor="about" className="label mb-2">
              Sobre você / o que busca
            </Label>
            <textarea
              id="about"
              name="about"
              rows={3}
              maxLength={500}
              className="input min-h-[88px] resize-y"
              placeholder="Ex.: quero cartela para trabalho e looks do dia a dia…"
            />
          </div>

          <label className="auth-consent">
            <input
              id="lgpdConsent"
              name="lgpdConsent"
              type="checkbox"
              className="auth-consent__box"
              checked={lgpdConsent}
              required
              aria-required="true"
              onChange={(e) => setLgpdConsent(e.target.checked)}
            />
            <span className="auth-consent__text">
              Autorizo o tratamento dos meus dados pessoais e da imagem facial
              para colorimetria, conforme a LGPD. Posso solicitar exclusão
              posteriormente. Seus dados ficam em servidor próprio da Glowing.
            </span>
          </label>

          {error ? (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="text-sm text-[var(--ok,#166534)]" role="status">
              {success}
            </p>
          ) : null}

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={loading}
          >
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
