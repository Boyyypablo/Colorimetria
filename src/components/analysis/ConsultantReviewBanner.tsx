"use client";

import Image from "next/image";
import { RequestReviewButton } from "@/components/ReviewActions";
import { LANDING_IMAGES, LANDING_IMAGE_QUALITY } from "@/lib/landing-images";

type Props = {
  analysisId: string;
  seasonName?: string | null;
  canRequestReview: boolean;
  alreadyInReview: boolean;
  hasConsultantNote: boolean;
};

const PHOTOS = [
  {
    src: LANDING_IMAGES.consultPortrait,
    alt: "Retrato editorial com luz natural",
    className: "ar-review-banner__shot ar-review-banner__shot--portrait",
  },
  {
    src: LANDING_IMAGES.consultMakeup,
    alt: "Maquiagem e cores em close",
    className: "ar-review-banner__shot ar-review-banner__shot--makeup",
  },
  {
    src: LANDING_IMAGES.consultColor,
    alt: "Consultoria de beleza",
    className: "ar-review-banner__shot ar-review-banner__shot--color",
  },
] as const;

export function ConsultantReviewBanner({
  analysisId,
  seasonName,
  canRequestReview,
  alreadyInReview,
  hasConsultantNote,
}: Props) {
  const seasonBit = seasonName ? ` de ${seasonName}` : "";
  const lead = hasConsultantNote
    ? `Quer ir além das notas da sua paleta${seasonBit}? Fale com uma consultora especialista — outro olhar sobre foto, estação e o que usar no dia a dia.`
    : `Quer perguntar sobre algo da sua paleta${seasonBit}? Entre em contato com uma das nossas consultoras especialistas no assunto.`;

  return (
    <section
      id="consultora"
      className="ar-review-banner"
      aria-labelledby="review-banner-heading"
    >
      <div className="ar-review-banner__mosaic" aria-hidden={false}>
        {PHOTOS.map((photo) => (
          <div key={photo.alt} className={photo.className}>
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              quality={LANDING_IMAGE_QUALITY}
              className="object-cover"
              sizes="(max-width: 860px) 100vw, 280px"
            />
          </div>
        ))}
      </div>
      <div className="ar-review-banner__copy">
        <p className="ar-review-banner__eyebrow">Revisão humana</p>
        <h2 id="review-banner-heading" className="ar-review-banner__title">
          Fale com uma consultora
        </h2>
        <p className="ar-review-banner__lead">{lead}</p>
        {!hasConsultantNote ? (
          <p className="ar-review-banner__price">Revisão humana · R$&nbsp;129</p>
        ) : null}
        {alreadyInReview ? (
          <p className="ar-review-banner__status">Seu pedido já está na fila.</p>
        ) : null}
        {canRequestReview ? (
          <div className="ar-review-banner__cta">
            <RequestReviewButton analysisId={analysisId} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
