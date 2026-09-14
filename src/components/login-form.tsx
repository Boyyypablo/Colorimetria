"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LANDING_IMAGES, LANDING_IMAGE_QUALITY } from "@/lib/landing-images";
import { GlowingLogo } from "@/components/GlowingLogo";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email"));
    const password = String(fd.get("password"));
    
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      
      setLoading(false);
      
      if (res?.error) {
        // Map Auth.js error codes to user-friendly messages
        if (res.error === "CredentialsSignin") {
          // Check if it's a rate limit (Auth.js wraps thrown errors)
          const errorLower = String(res.error).toLowerCase();
          if (errorLower.includes("rate") || errorLower.includes("limit")) {
            setError("Muitas tentativas. Aguarde 15 minutos e tente novamente.");
          } else {
            setError("E-mail ou senha inválidos.");
          }
        } else if (res.error.includes("RATE_LIMIT")) {
          setError("Muitas tentativas. Aguarde 15 minutos e tente novamente.");
        } else if (res.error.includes("INVALID_CREDENTIALS")) {
          setError("E-mail ou senha inválidos.");
        } else {
          setError("Erro ao fazer login. Tente novamente.");
        }
        console.error("[Login] SignIn error:", res.error);
        return;
      }
      
      if (res?.ok) {
        // Check for callbackUrl in query params
        const searchParams = new URLSearchParams(window.location.search);
        const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
        router.push(callbackUrl);
        router.refresh();
      } else {
        // Fallback for unexpected response
        setError("Erro ao fazer login. Tente novamente.");
      }
    } catch (err) {
      setLoading(false);
      console.error("[Login] Exception:", err);
      setError("Erro ao tentar fazer login. Tente novamente.");
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" method="post" onSubmit={onSubmit}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <Link href="/" className="mb-1">
                  <GlowingLogo
                    size="md"
                    bg="light"
                    className="glowing-logo--center"
                  />
                </Link>
                <h1 className="font-display text-2xl font-medium">
                  Bem-vinda de volta
                </h1>
                <p className="text-balance text-muted-foreground">
                  Entre para ver suas análises e cartelas
                </p>
              </div>
              <Field>
                <FieldLabel htmlFor="email">E-mail</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="voce@email.com"
                  required
                  autoComplete="email"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Senha</FieldLabel>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="current-password"
                />
              </Field>
              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
              <Field>
                <Button type="submit" className="w-full" disabled={loading} size="lg">
                  {loading ? "Entrando…" : "Entrar"}
                </Button>
              </Field>
              <FieldDescription className="text-center">
                Não tem conta?{" "}
                <Link href="/register" className="underline underline-offset-2">
                  Criar conta
                </Link>
              </FieldDescription>
            </FieldGroup>
          </form>
          <div className="relative hidden min-h-[420px] bg-muted md:block">
            <Image
              src={LANDING_IMAGES.about}
              alt="Retrato com luz natural — colorimetria pessoal"
              fill
              quality={LANDING_IMAGE_QUALITY}
              className="object-cover"
              sizes="(max-width: 768px) 0px, 50vw"
              priority
            />
          </div>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        Ao continuar, você concorda com o tratamento de dados conforme a LGPD.{" "}
        <Link href="/" className="underline underline-offset-2">
          Voltar ao início
        </Link>
      </FieldDescription>
    </div>
  );
}
