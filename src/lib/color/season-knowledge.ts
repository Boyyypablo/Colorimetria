import { SEASON_PACKS, type SeasonPack } from "./season-packs";
import type { SeasonDefinition, Temperature } from "./types";

export type ContrastBand = "low" | "medium" | "high";

/** Limiares alinhados ao preditor de regras (contraste pele×cabelo/olhos). */
export function contrastBandFromScore(score: number): ContrastBand {
  if (score >= 28) return "high";
  if (score <= 14) return "low";
  return "medium";
}

export function contrastBandLabel(band: ContrastBand): string {
  if (band === "high") return "alto";
  if (band === "low") return "baixo";
  return "médio";
}

/**
 * Cartelas irmãs: mesma característica dominante (brilho/suavidade/profundidade),
 * temperatura oposta — material coloração pessoal (ex.: Inverno Brilhante ↔ Primavera Brilhante).
 */
export const SISTER_SEASONS: Record<string, string> = {
  bright_winter: "bright_spring",
  bright_spring: "bright_winter",
  soft_autumn: "soft_summer",
  soft_summer: "soft_autumn",
  deep_autumn: "deep_winter",
  deep_winter: "deep_autumn",
  light_spring: "light_summer",
  light_summer: "light_spring",
  true_spring: "true_winter",
  true_winter: "true_spring",
  true_autumn: "true_summer",
  true_summer: "true_autumn",
};

export type SeasonCoaching = {
  sisterSeasonId: string | null;
  sisterNamePt: string | null;
  sisterNote: string | null;
  styleTips: string[];
  makeupTips: string[];
  hairTips: string[];
  avoidNotes: string[];
  offPaletteTips: string[];
  contrastTip: string | null;
  /** Fundamentos capilares (quente/frio) — material Vanessa Cardozo. */
  colorimetryHairNotes: string[];
  /**
   * Quando há preocupação com manchas/olheiras/espinhas:
   * cores que destacam sobrancelha e cabelo redirecionam o olhar.
   */
  attentionRedirectTips: string[];
};

const OFF_PALETTE_GENERIC = [
  "A cartela não anula o guarda-roupa: o que está fora dela só pede mais distância do rosto.",
  "Calça, saia, sapato e bolsa são os melhores lugares para uma cor que você gosta e não está na paleta.",
  "Se a cor de fora aparecer na gola ou no decote, coloque um item da cartela no meio (lenço, brinco, blazer) — isso 'fecha' o look.",
  "A combinação mais cansativa perto da pele é temperatura oposta + cor muito viva: deixe essa peça na barra, não na blusa.",
  "Cores da cartela irmã podem entrar pontualmente; o que encosta no rosto continua sendo da paleta medida.",
];

const PALETTE_USAGE_STYLE = [
  "Perto do rosto, priorize peças da sua cartela (blusa, lenço, brinco).",
  "Você não precisa usar todas as cores da paleta — escolha as que combinam com seu estilo.",
];

/** Óculos por contraste (material Inverno Brilhante; aplicável a cartelas frias/escuras). */
function glassesTip(band: ContrastBand, temperature: Temperature): string {
  if (band === "high") {
    return temperature === "cool"
      ? "Óculos: armações intensas (violeta, cerceta, verde vivo) valorizam contraste alto."
      : "Óculos: armações vivas e saturadas combinam com seu contraste alto.";
  }
  if (band === "low") {
    return temperature === "cool"
      ? "Óculos: em contraste baixo, prefira neutros (grafite, vinho, café, azul-marinho) ou tons claros suaves se a pele for clara."
      : "Óculos: contraste baixo pede armações mais suaves e próximas ao tom da pele/cabelo.";
  }
  return "Óculos: café, vinho, grafite e azul-marinho costumam equilibrar contraste médio.";
}

