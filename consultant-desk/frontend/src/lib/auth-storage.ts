export type DeskConsultant = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
};

const LEGACY_TOKEN_KEY = "desk_token";

/** Remove JWT legado do localStorage (XSS-able). Sessão vive só no cookie httpOnly. */
export function clearLegacyTokenStorage(): void {
  try {
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  } catch {
    // ignore
  }
}
