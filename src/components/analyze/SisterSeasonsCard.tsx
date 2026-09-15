"use client";

import { useState } from "react";

/**
 * Confidence <65% card
 * Badge low + "Ainda não dá pra cravar seu resultado"
 * Primary "Ver Estações possíveis" → list of alternative color seasons
 * Secondary "Tirar outra foto"
 * Design QA: "Ver mesmo assim" removed (product said omit)
 */

type SisterSeason = {
  id: string;
  namePt: string;
  family?: string;
};

type SisterSeasonsCardProps = {
  sisters: SisterSeason[];
  onRetake: () => void;
};

export function SisterSeasonsCard({
  sisters,
  onRetake,
}: SisterSeasonsCardProps) {
  const [expanded, setExpanded] = useState(false);

  if (sisters.length === 0) {
    // Empty/error stations: keep retake, no full-page fail
    return (
      <div className="sister-card">
        <div className="sister-card__badge sister-card__badge--low">Baixa</div>
        <h3 className="sister-card__title">Ainda não dá pra cravar seu resultado</h3>
        <p className="sister-card__text">
          A foto não tem evidência suficiente para uma medição confiável.
        </p>
        <button
          type="button"
          className="sister-card__btn sister-card__btn--primary"
          onClick={onRetake}
        >
          Tirar outra foto
        </button>
      </div>
    );
  }

  return (
    <div className="sister-card">
      <div className="sister-card__badge sister-card__badge--low">Baixa</div>
      <h3 className="sister-card__title">Ainda não dá pra cravar seu resultado</h3>
      <p className="sister-card__text">
        Você está no limite entre estas estações de cor. Explore as opções ou refaça
        a foto com melhor iluminação.
      </p>

      {!expanded ? (
        <button
          type="button"
          className="sister-card__btn sister-card__btn--primary"
          onClick={() => setExpanded(true)}
        >
          Ver estações possíveis
        </button>
      ) : (
        <div className="sister-card__list">
          <p className="sister-card__list-title">Estações de cor possíveis:</p>
          {sisters.map((sister) => (
            <div key={sister.id} className="sister-card__item">
              <span className="sister-card__item-name">{sister.namePt}</span>
              {sister.family && (
                <span className="sister-card__item-family">({sister.family})</span>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="sister-card__actions">
        <button
          type="button"
          className="sister-card__btn sister-card__btn--secondary"
          onClick={onRetake}
        >
          Tirar outra foto
        </button>
      </div>
    </div>
  );
}
