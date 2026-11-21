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

  it("mascara CPF/CNPJ", () => {
    expect(redactSecrets("cliente 529.982.247-25 ok")).toContain("[REDACTED_DOC]");
    expect(redactSecrets("cliente 529.982.247-25 ok")).not.toContain("529");
    expect(redactSecrets("cnpj 12.345.678/0001-95")).toContain("[REDACTED_DOC]");
  });

  it("mascara ASAAS_API_KEY em texto", () => {
    expect(redactSecrets("ASAAS_API_KEY=abc123secret")).toContain(
      "[REDACTED_SECRET]",
    );
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