function hairNotesForTemperature(temperature: Temperature): string[] {
  if (temperature === "cool") {
    return [
      "Para neutralizar dourado/amarelo no fio, use violeta (complementar) — cinza sozinho pode gerar mate/opacidade.",
      "Cores frias (cinza, violeta, mate) aumentam profundidade: o cabelo parece um pouco mais escuro.",
      "Um toque de dourado na receita pode devolver brilho mesmo em resultado frio — não confunda dourado (brilho) com fundo amarelo indesejado.",
      "Na cartela: prefira marrons frios/rosados; evite acobreados quentes se a meta for harmonia fria.",
    ];
  }
  return [
    "Cores quentes (dourado, cobre, vermelho) vibram e refletem mais brilho no fio.",
    "Fundo acobreado pode ser aliado em mechas quentes — nem sempre precisa neutralizar por completo.",
    "Complementares: cobre × cinza, vermelho × mate, dourado × violeta — use para suavizar ou intensificar com intenção.",
    "Misture com base na altura de tom desejada; resultado = pigmento + fundo de clareamento (+ residual, se houver).",
  ];
}

function defaultPack(season: SeasonDefinition): SeasonPack {
  const warm = season.temperature === "warm";
  return {
    styleTips: warm
      ? [
          "Prefira metais dourados e acabamentos que aquecem o rosto.",
          "Tons terrosos, coral e verdes com base amarela costumam valorizar.",
        ]
      : [
          "Prefira metais prateados/platinados e tons rosados/azulados.",
          "Pretos azulados e brancos limpos costumam funcionar melhor que branco amarelado.",
        ],
    makeupTips: warm
      ? [
          "Blush pêssego/coral; contorno quente suave; evite cinza frio no rosto.",
        ]
      : [
          "Blush rosado; contorno frio; evite bronze acobreado forte se a meta for frio.",
        ],
    hairTips: warm
      ? [
          "Dourado e cobre com intenção trazem brilho; fundo de clareamento amarelo/laranja pode ser aliado.",
        ]
      : [
          "Neutralize dourado indesejado com violeta; cuidado com cinza puro (risco de mate).",
        ],
    avoidNotes: warm
      ? ["Evite cinzas frios e magenta gelado perto do rosto."]
      : ["Evite camel, mostarda e cobre queimado perto do rosto."],
    sisterNote: (s) => `Cartela irmã: ${s} — mesma família de valor/croma, temperatura oposta.`,
  };
}

/**
 * Orientações práticas a partir do material de coloração pessoal + colorimetria capilar.
 */
export function buildSeasonCoaching(
  season: SeasonDefinition,
  opts?: {
    contrastScore?: number;
    getSeasonName?: (id: string) => string | undefined;
  },
): SeasonCoaching {
  const band =
    opts?.contrastScore != null
      ? contrastBandFromScore(opts.contrastScore)
      : "medium";
  const pack = SEASON_PACKS[season.id] ?? defaultPack(season);
  const sisterId = SISTER_SEASONS[season.id] ?? null;
  const sisterName = sisterId
    ? opts?.getSeasonName?.(sisterId) ?? sisterId
    : null;

  return {
    sisterSeasonId: sisterId,
    sisterNamePt: sisterName,
    sisterNote: sisterId && sisterName ? pack.sisterNote(sisterName) : null,
    styleTips: [...pack.styleTips, ...PALETTE_USAGE_STYLE, glassesTip(band, season.temperature)],
    makeupTips: pack.makeupTips,
    hairTips: pack.hairTips,
    avoidNotes: pack.avoidNotes,
    offPaletteTips: OFF_PALETTE_GENERIC,
    contrastTip: `Seu contraste medido está ${contrastBandLabel(band)} — use isso para escolher armações, mechas e o quanto de contraste nas roupas perto do rosto.`,
    colorimetryHairNotes: hairNotesForTemperature(season.temperature),
    attentionRedirectTips: [
      "Defina bem as sobrancelhas com cor da sua cartela — o olhar sobe e manchas/olheiras/espinhas ganham menos destaque.",
      "Cabelo com brilho, contraste ou acessório perto do rosto puxa a atenção para cima.",
      "Brincos e óculos alinhados à paleta reforçam esse desvio de foco (sem precisar cobrir tudo com maquiagem).",
    ],
  };
}
