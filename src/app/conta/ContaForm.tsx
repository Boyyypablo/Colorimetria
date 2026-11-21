"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { BR_UFS } from "@/lib/user-profile";

type Profile = {
  email: string;
  name: string | null;
  avatarUrl: string | null;
  birthDate: string | null;
  age: number | null;
  city: string | null;
  state: string | null;
  about: string | null;
};

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Falha ao ler a foto"));
    reader.readAsDataURL(file);
  });
}

export function ContaForm() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/account/profile");
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        const data = await res.json();
        setProfile(data.profile);
        setPreview(data.profile?.avatarUrl || null);
      } catch {
        setError("Não foi possível carregar o perfil.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError("");
    setOk("");
    const fd = new FormData(e.currentTarget);
    const avatarFile = fd.get("avatar");
    let avatarDataUrl = "";
    if (avatarFile instanceof File && avatarFile.size > 0) {
      if (avatarFile.size > 1.5 * 1024 * 1024) {
        setError("A foto deve ter no máximo 1,5 MB.");
        setSaving(false);
        return;
      }
      avatarDataUrl = await fileToDataUrl(avatarFile);
    }

    const res = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(fd.get("name")),
        city: String(fd.get("city") || ""),
        state: String(fd.get("state") || ""),
        birthDate: String(fd.get("birthDate") || ""),
        about: String(fd.get("about") || ""),
        avatarDataUrl,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Falha ao salvar.");
      return;
    }
    setProfile(data.profile);
    setPreview(data.profile.avatarUrl);
    setOk("Perfil atualizado.");
  }

  if (loading) {
    return <p className="text-sm text-[var(--muted)]">Carregando…</p>;
  }

  if (!profile) {
    return (
      <p className="text-sm text-red-700">{error || "Perfil indisponível."}</p>
    );
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="h-20 w-20 overflow-hidden rounded-full bg-[var(--line)]">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <Label htmlFor="avatar" className="label mb-2">
            Trocar foto
          </Label>
          <input
            id="avatar"
            name="avatar"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="input text-sm"
            onChange={(ev) => {
              const f = ev.target.files?.[0];
              if (!f) return;
              void fileToDataUrl(f).then(setPreview);
            }}
          />
        </div>
      </div>

      <div>
        <Label className="label mb-2">E-mail</Label>
        <input className="input" value={profile.email} disabled readOnly />
      </div>

      <div>
        <Label htmlFor="name" className="label mb-2">
          Nome
        </Label>
        <input
          id="name"
          name="name"
          required
          className="input"
          defaultValue={profile.name || ""}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="birthDate" className="label mb-2">
            Nascimento
            {profile.age != null ? ` · ${profile.age} anos` : ""}
          </Label>
          <input
            id="birthDate"
            name="birthDate"
            type="date"
            className="input"
            defaultValue={profile.birthDate || ""}
          />
        </div>
        <div>
          <Label htmlFor="state" className="label mb-2">
            UF
          </Label>
          <select
            id="state"
            name="state"
            className="input"
            defaultValue={profile.state || ""}
          >
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
          defaultValue={profile.city || ""}
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
          defaultValue={profile.about || ""}
        />
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {ok ? <p className="text-sm text-emerald-800">{ok}</p> : null}

      <div className="flex flex-wrap gap-3">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Salvando…" : "Salvar perfil"}
        </button>
        <Link href="/dashboard" className="btn btn-ghost">
          Voltar
        </Link>
      </div>
    </form>
  );
}
