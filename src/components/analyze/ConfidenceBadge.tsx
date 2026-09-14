"use client";

/**
 * Confidence badge following Figma specs:
 * high ≥80 / moderate 65–79 / low <65
 */

type ConfidenceBand = "high" | "moderate" | "low";

type ConfidenceBadgeProps = {
  percent: number;
};

function getConfidenceBand(percent: number): ConfidenceBand {
  if (percent >= 80) return "high";
  if (percent >= 65) return "moderate";
  return "low";
}

const BAND_LABELS: Record<ConfidenceBand, string> = {
  high: "Alta",
  moderate: "Moderada",
  low: "Baixa",
};

export function ConfidenceBadge({ percent }: ConfidenceBadgeProps) {
  const band = getConfidenceBand(percent);

  return (
    <div className={`confidence-badge confidence-badge--${band}`}>
      <span className="confidence-badge__percent">{percent}%</span>
      <span className="confidence-badge__label">{BAND_LABELS[band]}</span>
    </div>
  );
}

export { getConfidenceBand };
export type { ConfidenceBand };
