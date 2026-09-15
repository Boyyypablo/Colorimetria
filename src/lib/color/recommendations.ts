import { SEASON_PALETTES } from "../../../data/palettes/seasons";
import {
  DEFAULT_ANALYSIS_GOALS,
  hasGoal,
  parseAnalysisGoals,
  type AnalysisGoalId,
  wantsSkinCorrection,
} from "./goals";
import {
  harmonyInputFromSeason,
  rankBasesBySkinValue,
  rankHexColors,
  rankSwatches,
  type RankedColor,
} from "./harmony";
import { buildSeasonCoaching, type SeasonCoaching } from "./season-knowledge";
import { buildSkinCorrection } from "./skin-correction";
import type { LabColor, SeasonDefinition } from "./types";

export function getSeasonById(id: string): SeasonDefinition | undefined {
  return SEASON_PALETTES.find((s) => s.id === id);
}

export function buildRecommendations(
  season: SeasonDefinition,
  context: "trabalho" | "casual" | "noite" = "casual",
  opts?: {
    temperatureScore?: number;
    goals?: AnalysisGoalId[] | string[];
    /** Lab de subtom (bochechas) — ativa ranking personalizado. */
    skinLab?: LabColor;
    valueScore?: number;
    contrastScore?: number;
  },
) {
  const goals = parseAnalysisGoals(opts?.goals ?? DEFAULT_ANALYSIS_GOALS);
  const clothingRaw = season.clothing.filter(
    (c) => !c.context || c.context.includes(context),
  );
  const skinCorrection = wantsSkinCorrection(goals)
    ? buildSkinCorrection({
        temperature: season.temperature,
        temperatureScore: opts?.temperatureScore,
        skinL: opts?.skinLab?.L ?? opts?.valueScore,
        goals,
      })
    : null;

  const showHarmonia = hasGoal(goals, "harmonia");
  const showRoupas = hasGoal(goals, "roupas");
  const showMaquiagem = hasGoal(goals, "maquiagem");
  const showCabelo = hasGoal(goals, "cabelo");
  const showBaseSeason = hasGoal(goals, "base") || hasGoal(goals, "maquiagem");
  const showPeleFocus =
    hasGoal(goals, "olheiras") ||
    hasGoal(goals, "manchas") ||
    hasGoal(goals, "vermelhidao");

  const skinLab = opts?.skinLab;
  const harmony = skinLab
    ? harmonyInputFromSeason(season, skinLab, opts?.temperatureScore)
    : null;

  let useColors = showHarmonia ? [...season.useColors] : [];
  let avoidColors = showHarmonia ? [...season.avoidColors] : [];
  let clothing = showRoupas
    ? clothingRaw.length > 0
      ? [...clothingRaw]
      : [...season.clothing]
    : [];
  let lipstick = showMaquiagem ? [...season.lipstick] : [];
  let eyeshadow = showMaquiagem ? [...season.eyeshadow] : [];
  let base = showBaseSeason ? [...season.base] : [];

  let rankedUse: RankedColor[] = [];
  let rankedAvoid: RankedColor[] = [];
  let personalNote: string | null = null;

  if (harmony) {
    rankedUse = rankHexColors(season.useColors, harmony, 8);
    rankedAvoid = rankHexColors(season.avoidColors, harmony, 6).sort(
      (a, b) => a.score - b.score,
    );
    if (showHarmonia) {
      useColors = rankedUse.map((r) => r.hex);
      avoidColors = [
        ...rankedAvoid.map((r) => r.hex),
        ...season.avoidColors.filter(
          (h) =>
            !rankedAvoid.some((r) => r.hex.toUpperCase() === h.toUpperCase()),
        ),
      ].slice(0, 8);
    }
    if (showRoupas && clothing.length > 0) {
      clothing = rankSwatches(clothing, harmony);
    }
    if (showMaquiagem && lipstick.length > 0) {
      lipstick = rankSwatches(lipstick, harmony);
    }
    if (showMaquiagem && eyeshadow.length > 0) {
      eyeshadow = rankSwatches(eyeshadow, harmony);
    }
    if (showBaseSeason && base.length > 0) {
      const skinL = skinLab?.L ?? opts?.valueScore ?? 60;
      base = rankBasesBySkinValue(base, skinL);
    }
    personalNote =
      "Cores ordenadas para a sua pele medida (Lab) dentro da estação — não é a mesma lista genérica para todo mundo.";
  }

  const coachingFull = buildSeasonCoaching(season, {
    contrastScore: opts?.contrastScore,
    getSeasonName: (id) => getSeasonById(id)?.namePt,
  });

  // Entrega só o que o objetivo pediu (cabelo / make / roupas / harmonia)
  const coaching: SeasonCoaching = {
    ...coachingFull,
    styleTips:
      showHarmonia || showRoupas ? coachingFull.styleTips : [],
    makeupTips: showMaquiagem ? coachingFull.makeupTips : [],
    hairTips: showCabelo ? coachingFull.hairTips : [],
    colorimetryHairNotes: showCabelo
      ? coachingFull.colorimetryHairNotes
      : [],
    avoidNotes: showHarmonia ? coachingFull.avoidNotes : [],
    offPaletteTips:
      showHarmonia || showRoupas ? coachingFull.offPaletteTips : [],
    sisterNote: showHarmonia ? coachingFull.sisterNote : null,
    contrastTip:
      showHarmonia || showRoupas || showCabelo
        ? coachingFull.contrastTip
        : null,
    attentionRedirectTips: showPeleFocus
      ? coachingFull.attentionRedirectTips
      : [],
  };

  const undertoneHint =
    season.id === "bright_winter"
      ? "Metais mistos (ouro, prata, platina) com acabamento brilhante; dourado funciona bem em joias, com cuidado em roupa perto do rosto."
      : season.temperature === "warm"
        ? "Prefira metais dourados e tons terrosos/amarelados."
        : "Prefira metais prateados e tons rosados/azulados.";

  return {
    seasonId: season.id,
    seasonName: season.namePt,
    description: season.description,
    goals,
    undertoneHint,
    useColors,
    avoidColors,
    rankedUse: showHarmonia ? rankedUse : [],
    rankedAvoid: showHarmonia ? rankedAvoid : [],
    clothing,
    lipstick,
    eyeshadow,
    base,
    skinCorrection,
    coaching,
    personalNote,
    ethicalNote:
      "A entrega segue o que você pediu no upload. Harmonia sazonal, cabelo e cuidados com a pele são camadas distintas. Não é diagnóstico dermatológico nem substitui consultoria presencial.",
    context,
    evaluation: undefined as any, // Populated after initial build
    sisterSeasons: undefined as string[] | undefined, // Populated if confidence low
  };
}
