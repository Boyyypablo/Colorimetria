import { describe, expect, it } from "vitest";
import {
  hexLuma,
  photoTintForKind,
  photoTintPlan,
} from "@/lib/wardrobe/photo-tint";

describe("photoTintPlan", () => {
  it("não tinge branco óptico — a camisa já é clara", () => {
    expect(hexLuma("#FFFFFF")).toBeGreaterThan(230);
    expect(photoTintForKind("camisa", "#FFFFFF")).toEqual({
      apply: false,
      multiplyOpacity: 0,
    });
  });

  it("tinge blusa bege para azul-marinho e escurece", () => {
    const plan = photoTintForKind("blusa", "#1B3A6B");
    expect(plan.apply).toBe(true);
    expect(plan.multiplyOpacity).toBeGreaterThan(0.2);
  });

  it("tinge casaco terracota para cerceta", () => {
    const plan = photoTintForKind("casaco", "#0A7A6E");
    expect(plan.apply).toBe(true);
  });

  it("tinge vestido champanhe para vermelho", () => {
    const plan = photoTintForKind("vestido", "#E63946");
    expect(plan.apply).toBe(true);
    expect(plan.multiplyOpacity).toBeGreaterThan(0.2);
  });

  it("não multiplica quando o alvo é mais claro que a foto", () => {
    expect(photoTintPlan("#F4A261", 80).multiplyOpacity).toBe(0);
  });
});
