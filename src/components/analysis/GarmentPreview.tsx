import { GARMENT_SHAPES, GARMENT_VIEWBOX } from "../../../data/wardrobe/shapes";
import type { GarmentKind } from "../../../data/wardrobe/garments";
import { photoTintForKind } from "@/lib/wardrobe/photo-tint";

type Props = {
  kind: GarmentKind;
  hex: string;
  label: string;
  photoUrl?: string;
};

export function GarmentPreview({ kind, hex, label, photoUrl }: Props) {
  const alt = `${label} na cor ${hex}`;

  if (photoUrl) {
    const tint = photoTintForKind(kind, hex);
    return (
      <span className="ar-garment-frame">
        <span className="ar-garment-frame__photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="ar-garment" src={photoUrl} alt={alt} />
          {tint.apply ? (
            <>
              {tint.multiplyOpacity > 0.04 ? (
                <span
                  className="ar-garment-frame__tint ar-garment-frame__tint--multiply"
                  style={{ background: hex, opacity: tint.multiplyOpacity }}
                />
              ) : null}
              <span
                className="ar-garment-frame__tint ar-garment-frame__tint--color"
                style={{ background: hex }}
              />
            </>
          ) : null}
        </span>
        <span className="ar-garment-frame__swatch" style={{ background: hex }} />
      </span>
    );
  }

  const shape = GARMENT_SHAPES[kind];
  return (
    <svg className="ar-garment ar-garment--svg" viewBox={GARMENT_VIEWBOX} role="img" aria-label={alt}>
      <path
        d={shape.body}
        fill={hex}
        stroke="rgba(26,18,8,0.22)"
        strokeWidth="1.2"
      />
      {shape.details ? (
        <path
          d={shape.details}
          fill="none"
          stroke="rgba(26,18,8,0.28)"
          strokeWidth="1.1"
        />
      ) : null}
    </svg>
  );
}
