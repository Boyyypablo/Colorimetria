import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  fetchMe,
  loginConsultant,
  logoutConsultant,
  registerConsultant,
} from "./auth-api";
import { clearLegacyTokenStorage, type DeskConsultant } from "./auth-storage";

type AuthContextValue = {
  consultant: DeskConsultant | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [consultant, setConsultant] = useState<DeskConsultant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    clearLegacyTokenStorage();
    (async () => {
      const me = await fetchMe();
      if (!cancelled) {
        setConsultant(me);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await loginConsultant({ email, password });
    setConsultant(data.consultant);
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const data = await registerConsultant({ name, email, password });
      setConsultant(data.consultant);
    },
    [],
  );

  const logout = useCallback(async () => {
    await logoutConsultant();
    setConsultant(null);
  }, []);

  const value = useMemo(
    () => ({ consultant, loading, login, register, logout }),
    [consultant, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth fora do AuthProvider");
  }
  return ctx;
}
