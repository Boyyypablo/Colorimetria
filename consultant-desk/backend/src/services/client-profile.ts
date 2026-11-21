import { prisma } from "../lib/prisma.js";

export type ClientProfilePublic = {
  userId: string | null;
  name: string;
  email: string | null;
  age: number | null;
  birthDate: string | null;
  city: string | null;
  state: string | null;
  about: string | null;
  /** URL relativa no desk — requer cookie de sessão. */
  avatarUrl: string | null;
  hasAvatar: boolean;
};

function ageFromBirthDate(birthDate: Date | null): number | null {
  if (!birthDate) return null;
  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const m = now.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birthDate.getDate())) age -= 1;
  if (age < 0 || age > 120) return null;
  return age;
}

export async function getClientProfileForThread(
  threadId: string,
): Promise<ClientProfilePublic | null> {
  const thread = await prisma.deskThread.findUnique({
    where: { id: threadId },
    select: { id: true, analysisId: true, clientLabel: true },
  });
  if (!thread) return null;

  const analysis = await prisma.analysis.findUnique({
    where: { id: thread.analysisId },
    select: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          birthDate: true,
          city: true,
          state: true,
          about: true,
          avatarPath: true,
        },
      },
    },
  });

  const user = analysis?.user;
  if (!user) {
    return {
      userId: null,
      name: thread.clientLabel,
      email: null,
      age: null,
      birthDate: null,
      city: null,
      state: null,
      about: null,
      avatarUrl: null,
      hasAvatar: false,
    };
  }

  return {
    userId: user.id,
    name: user.name?.trim() || thread.clientLabel,
    email: user.email,
    age: ageFromBirthDate(user.birthDate),
    birthDate: user.birthDate
      ? user.birthDate.toISOString().slice(0, 10)
      : null,
    city: user.city,
    state: user.state,
    about: user.about,
    avatarUrl: user.avatarPath
      ? `/api-desk/chat/threads/${threadId}/client-avatar`
      : null,
    hasAvatar: Boolean(user.avatarPath),
  };
}

export async function getThreadAvatarPath(
  threadId: string,
): Promise<string | null> {
  const thread = await prisma.deskThread.findUnique({
    where: { id: threadId },
    select: { analysisId: true },
  });
  if (!thread) return null;
  const analysis = await prisma.analysis.findUnique({
    where: { id: thread.analysisId },
    select: { user: { select: { avatarPath: true } } },
  });
  return analysis?.user?.avatarPath ?? null;
}
