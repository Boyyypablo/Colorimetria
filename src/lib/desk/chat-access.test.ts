import { describe, expect, it } from "vitest";
import { CHAT_TRIAL_MS, describeChatAccess } from "@/lib/desk/chat-access";

const paidAt = new Date("2026-11-01T12:00:00.000Z");

describe("chat da consultora", () => {
  it("bloqueia antes de pagar a análise quando pagamentos estão ativos", () => {
    const access = describeChatAccess({
      analysisPaidAt: null,
      reviewPaid: false,
      paymentsOn: true,
      now: paidAt,
    });
    expect(access.canSend).toBe(false);
    expect(access.reason).toBe("analysis_unpaid");
  });

  it("libera por 7 dias após pagar a cartela (R$ 67)", () => {
    const access = describeChatAccess({
      analysisPaidAt: paidAt,
      reviewPaid: false,
      paymentsOn: true,
      now: new Date(paidAt.getTime() + 2 * 24 * 60 * 60 * 1000),
    });
    expect(access.canSend).toBe(true);
    expect(access.reason).toBe("trial");
    expect(access.daysLeft).toBe(5);
  });

  it("bloqueia depois de 7 dias do pagamento da cartela sem revisão paga", () => {
    const access = describeChatAccess({
      analysisPaidAt: paidAt,
      reviewPaid: false,
      paymentsOn: true,
      now: new Date(paidAt.getTime() + CHAT_TRIAL_MS + 1000),
    });
    expect(access.canSend).toBe(false);
    expect(access.reason).toBe("expired");
  });

  it("pagamento da revisão libera mesmo após a semana", () => {
    const access = describeChatAccess({
      analysisPaidAt: paidAt,
      reviewPaid: true,
      paymentsOn: true,
      now: new Date(paidAt.getTime() + CHAT_TRIAL_MS + 1000),
    });
    expect(access.canSend).toBe(true);
    expect(access.reason).toBe("paid");
  });

  it("libera no modo beta quando PAYMENTS_ENABLED=false", () => {
    const access = describeChatAccess({
      analysisPaidAt: null,
      reviewPaid: false,
      paymentsOn: false,
    });
    expect(access.canSend).toBe(true);
    expect(access.reason).toBe("payments_off");
  });
});
