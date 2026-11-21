import { describe, expect, it } from "vitest";
import { CHAT_TRIAL_MS, describeChatAccess } from "@/lib/desk/chat-access";

const created = new Date("2026-11-01T12:00:00.000Z");

describe("chat da consultora", () => {
  it("libera na primeira semana sem pagamento", () => {
    const access = describeChatAccess({
      createdAt: created,
      paid: false,
      paymentsOn: true,
      now: new Date(created.getTime() + 2 * 24 * 60 * 60 * 1000),
    });
    expect(access.canSend).toBe(true);
    expect(access.reason).toBe("trial");
    expect(access.daysLeft).toBe(5);
  });

  it("bloqueia depois de 7 dias se não houver revisão paga", () => {
    const access = describeChatAccess({
      createdAt: created,
      paid: false,
      paymentsOn: true,
      now: new Date(created.getTime() + CHAT_TRIAL_MS + 1000),
    });
    expect(access.canSend).toBe(false);
    expect(access.reason).toBe("expired");
  });

  it("pagamento da revisão libera mesmo após a semana", () => {
    const access = describeChatAccess({
      createdAt: created,
      paid: true,
      paymentsOn: true,
      now: new Date(created.getTime() + CHAT_TRIAL_MS + 1000),
    });
    expect(access.canSend).toBe(true);
    expect(access.reason).toBe("paid");
  });
});
