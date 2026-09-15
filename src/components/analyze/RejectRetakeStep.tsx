"use client";

/**
 * Reject / Retake screen
 * Photo preview + title "Não deu pra analisar esta foto"
 * 1-3 warnings from API enum
 * Primary "Tirar outra foto" → capture; Secondary "Cancelar"
 */

type RejectReason = "light" | "face" | "face_framing" | "blur" | "hdr_filter" | "resolution" | "other";

type RejectRetakeStepProps = {
  photoUrl: string;
  warnings: RejectReason[];
  onRetake: () => void;
  onCancel: () => void;
};

const WARNING_MESSAGES: Record<RejectReason, string> = {
  light: "Iluminação irregular — use luz natural frontal",
  face: "Rosto não detectado — centralize seu rosto e tente novamente",
  face_framing: "Rosto muito distante ou mal enquadrado — aproxime-se e centralize",
  blur: "Foto desfocada ou tremida — segure firme o aparelho",
  hdr_filter: "Filtro ou HDR extremo detectado — use foto sem edição",
  resolution: "Resolução muito baixa — use a câmera traseira",
  other: "Qualidade da foto insuficiente para análise confiável",
};

export function RejectRetakeStep({
  photoUrl,
  warnings,
  onRetake,
  onCancel,
}: RejectRetakeStepProps) {
  return (
    <div className="reject-step">
      <div className="reject-step__preview">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photoUrl} alt="Foto rejeitada" className="reject-step__photo" />
        <div className="reject-step__overlay" />
      </div>

      <div className="reject-step__content">
        <h2 className="reject-step__title">Não deu pra analisar esta foto</h2>

        <ul className="reject-step__warnings">
          {warnings.slice(0, 3).map((reason, i) => (
            <li key={i} className="reject-step__warning">
              <span className="reject-step__warning-icon">⚠️</span>
              <span className="reject-step__warning-text">
                {WARNING_MESSAGES[reason] || WARNING_MESSAGES.other}
              </span>
            </li>
          ))}
        </ul>

        <div className="reject-step__actions">
          <button
            type="button"
            className="reject-step__btn reject-step__btn--primary"
            onClick={onRetake}
          >
            Tirar outra foto
          </button>
          <button
            type="button"
            className="reject-step__btn reject-step__btn--secondary"
            onClick={onCancel}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
