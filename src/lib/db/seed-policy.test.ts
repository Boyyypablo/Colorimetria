import { describe, expect, it } from "vitest";
import { databaseHost, shouldSeedDemoUsers } from "@/lib/db/seed-policy";

describe("shouldSeedDemoUsers", () => {
  const local = {
    NODE_ENV: "development",
    DATABASE_URL:
      "postgresql://colometria:colometria@localhost:5433/colometria?schema=public",
  };

  it("permite demo só em loopback fora de produção", () => {
    expect(shouldSeedDemoUsers(local)).toBe(true);
    expect(shouldSeedDemoUsers({ ...local, DATABASE_URL: "postgresql://u:p@127.0.0.1:5433/db" })).toBe(
      true,
    );
  });

  it("bloqueia produção mesmo com localhost", () => {
    expect(shouldSeedDemoUsers({ ...local, NODE_ENV: "production" })).toBe(false);
  });

  it("bloqueia host remoto (Neon, compose prod, VPS)", () => {
    expect(
      shouldSeedDemoUsers({
        NODE_ENV: "development",
        DATABASE_URL: "postgresql://u:p@ep-x.neon.tech/db?sslmode=require",
      }),
    ).toBe(false);
    expect(
      shouldSeedDemoUsers({
        NODE_ENV: "development",
        DATABASE_URL: "postgresql://u:p@postgres:5432/colometria",
      }),
    ).toBe(false);
  });

  it("respeita ALLOW_DEMO_SEED=false", () => {
    expect(shouldSeedDemoUsers({ ...local, ALLOW_DEMO_SEED: "false" })).toBe(false);
  });

  it("recusa URL inválida ou ausente", () => {
    expect(shouldSeedDemoUsers({ NODE_ENV: "development" })).toBe(false);
    expect(shouldSeedDemoUsers({ NODE_ENV: "development", DATABASE_URL: "not-a-url" })).toBe(
      false,
    );
    expect(databaseHost("postgresql://u:p@localhost/db")).toBe("localhost");
  });
});
