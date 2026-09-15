"use client";

/**
 * Step 1: Light intake (before photo)
 * Product confirmed: REQUIRED, 3 yes/no radios only, no free text, no skip
 * artificial light / makeup / dyed hair
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
  // Product: yes/no radios, must answer all 3 before continue
  const [artificialLight, setArtificialLight] = useState<boolean | null>(null);
  const [makeupOnPhoto, setMakeupOnPhoto] = useState<boolean | null>(null);
  const [dyedHair, setDyedHair] = useState<boolean | null>(null);

  const allAnswered = artificialLight !== null && makeupOnPhoto !== null && dyedHair !== null;

  function handleContinue() {
    if (!allAnswered) return;
    onContinue({ 
      artificialLight: artificialLight!, 
      makeupOnPhoto: makeupOnPhoto!, 
      dyedHair: dyedHair! 
    });
  }

  return (
    <div className="intake-step">
      <div className="intake-step__header">
        <h2 className="intake-step__title">Antes da foto</h2>
        <p className="intake-step__subtitle">
          Isso ajuda a calibrar a análise para sua situação
        </p>
      </div>

      <div className="intake-step__questions">
        {/* Question 1: Luz artificial */}
        <div className="intake-question">
          <p className="intake-question__text">A iluminação é artificial?</p>
          <p className="intake-question__hint">Lâmpada, não luz natural</p>
          <div className="intake-question__radios">
            <label className="intake-radio">
              <input
                type="radio"
                name="artificialLight"
                value="yes"
                checked={artificialLight === true}
                onChange={() => setArtificialLight(true)}
              />
              <span>Sim</span>
            </label>
            <label className="intake-radio">
              <input
                type="radio"
                name="artificialLight"
                value="no"
                checked={artificialLight === false}
                onChange={() => setArtificialLight(false)}
              />
              <span>Não</span>
            </label>
          </div>
        </div>

        {/* Question 2: Maquiagem */}
        <div className="intake-question">
          <p className="intake-question__text">Você está maquiada nesta foto?</p>
          <p className="intake-question__hint">Base, blush ou corretivo</p>
          <div className="intake-question__radios">
            <label className="intake-radio">
              <input
                type="radio"
                name="makeupOnPhoto"
                value="yes"
                checked={makeupOnPhoto === true}
                onChange={() => setMakeupOnPhoto(true)}
              />
              <span>Sim</span>
            </label>
            <label className="intake-radio">
              <input
                type="radio"
                name="makeupOnPhoto"
                value="no"
                checked={makeupOnPhoto === false}
                onChange={() => setMakeupOnPhoto(false)}
              />
              <span>Não</span>
            </label>
          </div>
        </div>

        {/* Question 3: Cabelo tingido */}
        <div className="intake-question">
          <p className="intake-question__text">O cabelo está tingido?</p>
          <p className="intake-question__hint">Não é a cor natural da raiz</p>
          <div className="intake-question__radios">
            <label className="intake-radio">
              <input
                type="radio"
                name="dyedHair"
                value="yes"
                checked={dyedHair === true}
                onChange={() => setDyedHair(true)}
              />
              <span>Sim</span>
            </label>
            <label className="intake-radio">
              <input
                type="radio"
                name="dyedHair"
                value="no"
                checked={dyedHair === false}
                onChange={() => setDyedHair(false)}
              />
              <span>Não</span>
            </label>
          </div>
        </div>
      </div>

      {(artificialLight === true || makeupOnPhoto === true) && (
        <div className="intake-step__warning">
          ⚠️ A confiança da medição será menor por conta dessa condição
        </div>
      )}

      <div className="intake-step__actions">
        <button
          type="button"
          className="intake-step__btn intake-step__btn--primary"
          onClick={handleContinue}
          disabled={!allAnswered}
        >
          Continuar
        </button>
        {!allAnswered && (
          <p className="intake-step__hint">
            Responda as 3 perguntas para continuar
          </p>
        )}
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
