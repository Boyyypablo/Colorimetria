import { describe, expect, it } from "vitest";
import { evaluateAnalysisAccess, photoNeedsRetake } from "@/lib/payments/access";

describe("acesso ao resultado da análise", () => {
  it("libera tudo quando PAYMENTS_ENABLED=false (beta)", () => {
    expect(
      evaluateAnalysisAccess({
        paymentsOn: false,
        hasPaidAnalysis: false,
        hasPaidReview: false,
        photoQuality: { qualityBand: "boa", faceDetected: true },
      }),
    ).toBe("unlocked");
  });

  it("pede troca gratuita de foto quando qualidade é ruim e ainda não pagou", () => {
    expect(photoNeedsRetake({ qualityBand: "ruim", faceDetected: true })).toBe(true);
    expect(photoNeedsRetake({ qualityBand: "aceitavel", faceDetected: false })).toBe(true);
    expect(
      evaluateAnalysisAccess({
        paymentsOn: true,
        hasPaidAnalysis: false,
        hasPaidReview: false,
        photoQuality: { qualityBand: "ruim", faceDetected: true },
      }),
    ).toBe("needs_retake");
  });

  it("bloqueia resultado atrás do pagamento de R$ 67 quando foto é boa ou aceitável", () => {
    expect(
      evaluateAnalysisAccess({
        paymentsOn: true,
        hasPaidAnalysis: false,
        hasPaidReview: false,
        photoQuality: { qualityBand: "boa", faceDetected: true },
      }),
    ).toBe("payment_required");
  });

  it("destrava quando a cartela (ANALYSIS) foi paga", () => {
    expect(
      evaluateAnalysisAccess({
        paymentsOn: true,
        hasPaidAnalysis: true,
        hasPaidReview: false,
        photoQuality: { qualityBand: "boa", faceDetected: true },
      }),
    ).toBe("unlocked");
  });
});
