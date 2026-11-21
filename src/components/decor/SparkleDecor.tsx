/**
 * Decorações leves (estrelas / bolhas / orbs) inspiradas em sparkles soft-pink.
 * SVG próprio — sem assets Canva. pointer-events: none.
 */
type Tone = "blush" | "cream";

export function SparkleDecor({ tone = "blush" }: { tone?: Tone }) {
  /* cream: contraste real sobre fundo bege (não bege-sobre-bege) */
  const c = tone === "cream" ? "#c98978" : "#e8a99a";
  const cSoft = tone === "cream" ? "#e2b4a6" : "#f0c4b8";

  return (
    <div className="sparkle-decor" aria-hidden="true">
      {/* Lateral esquerda */}
      <svg
        className="sparkle-decor__item sparkle-decor__item--tl"
        viewBox="0 0 120 160"
        fill="none"
      >
        <defs>
          <radialGradient id="sd-bubble-a" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.85" />
            <stop offset="45%" stopColor={cSoft} stopOpacity="0.55" />
            <stop offset="100%" stopColor={c} stopOpacity="0.15" />
          </radialGradient>
        </defs>
        <circle cx="48" cy="52" r="28" fill="url(#sd-bubble-a)" />
        <circle cx="78" cy="88" r="14" fill="url(#sd-bubble-a)" opacity="0.85" />
        <ellipse cx="38" cy="40" rx="7" ry="3.5" fill="#fff" opacity="0.55" />
        <path
          d="M92 28 L94.2 34.5 L101 36.5 L94.2 38.5 L92 45 L89.8 38.5 L83 36.5 L89.8 34.5 Z"
          fill={c}
          opacity="0.7"
        />
        <path
          d="M28 118 L29.4 122.2 L34 123.5 L29.4 124.8 L28 129 L26.6 124.8 L22 123.5 L26.6 122.2 Z"
          fill={cSoft}
          opacity="0.8"
        />
      </svg>

      <svg
        className="sparkle-decor__item sparkle-decor__item--ml"
        viewBox="0 0 100 120"
        fill="none"
      >
        <path
          d="M50 8 L55 38 L82 42 L55 46 L50 76 L45 46 L18 42 L45 38 Z"
          fill={c}
          opacity="0.55"
        />
        <path
          d="M78 72 L80 78 L86 80 L80 82 L78 88 L76 82 L70 80 L76 78 Z"
          fill={cSoft}
          opacity="0.75"
        />
        <path
          d="M22 58 L23.5 62.5 L28 64 L23.5 65.5 L22 70 L20.5 65.5 L16 64 L20.5 62.5 Z"
          fill={c}
          opacity="0.65"
        />
        <path
          d="M64 98 L65.2 101.5 L69 102.8 L65.2 104 L64 107.5 L62.8 104 L59 102.8 L62.8 101.5 Z"
          fill={cSoft}
          opacity="0.7"
        />
      </svg>

      {/* Lateral direita */}
      <svg
        className="sparkle-decor__item sparkle-decor__item--tr"
        viewBox="0 0 140 140"
        fill="none"
      >
        <circle cx="70" cy="70" r="42" stroke={c} strokeWidth="1.2" opacity="0.55" />
        <path
          d="M70 42 C78 54 86 62 70 70 C54 62 62 54 70 42 Z"
          fill={cSoft}
          opacity="0.75"
        />
        <path
          d="M70 98 C62 86 54 78 70 70 C86 78 78 86 70 98 Z"
          fill={cSoft}
          opacity="0.75"
        />
        <path
          d="M42 70 C54 62 62 54 70 70 C62 86 54 78 42 70 Z"
          fill={c}
          opacity="0.45"
        />
        <path
          d="M98 70 C86 78 78 86 70 70 C78 54 86 62 98 70 Z"
          fill={c}
          opacity="0.45"
        />
        <line
          x1="38"
          y1="38"
          x2="102"
          y2="102"
          stroke={c}
          strokeWidth="0.8"
          opacity="0.4"
        />
        <line
          x1="102"
          y1="38"
          x2="38"
          y2="102"
          stroke={c}
          strokeWidth="0.8"
          opacity="0.4"
        />
      </svg>

      <svg
        className="sparkle-decor__item sparkle-decor__item--mr"
        viewBox="0 0 90 90"
        fill="none"
      >
        <circle cx="45" cy="45" r="26" stroke={cSoft} strokeWidth="1" opacity="0.5" />
        <path
          d="M45 28 L48 42 L60 45 L48 48 L45 62 L42 48 L30 45 L42 42 Z"
          fill={c}
          opacity="0.55"
        />
      </svg>

      {/* Rodapé */}
      <svg
        className="sparkle-decor__item sparkle-decor__item--bl"
        viewBox="0 0 200 120"
        fill="none"
      >
        <defs>
          <radialGradient id="sd-orb" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.5" />
            <stop offset="55%" stopColor={cSoft} stopOpacity="0.4" />
            <stop offset="100%" stopColor={c} stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="56" cy="62" r="38" fill="url(#sd-orb)" />
        <circle cx="98" cy="78" r="30" fill="url(#sd-orb)" opacity="0.9" />
        <circle cx="132" cy="58" r="24" fill="url(#sd-orb)" opacity="0.8" />
        <path
          d="M48 42 L49.5 46.5 L54 48 L49.5 49.5 L48 54 L46.5 49.5 L42 48 L46.5 46.5 Z"
          fill="#fff"
          opacity="0.65"
        />
        <path
          d="M118 48 L119.2 51.5 L123 52.8 L119.2 54 L118 57.5 L116.8 54 L113 52.8 L116.8 51.5 Z"
          fill={c}
          opacity="0.7"
        />
      </svg>

      <svg
        className="sparkle-decor__item sparkle-decor__item--br"
        viewBox="0 0 130 110"
        fill="none"
      >
        <path
          d="M64 12 L70 42 L98 48 L70 54 L64 84 L58 54 L30 48 L58 42 Z"
          stroke={c}
          strokeWidth="1.4"
          fill={cSoft}
          fillOpacity="0.35"
        />
        <path
          d="M64 28 L67 42 L80 45 L67 48 L64 62 L61 48 L48 45 L61 42 Z"
          fill="#fff8f5"
          opacity="0.55"
        />
        <path
          d="M102 72 L104 78 L110 80 L104 82 L102 88 L100 82 L94 80 L100 78 Z"
          fill={c}
          opacity="0.7"
        />
      </svg>
    </div>
  );
}
