import { describe, expect, it } from "vitest";
import { clientSafeErrorMessage, redactSecrets } from "./redact";

describe("redactSecrets", () => {
  it("mascara connection string", () => {
    const raw =
      'Error: postgresql://user:secretpass@db.example.com:5432/postgres?sslmode=require failed';
    expect(redactSecrets(raw)).toContain("[REDACTED_DB_URL]");
    expect(redactSecrets(raw)).not.toContain("secretpass");
  });

  it("mascara JWT", () => {
    const jwt =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMifQ.signaturepart";
    expect(redactSecrets(`token ${jwt}`)).toContain("[REDACTED_JWT]");
  });
});

describe("clientSafeErrorMessage", () => {
  it("não devolve URL de banco ao cliente", () => {
    const err = new Error(
      "Can't reach database server at postgresql://u:p@host/db",
    );
    expect(clientSafeErrorMessage(err)).toBe(
      "Não foi possível concluir a operação.",
    );
  });

  it("mantém mensagem de domínio inofensiva", () => {
    expect(clientSafeErrorMessage(new Error("Rosto não detectado."))).toBe(
      "Rosto não detectado.",
    );
  });
});
