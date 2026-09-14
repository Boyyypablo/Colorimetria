"use client";

/**
 * Step 1: Light intake (before photo)
 * Toggles default off: artificial light / makeup / dyed hair
 * Max 1 screen, "Continuar" → camera
 */

type IntakeData = {
  artificialLight: boolean;
  makeupOnPhoto: boolean;
  dyedHair: boolean;
};

type IntakeStepProps = {
  onContinue: (data: IntakeData) => void;
  onCancel: () => void;
};

export function IntakeStep({ onContinue, onCancel }: IntakeStepProps) {
  const [artificialLight, setArtificialLight] = useState(false);
  const [makeupOnPhoto, setMakeupOnPhoto] = useState(false);
  const [dyedHair, setDyedHair] = useState(false);

  function handleContinue() {
    onContinue({ artificialLight, makeupOnPhoto, dyedHair });
  }

  return (
    <div className="intake-step">
      <div className="intake-step__header">
        <h2 className="intake-step__title">Antes da foto</h2>
        <p className="intake-step__subtitle">
          Isso ajuda a calibrar a análise para sua situação
        </p>
      </div>

      <div className="intake-step__toggles">
        <label className="intake-toggle">
          <input
            type="checkbox"
            checked={artificialLight}
            onChange={(e) => setArtificialLight(e.target.checked)}
          />
          <div className="intake-toggle__content">
            <span className="intake-toggle__label">Luz artificial</span>
            <span className="intake-toggle__hint">Lâmpada, não luz natural</span>
          </div>
        </label>

        <label className="intake-toggle">
          <input
            type="checkbox"
            checked={makeupOnPhoto}
            onChange={(e) => setMakeupOnPhoto(e.target.checked)}
          />
          <div className="intake-toggle__content">
            <span className="intake-toggle__label">Estou maquiada</span>
            <span className="intake-toggle__hint">Base, blush ou corretivo</span>
          </div>
        </label>

        <label className="intake-toggle">
          <input
            type="checkbox"
            checked={dyedHair}
            onChange={(e) => setDyedHair(e.target.checked)}
          />
          <div className="intake-toggle__content">
            <span className="intake-toggle__label">Cabelo tingido</span>
            <span className="intake-toggle__hint">Não é a cor natural da raiz</span>
          </div>
        </label>
      </div>

      {(artificialLight || makeupOnPhoto) && (
        <div className="intake-step__warning">
          ⚠️ A confiança da medição será menor por conta dessa condição
        </div>
      )}

      <div className="intake-step__actions">
        <button
          type="button"
          className="intake-step__btn intake-step__btn--primary"
          onClick={handleContinue}
        >
          Continuar
        </button>
        <button
          type="button"
          className="intake-step__btn intake-step__btn--secondary"
          onClick={onCancel}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

import { useState } from "react";
