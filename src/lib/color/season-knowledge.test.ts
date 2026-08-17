import { describe, expect, it } from "vitest";
import { SEASON_PALETTES } from "../../../data/palettes/seasons";
import {
  buildRecommendations,
  getSeasonById,
} from "@/lib/color/recommendations";
import {
  buildSeasonCoaching,
  contrastBandFromScore,
  SISTER_SEASONS,
} from "@/lib/color/season-knowledge";
import { SEASON_PACKS } from "@/lib/color/season-packs";

describe("season-knowledge", () => {
  it("contraste mapeia faixas", () => {
    expect(contrastBandFromScore(30)).toBe("high");
    expect(contrastBandFromScore(20)).toBe("medium");
    expect(contrastBandFromScore(10)).toBe("low");
  });

  it("as 12 estações têm pack fino", () => {
    expect(SEASON_PALETTES).toHaveLength(12);
    for (const season of SEASON_PALETTES) {
      const pack = SEASON_PACKS[season.id];
      expect(pack).toBeDefined();
      if (!pack) continue;
      expect(pack.styleTips.length).toBeGreaterThanOrEqual(4);
      expect(pack.makeupTips.length).toBeGreaterThanOrEqual(3);
      expect(pack.hairTips.length).toBeGreaterThanOrEqual(3);
      expect(pack.avoidNotes.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("verão suave cita a irmã outono suave", () => {
    const season = getSeasonById("soft_summer")!;
    const coaching = buildSeasonCoaching(season, {
      getSeasonName: (id) => getSeasonById(id)?.namePt,
    });
    expect(coaching.sisterNote).toMatch(/Outono Suave/i);
    expect(coaching.styleTips.join(" ")).toMatch(/suave|cinza|malva/i);
  });

  it("inverno brilhante tem irmã primavera brilhante", () => {
    expect(SISTER_SEASONS.bright_winter).toBe("bright_spring");
    const season = getSeasonById("bright_winter")!;
    const coaching = buildSeasonCoaching(season, {
      contrastScore: 32,
      getSeasonName: (id) => getSeasonById(id)?.namePt,
    });
    expect(coaching.sisterSeasonId).toBe("bright_spring");
    expect(coaching.sisterNote).toMatch(/Primavera Brilhante/i);
    expect(coaching.avoidNotes.join(" ")).toMatch(/Outono Suave/i);
    expect(coaching.styleTips.join(" ")).toMatch(/brilho|óptico|optic|cetim/i);
    expect(coaching.offPaletteTips.join(" ")).toMatch(/fora|distância|longe/i);
    expect(coaching.offPaletteTips.join(" ")).not.toMatch(/todas as cores da paleta/i);
    expect(coaching.styleTips.join(" ")).toMatch(/perto do rosto/i);
  });
});

describe("buildRecommendations + material", () => {
  it("entrega coaching e cabelo quando pedido", () => {
    const season = getSeasonById("bright_winter")!;
    const rec = buildRecommendations(season, "casual", {
      goals: ["harmonia", "cabelo", "roupas"],
      skinLab: { L: 48, a: 8, b: -6 },
      contrastScore: 34,
      temperatureScore: -10,
    });
    expect(rec.coaching.hairTips.length).toBeGreaterThan(0);
    expect(rec.coaching.colorimetryHairNotes.join(" ")).toMatch(/violeta|dourado/i);
    expect(rec.useColors[0]).toBeTruthy();
    expect(rec.description).toMatch(/brilhante|Clear Winter|Vivo/i);
  });

  it("omite tips de cabelo se o objetivo não pedir", () => {
    const season = getSeasonById("bright_winter")!;
    const rec = buildRecommendations(season, "casual", {
      goals: ["harmonia"],
      contrastScore: 20,
    });
    expect(rec.coaching.hairTips).toEqual([]);
    expect(rec.coaching.styleTips.length).toBeGreaterThan(0);
  });
});
