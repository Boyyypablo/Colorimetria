"use client";

/**
 * Frosted (opaque) placeholders for paid content when locked.
 * Offer UI v3.1: Frost paid blocks with opaque placeholders (no readable %).
 */

export function FrostedConfidenceBadge() {
  return (
    <div className="frosted-badge">
      <span className="frosted-badge__label">Confiança</span>
      <span className="frosted-badge__placeholder">●●●</span>
    </div>
  );
}

export function FrostedAxisBar({ label }: { label: string }) {
  return (
    <div className="frosted-axis">
      <div className="frosted-axis__header">
        <span className="frosted-axis__label">{label}</span>
        <span className="frosted-axis__placeholder">●●%</span>
      </div>
      <div className="frosted-axis__bar">
        <div className="frosted-axis__fill" />
      </div>
    </div>
  );
}

export function FrostedConfidenceBlock() {
  return (
    <div className="frosted-block">
      <div className="frosted-block__header">
        <FrostedConfidenceBadge />
      </div>
      
      <div className="frosted-axes">
        <p className="frosted-axes__title">Confiança por eixo</p>
        <div className="frosted-axes__list">
          <FrostedAxisBar label="Temperatura" />
          <FrostedAxisBar label="Valor" />
          <FrostedAxisBar label="Croma" />
          <FrostedAxisBar label="Contraste" />
        </div>
      </div>
    </div>
  );
}

export function FrostedPalette() {
  return (
    <section id="paleta" className="ar-section">
      <div className="ar-section__head">
        <h2 className="ar-section__title">Paleta de cores</h2>
        <span className="ar-section__label">Sua cartela</span>
      </div>

      <div className="frosted-palette">
        <p className="frosted-palette__subhead">Cores para usar</p>
        <div className="frosted-palette__grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="frosted-swatch">
              <div className="frosted-swatch__color" />
              <div className="frosted-swatch__label">●●●●●●</div>
            </div>
          ))}
        </div>

        <p className="frosted-palette__subhead frosted-palette__subhead--avoid">Cores para evitar</p>
        <div className="frosted-palette__avoid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="frosted-avoid-chip">
              <div className="frosted-avoid-chip__dot" />
              <span className="frosted-avoid-chip__label">●●●●●●</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
