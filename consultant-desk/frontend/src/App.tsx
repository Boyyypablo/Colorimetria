import { Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "./components/RequireAuth";
import { useAuth } from "./lib/auth-context";
import { InboxPage } from "./pages/Inbox";
import { LoginPage } from "./pages/Login";
import { ThreadPage } from "./pages/Thread";

export function App() {
  const { consultant, loading, logout } = useAuth();

  return (
    <div className="desk">
      <header className="desk-header">
        <div>
          <p className="desk-brand">Glowing · Desk</p>
          <p className="desk-sub">Fila e chat das consultoras</p>
        </div>
        {!loading && consultant ? (
          <div className="desk-user">
            <span>{consultant.name}</span>
            <button type="button" className="linkish" onClick={() => void logout()}>
              Sair
            </button>
          </div>
        ) : null}
      </header>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <InboxPage />
            </RequireAuth>
          }
        />
        <Route
          path="/threads/:threadId"
          element={
            <RequireAuth>
              <ThreadPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
