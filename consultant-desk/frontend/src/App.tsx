import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "./components/RequireAuth";
import { SparkleDecor } from "./components/SparkleDecor";
import { useAuth } from "./lib/auth-context";
import { unlockNotifyChime } from "./lib/notify-chime";
import { InboxPage } from "./pages/Inbox";
import { LoginPage } from "./pages/Login";
import { ThreadPage } from "./pages/Thread";

export function App() {
  const { consultant, loading, logout } = useAuth();

  useEffect(() => {
    const unlock = () => unlockNotifyChime();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  return (
    <div className="desk">
      <header className="desk-header">
        <div>
          <p className="desk-brand">Glowing · Desk</p>
          <p className="desk-sub">Fila e chat das consultoras</p>
        </div>
        {!loading && consultant ? (
          <div className="desk-user">
            <span className="desk-user__name">{consultant.name}</span>
            <button
              type="button"
              className="linkish"
              onClick={() => void logout()}
            >
              Sair
            </button>
          </div>
        ) : null}
      </header>
      <div className="desk-body">
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
      <SparkleDecor tone="cream" />
    </div>
  );
}
