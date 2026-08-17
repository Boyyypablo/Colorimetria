"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import {
  LANDING_IMAGES,
  LANDING_IMAGE_QUALITY,
  LANDING_SEASON_SWATCHES,
} from "@/lib/landing-images";
import { LandingServiceCard } from "@/components/landing/LandingServiceCard";
import { GlowingLogo } from "@/components/GlowingLogo";

type Props = {
  loggedIn: boolean;
  signOutSlot?: ReactNode;
};

const NAV = [
  { href: "#servicos", label: "Serviços" },
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#sobre", label: "Sobre" },
  { href: "#comecar", label: "Começar" },
] as const;

const SERVICES = [
  {
    num: "01",
    title: "Colorimetria",
    sub: "Análise de cor pessoal",
    desc: "Identificação da sua cartela entre as 12 estações com base no subtom de pele, olhos e cabelo — cores que realçam sua beleza natural.",
    img: LANDING_IMAGES.serviceColor,
    alt: "Cartela de maquiagem para análise de cor",
  },
  {
    num: "02",
    title: "Maquiagem",
    sub: "Paisagismo da face",
    desc: "Sugestões alinhadas à sua cartela e intenção: do dia a dia ao look mais marcado, valorizando os traços que você quer exaltar.",
    img: LANDING_IMAGES.serviceMakeup,
    alt: "Maquiagem editorial feminina",
  },
  {
    num: "03",
    title: "Plano personalizado",
    sub: "Harmonia da imagem",
    desc: "Um plano prático do que suavizar, manter ou valorizar — com recomendações de cores para pele, roupa e maquiagem.",
    img: LANDING_IMAGES.serviceVisual,
    alt: "Styling e paisagismo visual",
  },
  {
    num: "04",
    title: "Moda",
    sub: "Guarda-roupa intencional",
    desc: "Peças e tons que conversam entre si, refletem sua personalidade e vestem bem o seu contraste real — filtrados para o seu contexto.",
    img: LANDING_IMAGES.serviceFashion,
    alt: "Guarda-roupa colorido e organizado",
  },
] as const;

const STEPS = [
  {
    n: "01",
    title: "Sua intenção",
    desc: "Conte o que quer trabalhar — olhar, olheiras, guarda-roupa — para a consultora priorizar o que importa agora.",
  },
  {
    n: "02",
    title: "Análise da foto",
    desc: "Envie uma foto em luz natural, sem maquiagem pesada. Medimos subtom, contraste e traços relevantes.",
  },
  {
    n: "03",
    title: "Sua cartela",
    desc: "A estação, os eixos (temperatura, valor, croma, contraste) e o porquê — com revisão se a foto não der evidência.",
  },
  {
    n: "04",
    title: "Aplicação prática",
    desc: "Plano de mudanças e cuidados com a pele quando você pedir. Sem simulação gerada por IA no lançamento.",
  },
] as const;

const STRIPS = [
  { img: LANDING_IMAGES.stripMakeup, label: "Maquiagem" },
  { img: LANDING_IMAGES.stripFashion, label: "Moda" },
  { img: LANDING_IMAGES.stripColor, label: "Colorimetria" },
] as const;

