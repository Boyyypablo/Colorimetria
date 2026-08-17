import { describe, expect, it } from "vitest";
import { attachGarments, pickGarment } from "@/lib/wardrobe/looks";

describe("wardrobe looks", () => {
  it("alterna peça no mesmo contexto", () => {
    expect(pickGarment("casual", 0)).toBe("blusa");
    expect(pickGarment("casual", 1)).toBe("casaco");
    expect(pickGarment("noite", 0)).toBe("vestido");
    expect(pickGarment("trabalho", 0)).toBe("camisa");
  });

  it("anexa silhueta e rótulo aos swatches de roupa", () => {
    const looks = attachGarments(
      [
        { hex: "#FF6B35", label: "Coral vivo", context: ["casual"] },
        { hex: "#00C2A8", label: "Turquesa", context: ["trabalho"] },
        { hex: "#E76F51", label: "Terracota", context: ["noite"] },
      ],
      "casual",
    );
    expect(looks[0]).toMatchObject({ garment: "blusa", garmentLabel: "Blusa" });
    expect(looks[0].photoUrl).toBe("/wardrobe/blusa.jpg");
    expect(looks[1]).toMatchObject({ garment: "camisa", garmentLabel: "Camisa" });
    expect(looks[2]).toMatchObject({
      garment: "vestido",
      garmentLabel: "Vestido",
    });
  });
});
