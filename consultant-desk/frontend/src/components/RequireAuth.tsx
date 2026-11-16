import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth-context";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { consultant, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <section className="panel">
        <p className="empty">Verificando sessão…</p>
      </section>
    );
  }

  if (!consultant) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
