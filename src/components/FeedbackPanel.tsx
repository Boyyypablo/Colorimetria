"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export type FeedbackVote = {
  target: string;
  kind: "HELPED" | "DID_NOT_HELP";
};

type RecItem = { hex: string; label: string };
type CorrectionItem = { hex: string; label: string; target: string };
type AiChangeItem = { id: string; label: string; target: string; hex?: string };

type Props = {
  analysisId: string;
  seasonName: string;
  clothing: RecItem[];
  lipstick: RecItem[];
  eyeshadow: RecItem[];
  base: RecItem[];
  corrections?: CorrectionItem[];
  aiChanges?: AiChangeItem[];
  initialVotes: FeedbackVote[];
};

function voteMap(votes: FeedbackVote[]): Record<string, FeedbackVote["kind"]> {
  const map: Record<string, FeedbackVote["kind"]> = {};
  for (const v of votes) map[v.target] = v.kind;
  return map;
}

function VoteButtons({
  target,
  label,
  hex,
  current,
  busy,
  onVote,
}: {
  target: string;
  label: string;
  hex?: string;
  current?: FeedbackVote["kind"];
  busy: boolean;
  onVote: (target: string, kind: FeedbackVote["kind"]) => void;
}) {
  return (
    <li className="ar-fb__row">
      <span className="ar-fb__item">
        {hex ? <span className="ar-fb__swatch" style={{ background: hex }} /> : null}
        <span className="ar-fb__item-copy">
          <span className="ar-fb__item-label">{label}</span>
          {hex ? <span className="ar-fb__item-hex">{hex}</span> : null}
        </span>
      </span>
      <span className="ar-fb__votes">
        <button
          type="button"
          className={`ar-fb__btn ar-fb__btn--yes${current === "HELPED" ? " ar-fb__btn--on" : ""}`}
          disabled={busy}
          aria-pressed={current === "HELPED"}
          onClick={() => onVote(target, "HELPED")}
        >
          Ajudou
        </button>
        <button
          type="button"
          className={`ar-fb__btn ar-fb__btn--no${current === "DID_NOT_HELP" ? " ar-fb__btn--on" : ""}`}
          disabled={busy}
          aria-pressed={current === "DID_NOT_HELP"}
          onClick={() => onVote(target, "DID_NOT_HELP")}
        >
          Não ajudou
        </button>
      </span>
    </li>
  );
}

export function FeedbackPanel({
  analysisId,
  seasonName,
  clothing,
  lipstick,
  eyeshadow,
  base,
  corrections = [],
  aiChanges = [],
  initialVotes,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [votes, setVotes] = useState(() => voteMap(initialVotes));
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busyTarget, setBusyTarget] = useState<string | null>(null);

  async function onVote(target: string, kind: FeedbackVote["kind"]) {
    setError(null);
    setBusyTarget(target);
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        analysisId,
        kind,
        target,
        note: note.trim() || undefined,
      }),
    });
    setBusyTarget(null);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error || "Não foi possível salvar o feedback.");
      return;
    }
    setVotes((prev) => ({ ...prev, [target]: kind }));
    startTransition(() => router.refresh());
  }

  const groups: Array<{ title: string; prefix: string; items: RecItem[] }> = [
    { title: "Roupas", prefix: "clothing", items: clothing },
    { title: "Batons", prefix: "lipstick", items: lipstick },
    { title: "Sombras", prefix: "eyeshadow", items: eyeshadow },
    { title: "Base", prefix: "base", items: base },
  ];

  return (
    <div className="ar-fb">
      <p className="ar-fb__lead">
        Diga o que combinou com você. O voto calibra recomendações futuras — não só a estação.
      </p>

      <label className="ar-fb__note">
        <span className="ar-fb__note-label">Comentário opcional</span>
        <input
          className="ar-fb__note-input"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={1000}
          placeholder="Ex.: o coral ficou ótimo no dia a dia"
        />
        <span className="ar-fb__note-hint">
          Enviado junto com o próximo “Ajudou” ou “Não ajudou”.
        </span>
      </label>

      <div className="ar-fb__card ar-fb__card--season">
        <p className="ar-fb__group-title">Estação</p>
        <ul className="ar-fb__list">
          <VoteButtons
            target="season"
            label={seasonName}
            current={votes.season}
            busy={pending || busyTarget === "season"}
            onVote={onVote}
          />
        </ul>
      </div>

      {groups.map((group) =>
        group.items.length === 0 ? null : (
          <div key={group.title} className="ar-fb__card">
            <p className="ar-fb__group-title">{group.title}</p>
            <ul className="ar-fb__list">
              {group.items.map((item) => {
                const target = `${group.prefix}:${item.hex}`;
                return (
                  <VoteButtons
                    key={target}
                    target={target}
                    label={item.label}
                    hex={item.hex}
                    current={votes[target]}
                    busy={pending || busyTarget === target}
                    onVote={onVote}
                  />
                );
              })}
            </ul>
          </div>
        ),
      )}

      {aiChanges.length > 0 ? (
        <div className="ar-fb__card">
          <p className="ar-fb__group-title">Plano da consultora</p>
          <ul className="ar-fb__list">
            {aiChanges.map((item) => (
              <VoteButtons
                key={item.target}
                target={item.target}
                label={item.label}
                hex={item.hex}
                current={votes[item.target]}
                busy={pending || busyTarget === item.target}
                onVote={onVote}
              />
            ))}
          </ul>
        </div>
      ) : null}

      {corrections.length > 0 ? (
        <div className="ar-fb__card">
          <p className="ar-fb__group-title">Cuidados com a pele</p>
          <ul className="ar-fb__list">
            {corrections.map((item) => (
              <VoteButtons
                key={item.target}
                target={item.target}
                label={item.label}
                hex={item.hex}
                current={votes[item.target]}
                busy={pending || busyTarget === item.target}
                onVote={onVote}
              />
            ))}
          </ul>
        </div>
      ) : null}

      {error ? <p className="ar-fb__error">{error}</p> : null}
    </div>
  );
}