export function LandingHome({ loggedIn, signOutSlot }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const primaryHref = loggedIn ? "/analyze" : "/register";
  const primaryLabel = loggedIn ? "Nova análise" : "Começar análise";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <div className="landing">
      <nav
        className={`lp-nav${scrolled ? " lp-nav--scrolled" : ""}`}
        aria-label="Principal"
      >
        <Link href="/" className="lp-nav-brand">
          <GlowingLogo size="sm" bg="light" />
        </Link>

        <div className="lp-nav-desktop">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="lp-nav-link">
              {item.label}
            </a>
          ))}
          {loggedIn ? (
            <Link href="/dashboard" className="lp-nav-link">
              Minhas análises
            </Link>
          ) : (
            <Link href="/login" className="lp-nav-link">
              Entrar
            </Link>
          )}
          {loggedIn ? signOutSlot : null}
          <Link href={primaryHref} className="lp-btn lp-btn--terracotta">
            {loggedIn ? "Analisar" : "Começar"}
          </Link>
        </div>

        <button
          type="button"
          className="lp-nav-burger"
          aria-expanded={menuOpen}
          aria-controls="lp-mobile-menu"
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span className="sr-only">{menuOpen ? "Fechar menu" : "Abrir menu"}</span>
          <span aria-hidden className={menuOpen ? "lp-burger-x" : "lp-burger"}>
            {menuOpen ? "✕" : "☰"}
          </span>
        </button>
      </nav>

      {menuOpen ? (
        <div id="lp-mobile-menu" className="lp-mobile-menu">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="lp-mobile-menu__link"
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </a>
          ))}
          {loggedIn ? (
            <Link
              href="/dashboard"
              className="lp-mobile-menu__link"
              onClick={() => setMenuOpen(false)}
            >
              Minhas análises
            </Link>
          ) : (
            <Link
              href="/login"
              className="lp-mobile-menu__link"
              onClick={() => setMenuOpen(false)}
            >
              Entrar
            </Link>
          )}
          {loggedIn ? signOutSlot : null}
          <Link
            href={primaryHref}
            className="lp-btn lp-btn--terracotta mt-2 w-full text-center"
            onClick={() => setMenuOpen(false)}
          >
            {primaryLabel}
          </Link>
        </div>
      ) : null}

      {/* Hero */}
      <section className="lp-hero">
        <div className="lp-hero__copy">
          <p className="lp-eyebrow">Consultoria em colorimetria & imagem</p>
          <h1 className="lp-hero__title font-display">
            A cor certa
            <br />
            <em className="text-[var(--lp-terracotta)]">revela</em> quem
            <br />
            você já é.
          </h1>
          <p className="lp-hero__lead">
            Descubra sua cartela de cores, transforme maquiagem e guarda-roupa —
            e apareça no mundo com intenção e beleza.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href={primaryHref} className="lp-btn lp-btn--espresso">
              {primaryLabel}
            </Link>
            <a href="#servicos" className="lp-btn lp-btn--outline">
              Ver serviços
            </a>
          </div>
          <div className="lp-swatches">
            <span className="lp-swatches__label">Estações</span>
            {LANDING_SEASON_SWATCHES.map((c) => (
              <span
                key={c}
                className="lp-swatch"
                style={{ backgroundColor: c }}
                aria-hidden
              />
            ))}
          </div>
        </div>

        <div className="lp-hero__media">
          <Image
            src={LANDING_IMAGES.hero}
            alt="Mulher com análise de cores editorial"
            fill
            priority
            quality={LANDING_IMAGE_QUALITY}
            className="object-cover"
            sizes="(max-width: 900px) 100vw, 50vw"
          />
          <div className="lp-hero__fade" aria-hidden />
          <div className="lp-hero__tag">
            <p className="lp-eyebrow !mb-1">Sua paleta</p>
            <p className="font-display text-[1.1rem] font-normal">
              Outono Profundo
            </p>
          </div>
        </div>
      </section>

      {/* Manifesto */}
      <section className="lp-manifesto">
        <blockquote className="font-display">
          &ldquo;Colorimetria não é sobre seguir tendências — é sobre encontrar
          a harmonia entre quem você é e como o mundo te vê.&rdquo;
        </blockquote>
        <p className="lp-manifesto__by">Consultora de imagem</p>
      </section>

      {/* Services */}
      <section id="servicos" className="lp-section scroll-mt-24">
        <div className="lp-section__inner">
          <div className="lp-section__head">
            <div>
              <p className="lp-eyebrow">O que ofereço</p>
              <h2 className="lp-h2 font-display">
                Serviços de
                <br />
                <em>transformação</em>
              </h2>
            </div>
            <p className="lp-section__aside">
              Cada serviço é pensado para revelar sua beleza natural e criar uma
              imagem coerente com sua essência.
            </p>
          </div>
          <div className="lp-services-grid">
            {SERVICES.map((s) => (
              <LandingServiceCard key={s.num} {...s} />
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="lp-section lp-section--linen scroll-mt-24">
        <div className="lp-section__inner max-w-[1100px]">
          <p className="lp-eyebrow">O processo</p>
          <h2 className="lp-h2 font-display mb-16">
            Como funciona
            <br />
            <em>sua análise</em>
          </h2>
          <div className="lp-steps">
            {STEPS.map((step, i) => (
              <div
                key={step.n}
                className={`lp-step${i === 0 ? " lp-step--first" : ""}`}
              >
                <p className="lp-step__n font-display">{step.n}</p>
                <h3 className="font-display mb-4 text-[1.2rem] font-normal">
                  {step.title}
                </h3>
                <p className="text-[0.9rem] font-light leading-relaxed text-[#6A5A4A]">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section id="sobre" className="lp-section scroll-mt-24">
        <div className="lp-about">
          <div className="lp-about__media">
            <div className="lp-about__blob" aria-hidden />
            <div className="lp-about__img">
              <Image
                src={LANDING_IMAGES.about}
                alt="Consultora de imagem trabalhando com guarda-roupa"
                fill
                quality={LANDING_IMAGE_QUALITY}
                className="object-cover"
                sizes="(max-width: 900px) 100vw, 42vw"
              />
            </div>
          </div>
          <div>
            <p className="lp-eyebrow">A consultora</p>
            <h2 className="lp-h2 font-display mb-8">
              A
              <br />
              <em className="text-[var(--lp-terracotta)]">Consultora</em>
            </h2>
            <p className="lp-prose mb-6">
              Análise sazonal por imagem, recomendações e simulação visual —
              na interseção entre a ciência das cores e a arte de se apresentar.
              Cada pessoa tem uma linguagem visual única esperando para ser
              descoberta.
            </p>
            <p className="lp-prose mb-10">
              Envie uma foto, conte o que quer trabalhar e receba um plano
              personalizado: cartela, cores e mudanças práticas — sem pressa e
              sem padrões impostos.
            </p>
            <div className="lp-stats">
              {[
                ["12", "estações de cor"],
                ["1 foto", "para começar"],
                ["LGPD", "dados privados"],
              ].map(([n, l]) => (
                <div key={l}>
                  <p className="font-display text-[1.8rem] font-normal text-[var(--lp-terracotta)]">
                    {n}
                  </p>
                  <p className="text-[0.78rem] uppercase tracking-[0.08em] text-[#8A7A6A]">
                    {l}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="lp-testimonial">
        <p className="lp-eyebrow !text-[rgba(250,247,240,0.65)]">Depoimento</p>
        <blockquote className="font-display">
          &ldquo;Eu nunca soube por que certas roupas me &lsquo;apagavam&rsquo;.
          A análise revelou minha cartela de Outono Suave e tudo fez sentido —
          eu finalmente parecia eu mesma.&rdquo;
        </blockquote>
        <p className="mt-8 text-[0.85rem] tracking-[0.08em] text-[rgba(250,247,240,0.75)]">
          Juliana M. · São Paulo
        </p>
        <div
          className="mt-4 flex justify-center gap-1 text-[var(--lp-blush)]"
          aria-label="5 estrelas"
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i}>★</span>
          ))}
        </div>
      </section>

      {/* Visual strip */}
      <section className="lp-strip" aria-label="Looks">
        {STRIPS.map(({ img, label }) => (
          <div key={label} className="lp-strip__item group">
            <Image
              src={img}
              alt={label}
              fill
              quality={LANDING_IMAGE_QUALITY}
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
            <div className="lp-strip__veil" aria-hidden />
            <p className="lp-strip__label font-display">{label}</p>
          </div>
        ))}
      </section>

      {/* CTA */}
      <section id="comecar" className="lp-cta scroll-mt-24">
        <p className="lp-eyebrow !text-[var(--lp-blush)]">Pronta para começar?</p>
        <h2 className="font-display mb-8 text-[clamp(2.2rem,4vw,3.5rem)] font-light leading-[1.1] text-[var(--lp-cream)]">
          Vamos descobrir juntas
          <br />
          <em className="text-[var(--lp-blush)]">a sua paleta.</em>
        </h2>
        <p className="mx-auto mb-12 max-w-[500px] text-base font-light leading-relaxed text-[rgba(250,247,240,0.65)]">
          Uma foto. Sua estação. Cores que fazem sentido em você — com um plano
          personalizado para o dia a dia.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link href={primaryHref} className="lp-btn lp-btn--terracotta lp-btn--lg">
            {primaryLabel}
          </Link>
          {!loggedIn ? (
            <Link href="/login" className="lp-btn lp-btn--ghost-light lp-btn--lg">
              Já tenho conta
            </Link>
          ) : (
            <Link
              href="/dashboard"
              className="lp-btn lp-btn--ghost-light lp-btn--lg"
            >
              Minhas análises
            </Link>
          )}
        </div>
        <div className="lp-cta__meta">
          <p>Análise online</p>
          <p>Foto privada · LGPD</p>
          <p>12 estações</p>
        </div>
      </section>

      <footer className="lp-footer">
        <GlowingLogo size="md" bg="dark" />
        <p className="text-[0.75rem] tracking-[0.08em] text-[rgba(250,247,240,0.25)]">
          © {new Date().getFullYear()} · Glowing · Dados tratados conforme a
          LGPD
        </p>
      </footer>
    </div>
  );
}
