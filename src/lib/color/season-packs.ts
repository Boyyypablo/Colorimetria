import type { SeasonDefinition } from "./types";

export type SeasonPack = {
  styleTips: string[];
  makeupTips: string[];
  hairTips: string[];
  avoidNotes: string[];
  sisterNote: (sisterName: string) => string;
};

/** Coaching fino das 12 estações — paráfrase nossa, não aula literal. */
export const SEASON_PACKS: Record<string, SeasonPack> = {
  bright_winter: {
    styleTips: [
      "Característica principal: brilho — branco óptico e preto bem brilhoso (não branco amarelado apagado).",
      "Tecidos com reflexo (cetim e similares) valorizam a cartela.",
      "Estampas: vibrantes, frias e escuras; evite fundo suave e quente.",
      "Jeans: escolha azuis da sua paleta, não um azul genérico.",
      "Metais: pode misturar ouro, ouro branco, prata e platina — priorize acabamento polido/brilhante.",
      "Dourado em joias funciona bem; em roupa perto do rosto o dourado quente destaca demais.",
    ],
    makeupTips: [
      "Aposte em brilho (glossy) — faz parte da sua característica brilhante.",
      "Contorno em neutros frios; blush rosado ou arroxeado.",
      "Sombras neutras: marrons frios (evite cobre); coloridos e vibrantes também funcionam.",
      "Batons vivos da cartela + gloss reforçam o contraste natural.",
      "Base: marrons frios/rosados; pode oscilar entre oliva, neutra ou levemente rosada.",
    ],
    hairTips: [
      "Marrons neutros frios; ruivos aconselhados em marsala e frios.",
      "Morena iluminada/loira: tons neutros (bege/creme), preservar a raiz; mechas marcadas com brilho — não excessivamente esfumadas.",
      "Harmonia: ±2 tons da cor natural; iluminada até cerca de −4 tons.",
      "Fantasia: azul-marinho, rosa frio, marsala, roxo, verde neon — sempre com brilho, inspirados na paleta.",
    ],
    avoidNotes: [
      "Evite tons extremamente quentes e claros demais perto do rosto.",
      "Outono Suave costuma desvalorizar: muita suavidade + calor.",
    ],
    sisterNote: (s) =>
      `Cartela irmã: ${s} — mesmo brilho; ela é clara e quente, você é escura e fria. Pode “roubar” cores escuras/saturadas dela, sem substituir a sua paleta.`,
  },
  bright_spring: {
    styleTips: [
      "Característica principal: brilho quente — cores vivas, claras e saturadas.",
      "Branco limpo e pigmentos dourados, coral e turquesa funcionam perto do rosto.",
      "Tecidos com reflexo e estampas alegres combinam; mate pesado apaga.",
      "Metais dourados polidos; prata fria opaca compete com o calor da pele.",
      "Jeans: azuis limpos ou com base verde-água, não grafite apagado.",
    ],
    makeupTips: [
      "Batons coral e vermelho quente; gloss reforça o brilho da cartela.",
      "Sombras douradas, verdes vivos e pêssego — evite cinza frio no olho.",
      "Blush pêssego/coral; contorno quente suave, nunca cinza.",
      "Base com viés dourado/claro alinhado ao valor alto.",
    ],
    hairTips: [
      "Loiros e mel quentes; cobre e dourado com intenção (brilho).",
      "Evite cinza excessivo e platinado gelado que apaguem a vivacidade.",
      "Mechas marcadas (±2 a −4 tons) em vez de esfumado cinza.",
    ],
    avoidNotes: [
      "Evite paletas frias profundas e suaves demais (inverno opaco, outono suave).",
      "Preto morto e camel opaco perto do rosto tiram o brilho.",
    ],
    sisterNote: (s) =>
      `Cartela irmã: ${s} — mesmo brilho; ela é fria e escura. Cores intensas frias dela podem funcionar pontualmente.`,
  },
  true_spring: {
    styleTips: [
      "Quente verdadeiro: base amarela nítida, claridade média, cores alegres.",
      "Pêssego, terracota clara, verde-água e mostarda viva perto do rosto.",
      "Metais dourados e bronze; evite prata fria e grafite.",
      "Estampas com fundo claro-quente; jeans em azul com calor, não indigo gelado.",
      "Acabamento acetinado ou com um pouco de brilho — mate extremo esfria.",
    ],
    makeupTips: [
      "Batom pêssego rosado ou vermelho tomate; evite magenta gelado.",
      "Sombras cobre e azul com base quente; blush coral.",
      "Contorno em marrom dourado suave, não cinza.",
      "Base mel / dourada média — porcelana rosa fria destoa.",
    ],
    hairTips: [
      "Castanho dourado, mel e cobre; loiro com fundo amarelo controlado.",
      "Evite cinza, violeta residual e preto azulado no fio.",
      "Iluminada quente junto da raiz; não abrir demais para platina fria.",
    ],
    avoidNotes: [
      "Roxo gelado, cinza-rosa e pretos azulados cansam o traço.",
      "A irmã fria (Inverno Verdadeiro) só entra pontualmente, longe da pele.",
    ],
    sisterNote: (s) =>
      `Cartela irmã: ${s} — mesma vivacidade, temperatura fria. Use as cores escuras dela longe do rosto.`,
  },
  light_spring: {
    styleTips: [
      "Quente, clara e delicada: pastéis quentes e tecidos leves.",
      "Pêssego claro, menta, rosa chá e marfim — não preto nem marinho denso.",
      "Metais dourados claros e rosê; prata pesada endurece.",
      "Estampas miúdas e fundos claros; contraste alto no look cansa.",
      "Jeans claro (lavanda/areia), não indigo profundo.",
    ],
    makeupTips: [
      "Batom rosa claro ou coral suave; boca muito escura pesa.",
      "Sombras champanhe e verde claro; blush pêssego translúcido.",
      "Contorno mínimo, quente e esfumado — faixa marrom marcada envelhece.",
      "Base marfim quente, cobertura leve.",
    ],
    hairTips: [
      "Loiro claro quente, mel muito claro; preservar luminosidade.",
      "Evite preto, castanho profundo e cinza no comprimento.",
      "Mechas suaves (+1 a −2 tons); não marcar contraste de raiz escura.",
    ],
    avoidNotes: [
      "Preto, vinho fechado e neon frio perto do rosto apagam a delicadeza.",
      "Não tratar pele clara como licença para cartela profunda.",
    ],
    sisterNote: (s) =>
      `Cartela irmã: ${s} — mesma claridade, temperatura fria. Pastéis frios dela só se não encostarem na pele.`,
  },
  light_summer: {
    styleTips: [
      "Frio, claro e suave: pastéis acinzentados e rosados.",
      "Azul bebê, lavanda, rosa pó e off-white frio perto do rosto.",
      "Metais prata, ouro branco e pérola; dourado amarelo pesa.",
      "Tecidos foscos e fluidos; brilho metálico forte compete.",
      "Jeans cinza-azulado claro, não preto.",
    ],
    makeupTips: [
      "Batom rosa frio ou ameixa suave; evite laranja e vermelho tomate.",
      "Sombras malva e azul suave; blush rosa-chá.",
      "Contorno cinza-rosa muito leve; bronze quente mancha.",
      "Base rosada clara, sem fundo amarelo.",
    ],
    hairTips: [
      "Loiro cinza-bege, cinza suave, castanho claro frio.",
      "Evite cobre, dourado intenso e preto.",
      "Iluminada fria e esfumada; contraste marcado destoa do valor claro.",
    ],
    avoidNotes: [
      "Laranja, mostarda e camel perto do rosto aquecem demais.",
      "Preto óptico e branco estourado criam contraste que a cartela não pede.",
    ],
    sisterNote: (s) =>
      `Cartela irmã: ${s} — mesma claridade suave, temperatura quente. Use os pastéis quentes dela longe do decote.`,
  },
  true_summer: {
    styleTips: [
      "Frio clássico, contraste médio, saturação controlada — elegância calma.",
      "Azul denim, vermelho frio, marinho e off-white rosado.",
      "Metais prata e ouro branco; dourado amarelo só em detalhe pequeno.",
      "Estampas em azul-cinza e rosa antigo; fundo quente amarelo destoa.",
      "Jeans índigo frio da paleta, não destroyed amarelado.",
    ],
    makeupTips: [
      "Batom rosa-ameixa ou vermelho frio; coral quente cansa.",
      "Sombras cinza-rosa e azul acinzentado; blush malva.",
      "Contorno frio esfumado; evite bronze.",
      "Base rosa média, sem dourado visível.",
    ],
    hairTips: [
      "Castanho frio, cinza-acastanhado, loiro cinza médio.",
      "Evite cobre, dourado e preto azulado extremo (isso é inverno).",
      "Mechas frias ±2 tons; harmonia com o contraste médio.",
    ],
    avoidNotes: [
      "Pêssego, mostarda e verde musgo quente perto do rosto.",
      "Neons e branco óptico de inverno brilhante são outro contraste.",
    ],
    sisterNote: (s) =>
      `Cartela irmã: ${s} — mesmo eixo verdadeiro, temperatura quente. Terracota dela só na barra ou acessório.`,
  },
  soft_summer: {
    styleTips: [
      "Frio e suave: cinzas azulados, pérola, malva — pouca saturação.",
      "Acabamento mate e névoa; brilho metálico e neons gritam.",
      "Metais foscos (prata envelhecida, grafite); ouro amarelo polido pesa.",
      "Estampas tom sobre tom acinzentadas; fundo branco óptico endurece.",
      "Jeans cinza ou azul-poeira, não indigo vivo.",
    ],
    makeupTips: [
      "Nude malva e ameixa suave; boca vermelha óptica cansa.",
      "Sombras marrom acinzentado e cinza; blush cinza-rosa.",
      "Contorno cinza-taupe bem esfumado; zero bronze.",
      "Base neutra fria, cobertura média sem glow amarelo.",
    ],
    hairTips: [
      "Castanho acinzentado, rato, loiro cinza médio.",
      "Evite ruivo cobre, dourado e preto brilhante.",
      "Mechas muito esfumadas; contraste marcado foge da suavidade.",
    ],
    avoidNotes: [
      "Vermelho puro, verde neon e dourado vivo perto do rosto.",
      "A irmã quente (Outono Suave) empresta terrosos só longe da pele.",
    ],
    sisterNote: (s) =>
      `Cartela irmã: ${s} — mesma suavidade, temperatura quente. Camel e oliva dela não encostam no decote.`,
  },
  soft_autumn: {
    styleTips: [
      "Suavidade + calor: terrosos, camel e oliva sem brilho metálico extremo.",
      "Prefira acabamentos mate e estampas suaves em fundo areia.",
      "Metais ouro fosco e bronze; prata fria acinza o rosto.",
      "Jeans caramelo ou verde-acinzentado, não azul gelado.",
      "Camadas em tons próximos (monocromia quente suave) valorizam.",
    ],
    makeupTips: [
      "Nudes terrosos e terracota suave; evite vermelho óptico gelado.",
      "Sombras marrom quente e verde musgo apagado; blush pêssego-poeira.",
      "Contorno quente muito esfumado; faixa cinza fria endurece.",
      "Base dourada média, sem rosa frio.",
    ],
    hairTips: [
      "Castanhos quentes suaves; cobre discreto.",
      "Evite platinado frio extremo e preto azulado.",
      "Iluminada mel-suave, pouco contraste de raiz.",
    ],
    avoidNotes: [
      "Contraste alto com preto/branco óptico e neons frios costuma endurecer o traço.",
      "Magenta gelado e azul royal pertencem à irmã fria, não à gola.",
    ],
    sisterNote: (s) =>
      `Cartela irmã: ${s} — mesma suavidade, temperatura fria.`,
  },
  true_autumn: {
    styleTips: [
      "Quente intenso, profundidade média, riqueza terrosa — ferrugem, musgo, mostarda.",
      "Metais ouro amarelo e cobre; prata fria apaga o calor.",
      "Estampas étnicas/terrosas em fundo quente; fundo cinza-frio destoa.",
      "Jeans marrom ou verde musgo; azul gelado compete.",
      "Tecidos com corpo (lã, veludo mate); branco óptico estoura.",
    ],
    makeupTips: [
      "Batom cobre queimado ou vinho quente; rosa frio cansa.",
      "Sombras cobre e oliva; blush terracota.",
      "Contorno marrom dourado; evite cinza.",
      "Base bronze / dourada média-profunda.",
    ],
    hairTips: [
      "Castanho cobre, ruivo quente, chocolate dourado.",
      "Evite cinza, violeta e preto azulado.",
      "Mechas cobre/mel com raiz quente; não abrir para cinza.",
    ],
    avoidNotes: [
      "Rosa chiclete, azul royal e lilás gelado perto do rosto.",
      "A irmã fria (Verão Verdadeiro) só empresta azul-cinza na barra.",
    ],
    sisterNote: (s) =>
      `Cartela irmã: ${s} — mesmo eixo verdadeiro, temperatura fria. Azuis dela longe da pele.`,
  },
  deep_autumn: {
    styleTips: [
      "Quente, escuro e rico: café, madeira, verde floresta, dourado envelhecido.",
      "Profundidade manda — pastéis e branco óptico lavam o traço.",
      "Metais ouro velho e bronze escuro; prata clara acende demais.",
      "Estampas escuras terrosas; fundo gelo destoa.",
      "Jeans café ou verde muito escuro, não azul claro.",
    ],
    makeupTips: [
      "Batom vinho escuro ou ferrugem profunda; nude claro some.",
      "Sombras marrom profundo e verde escuro; blush terracota fechado.",
      "Contorno chocolate quente; cinza frio esfria a pele.",
      "Base bronze profunda, alinhada ao valor baixo.",
    ],
    hairTips: [
      "Castanho profundo quente, café, ruivo escuro.",
      "Evite loiro claro, cinza e preto azulado de inverno.",
      "Iluminada só em cobre/dourado escuro, pouco contraste de platina.",
    ],
    avoidNotes: [
      "Pastéis, gelo e amarelo claro perto do rosto.",
      "A irmã fria (Inverno Profundo) empresta ameixa só pontualmente.",
    ],
    sisterNote: (s) =>
      `Cartela irmã: ${s} — mesma profundidade, temperatura fria. Ameixas dela não substituem o café da sua paleta.`,
  },
  true_winter: {
    styleTips: [
      "Frio intenso, contraste elevado: preto-azulado, vermelho frio, roxo real, gelo.",
      "Branco limpo e pretos com base azul; camel e dourado amarelo apagam.",
      "Metais prata, platina e ouro branco; ouro amarelo só em joia pequena.",
      "Estampas de alto contraste frio; fundo areia quente destoa.",
      "Jeans indigo profundo ou preto, não destroyed amarelado.",
    ],
    makeupTips: [
      "Batom vermelho frio ou borgonha; coral quente cansa.",
      "Sombras roxo e azul gelo; blush rosa frio marcado.",
      "Contorno cinza-frio; bronze quente mancha.",
      "Base porcelana fria ou oliva fria — sem dourado visível.",
    ],
    hairTips: [
      "Preto azulado, castanho frio profundo, branco-gelo pontual.",
      "Evite cobre, mel e dourado no comprimento.",
      "Contraste de raiz pode ser alto; mechas cinza-frio, não carameladas.",
    ],
    avoidNotes: [
      "Mostarda, pêssego e verde musgo quente perto do rosto.",
      "A irmã quente (Primavera Verdadeira) só empresta vivacidade longe da pele.",
    ],
    sisterNote: (s) =>
      `Cartela irmã: ${s} — mesma vivacidade verdadeira, temperatura quente. Pêssego dela não encosta no decote.`,
  },
  deep_winter: {
    styleTips: [
      "Frio e profundo: pretos densos, azul noite, ameixa, grafite — saturação contida.",
      "Joias escuras e tecidos pesados; pastel e branco estourado lavam.",
      "Metais prata envelhecida e ônix; ouro amarelo claro compete.",
      "Estampas escuras frias; fundo areia quente destoa.",
      "Jeans preto ou azul noite, não claro.",
    ],
    makeupTips: [
      "Batom vinho ou ameixa escura; nude claro some, coral quente cansa.",
      "Sombras roxo escuro e grafite; blush ameixa contido.",
      "Contorno cinza-frio profundo; evite bronze.",
      "Base oliva fria ou profunda fria, nunca dourada clara.",
    ],
    hairTips: [
      "Preto profundo, castanho frio muito escuro, vinho frio no fio.",
      "Evite loiro, cobre e mel.",
      "Pouco contraste de mecha clara; profundidade é a característica.",
    ],
    avoidNotes: [
      "Pêssego, camel e amarelo claro perto do rosto.",
      "A irmã quente (Outono Profundo) empresta café só longe da pele.",
    ],
    sisterNote: (s) =>
      `Cartela irmã: ${s} — mesma profundidade, temperatura quente. Madeiras dela não substituem o azul noite.`,
  },
};

export function packForSeason(season: SeasonDefinition): SeasonPack | undefined {
  return SEASON_PACKS[season.id];
}
