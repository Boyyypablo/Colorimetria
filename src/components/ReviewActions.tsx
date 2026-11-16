"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";

type Season = { id: string; namePt: string };

export function RequestReviewButton({ analysisId }: { analysisId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function request() {
    setLoading(true);
    await fetch(`/api/analyses/${analysisId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "request_review" }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <button type="button" className="btn btn-ghost" onClick={request} disabled={loading}>
      {loading ? "Solicitando…" : "Pedir revisão da consultora"}
    </button>
  );
}

export function ConsultantReviewForm({
  analysisId,
  seasons,
  currentSeasonId,
}: {
  analysisId: string;
  seasons: Season[];
  currentSeasonId?: string | null;
}) {
  const router = useRouter();
  const [seasonId, setSeasonId] = useState(currentSeasonId || seasons[0]?.id || "");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setMsg(null);
    const res = await fetch("/api/consultant/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        analysisId,
        overrideSeasonId: seasonId,
        notes,
        approved: true,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMsg(data.error || "Não foi possível salvar a revisão.");
      return;
    }
    setMsg("Relatório aprovado.");
    router.push("/consultant");
    router.refresh();
  }

  return (
    <div className="card space-y-3 border-[var(--accent)]">
      <h2 className="font-display text-xl">Revisão da consultora</h2>
      <select
        className="input"
        value={seasonId}
        onChange={(e) => setSeasonId(e.target.value)}
      >
        {seasons.map((s) => (
          <option key={s.id} value={s.id}>
            {s.namePt}
          </option>
        ))}
      </select>
      <Textarea
        className="min-h-24 bg-[#fffdf9]"
        placeholder="Notas para a usuária"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <button type="button" className="btn btn-primary" onClick={submit} disabled={loading}>
        {loading ? "Salvando…" : "Aprovar com esta estação"}
      </button>
      {msg && <p className="text-sm text-[var(--ok)]">{msg}</p>}
    </div>
  );
}
