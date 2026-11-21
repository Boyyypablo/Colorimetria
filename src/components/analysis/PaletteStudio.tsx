"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Check, Copy, RefreshCw, Sparkles, Ban } from "lucide-react";

type PaletteSwatch = {
  hex: string;
  why: string;
};

type Props = {
  photoUrl: string;
  seasonName: string | null;
  useColors: PaletteSwatch[];
  avoidColors: string[];
};

export function PaletteStudio({
  photoUrl,
  seasonName,
  useColors,
  avoidColors,
}: Props) {
  const [selected, setSelected] = useState<{
    hex: string;
    kind: "use" | "avoid";
    why: string;
    index: number;
  }>(() => ({
    hex: useColors[0]?.hex || "#b8603a",
    kind: "use",
    why:
      useColors[0]?.why ||
      "Harmoniza com seu subtom natural e ilumina o rosto.",
    index: 0,
  }));
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  function selectUse(index: number) {
    const item = useColors[index];
    if (!item) return;
    setSelected({
      hex: item.hex,
      kind: "use",
      why: item.why || "Harmoniza com seu subtom natural e ilumina o rosto.",
      index,
    });
  }

  function selectAvoid(index: number) {
    const hex = avoidColors[index];
    if (!hex) return;
    setSelected({
      hex,
      kind: "avoid",
      why: "Tende a pesar ou apagar seu contraste perto do rosto — prefira em acessórios ou longe do colo.",
      index,
    });
  }

  function cycleNextColor() {
    if (useColors.length === 0) return;
    const nextIdx =
      selected.kind === "use" ? (selected.index + 1) % useColors.length : 0;
    selectUse(nextIdx);
  }

  async function copyHex(hex: string) {
    try {
      await navigator.clipboard.writeText(hex);
      setCopiedHex(hex);
      window.setTimeout(() => {
        setCopiedHex((cur) => (cur === hex ? null : cur));
      }, 1800);
    } catch {
      /* clipboard indisponível */
    }
  }

  return (
    <div className="ar-palette">
      {/* Espelho interativo de teste perto do rosto */}
      <div
        className="ar-drape"
        style={{ ["--drape" as string]: selected.hex }}
      >
        <div className="ar-drape__stage">
          <div className="ar-drape__aura" aria-hidden />
          <motion.div
            key={selected.hex}
            className="ar-drape__frame"
            initial={{ scale: 0.96, opacity: 0.85 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrl}
              alt="Teste da cor perto do seu rosto"
              className="ar-drape__photo"
            />
            <div className="ar-drape__collar" aria-hidden />
          </motion.div>
        </div>

        <div className="ar-drape__info">
          <span
            className={`ar-drape__pill ${
              selected.kind === "use"
                ? "ar-drape__pill--use"
                : "ar-drape__pill--avoid"
            }`}
          >
            {selected.kind === "use" ? (
              <>
                <Sparkles size={13} aria-hidden /> Na sua paleta
                {seasonName ? ` · ${seasonName}` : ""}
              </>
            ) : (
              <>
                <Ban size={13} aria-hidden /> Melhor longe do rosto
              </>
            )}
          </span>

          <div className="ar-drape__hex-row">
            <span
              className="ar-drape__dot"
              style={{ background: selected.hex }}
              aria-hidden
            />
            <h3 className="ar-drape__hex">{selected.hex}</h3>
          </div>

          <p className="ar-drape__why">{selected.why}</p>

          <p className="ar-drape__tip">
            Toque em qualquer cor abaixo — inclusive nas cores para evitar —
            para comparar como ela reage perto do seu rosto.
          </p>

          <div className="ar-drape__actions">
            <button
              type="button"
              className="ar-drape__btn ar-drape__btn--primary"
              onClick={cycleNextColor}
            >
              <RefreshCw size={15} aria-hidden />
              Testar próxima cor
            </button>
            <button
              type="button"
              className="ar-drape__btn ar-drape__btn--ghost"
              onClick={() => void copyHex(selected.hex)}
            >
              {copiedHex === selected.hex ? (
                <>
                  <Check size={15} aria-hidden /> Copiado!
                </>
              ) : (
                <>
                  <Copy size={15} aria-hidden /> Copiar {selected.hex}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Cores para usar */}
      <div className="ar-palette-group">
        <div className="ar-palette-group__head">
          <p className="ar-subhead">Cores para usar</p>
          <span className="ar-palette-group__hint">
            Clique em um cartão para provar no espelho
          </span>
        </div>

        <div className="ar-swatch-deck" role="group" aria-label="Cores para usar">
          {useColors.map((c, i) => {
            const isSelected =
              selected.kind === "use" && selected.hex === c.hex;
            return (
              <motion.button
                key={c.hex}
                type="button"
                whileHover={{ y: -5 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 380, damping: 24 }}
                onClick={() => selectUse(i)}
                className={`ar-swatch-tile${isSelected ? " ar-swatch-tile--on" : ""}`}
                style={{ ["--swatch" as string]: c.hex }}
                aria-pressed={isSelected}
              >
                <div className="ar-swatch-tile__chip" aria-hidden>
                  <span className="ar-swatch-tile__rank">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {isSelected ? (
                    <span className="ar-swatch-tile__active-tag">
                      No espelho
                    </span>
                  ) : null}
                </div>
                <div className="ar-swatch-tile__meta">
                  <p className="ar-swatch-tile__hex">{c.hex}</p>
                  {c.why ? (
                    <p className="ar-swatch-tile__why">{c.why}</p>
                  ) : null}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Cores para evitar */}
      {avoidColors.length > 0 && (
        <div className="ar-palette-avoid">
          <div className="ar-palette-group__head">
            <p className="ar-subhead">Cores para evitar</p>
            <span className="ar-palette-group__hint">
              Toque para comparar o contraste no espelho
            </span>
          </div>
          <div className="ar-avoid-deck" role="group" aria-label="Cores para evitar">
            {avoidColors.map((hex, i) => {
              const isSelected =
                selected.kind === "avoid" && selected.hex === hex;
              return (
                <motion.button
                  key={hex}
                  type="button"
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => selectAvoid(i)}
                  className={`ar-avoid-pill${isSelected ? " ar-avoid-pill--on" : ""}`}
                  aria-pressed={isSelected}
                >
                  <span
                    className="ar-avoid-pill__chip"
                    style={{ background: hex }}
                    aria-hidden
                  />
                  <span className="ar-avoid-pill__copy">
                    <span className="ar-avoid-pill__hex">{hex}</span>
                    <span className="ar-avoid-pill__hint">
                      {isSelected ? "Testando no espelho" : "Longe do rosto"}
                    </span>
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
