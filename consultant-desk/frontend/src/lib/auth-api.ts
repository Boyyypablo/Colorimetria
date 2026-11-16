import { deskFetch } from "./api";
import { clearLegacyTokenStorage, type DeskConsultant } from "./auth-storage";

type AuthResponse = {
  consultant: DeskConsultant;
};

export async function registerConsultant(input: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthResponse> {
  clearLegacyTokenStorage();
  return deskFetch<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function loginConsultant(input: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  clearLegacyTokenStorage();
  return deskFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function logoutConsultant(): Promise<void> {
  try {
    await deskFetch<{ ok: boolean }>("/auth/logout", { method: "POST" });
  } finally {
    clearLegacyTokenStorage();
  }
}

export async function fetchMe(): Promise<DeskConsultant | null> {
  try {
    const data = await deskFetch<{ consultant: DeskConsultant }>("/auth/me");
    return data.consultant;
  } catch {
    return null;
  }
}
