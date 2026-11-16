import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth-context";

export function LoginPage() {
  const { consultant, loading, login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!loading && consultant) {
    return <Navigate to="/" replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (mode === "register") {
        await register(name, email, password);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha na autenticação.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="panel auth-panel">
      <h1>{mode === "login" ? "Entrar no Desk" : "Cadastrar consultora"}</h1>
      <p className="empty">
        Acesso só para consultoras. Use e-mail e senha do desk.
      </p>
      <form className="auth-form" onSubmit={onSubmit}>
        {mode === "register" ? (
          <label>
            Nome
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
              minLength={2}
            />
          </label>
        ) : null}
        <label>
          E-mail
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>
        <label>
          Senha
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            required
            minLength={mode === "register" ? 10 : 1}
          />
        </label>
        {error ? <p className="auth-error">{error}</p> : null}
        <button type="submit" disabled={submitting || loading}>
          {submitting
            ? "Aguarde…"
            : mode === "login"
              ? "Entrar"
              : "Criar conta"}
        </button>
      </form>
      <p className="auth-switch">
        {mode === "login" ? (
          <>
            Ainda sem conta?{" "}
            <button type="button" className="linkish" onClick={() => setMode("register")}>
              Cadastrar
            </button>
          </>
        ) : (
          <>
            Já tem conta?{" "}
            <button type="button" className="linkish" onClick={() => setMode("login")}>
              Entrar
            </button>
          </>
        )}
      </p>
    </section>
  );
}
