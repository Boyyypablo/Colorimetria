import { deskFetch } from "./api";

export type ThreadListFilter =
  | "active"
  | "unread"
  | "answered"
  | "archived"
  | "all";

export type ThreadSummary = {
  id: string;
  analysisId: string;
  reviewId: string;
  clientLabel: string;
  status: string;
  unreadForConsultant: number;
  lastMessageAt: string | null;
  assignedConsultantId: string | null;
  assignedConsultantName: string | null;
  archivedAt: string | null;
};

export type ClientProfile = {
  userId: string | null;
  name: string;
  email: string | null;
  age: number | null;
  birthDate: string | null;
  city: string | null;
  state: string | null;
  about: string | null;
  avatarUrl: string | null;
  hasAvatar: boolean;
};

export type PendingReviewItem = {
  id: string;
  analysisId: string;
  threadId: string;
  clientLabel: string;
  seasonName: string | null;
  status: "pending" | "report_sent" | "closed";
  createdAt: string;
  reportSentAt: string | null;
  label: string;
  assignedConsultantId?: string | null;
};

export type ChatAttachment = {
  id: string;
  kind: "image" | "document";
  name: string;
  mime: string;
  size: number;
  url: string;
};

export type ChatMessage = {
  id: string;
  threadId: string;
  role: "client" | "consultant" | "system";
  body: string;
  createdAt: string;
  attachments?: ChatAttachment[];
  externalLinks?: string[];
};

export type DeskPeer = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
};

export function listThreads(filter: ThreadListFilter = "active") {
  const q = `?filter=${encodeURIComponent(filter)}`;
  return deskFetch<{ threads: ThreadSummary[]; filter: ThreadListFilter }>(
    `/chat/threads${q}`,
  );
}

export function listPendingReviews() {
  return deskFetch<{ items: PendingReviewItem[] }>("/reviews");
}

export function intakeReview(payload?: {
  clientLabel?: string;
  seasonName?: string | null;
}) {
  return deskFetch<{ review: PendingReviewItem & { autoReport?: unknown } }>(
    "/reviews/intake",
    { method: "POST", body: JSON.stringify(payload || {}) },
  );
}

export function sendAutoReport(reviewId: string) {
  return deskFetch<{ ok: boolean }>(`/reviews/${reviewId}/send-report`, {
    method: "POST",
    body: "{}",
  });
}

export function getMessages(threadId: string, after?: string) {
  const q = after ? `?after=${encodeURIComponent(after)}` : "";
  return deskFetch<{
    messages: ChatMessage[];
    thread?: ThreadSummary;
    clientProfile?: ClientProfile | null;
  }>(`/chat/threads/${threadId}/messages${q}`);
}

export function postMessage(
  threadId: string,
  body: string,
  attachments?: Array<{
    kind: "image" | "document";
    name: string;
    mime: string;
    dataUrl: string;
  }>,
) {
  return deskFetch<{ message: ChatMessage }>(
    `/chat/threads/${threadId}/messages`,
    {
      method: "POST",
      body: JSON.stringify({ body, attachments }),
    },
  );
}

export function archiveThread(threadId: string) {
  return deskFetch<{ thread: ThreadSummary; ok: boolean }>(
    `/chat/threads/${threadId}/archive`,
    { method: "POST", body: "{}" },
  );
}

export function unarchiveThread(threadId: string) {
  return deskFetch<{ thread: ThreadSummary; ok: boolean }>(
    `/chat/threads/${threadId}/unarchive`,
    { method: "POST", body: "{}" },
  );
}

export function transferThread(
  threadId: string,
  toConsultantId: string,
  note?: string,
) {
  return deskFetch<{ thread: ThreadSummary; ok: boolean }>(
    `/chat/threads/${threadId}/transfer`,
    {
      method: "POST",
      body: JSON.stringify({ toConsultantId, note }),
    },
  );
}

export function listPeerConsultants() {
  return deskFetch<{ consultants: DeskPeer[] }>("/auth/consultants");
}

export function openThreadStream(threadId: string): EventSource {
  const base = import.meta.env.VITE_DESK_API_BASE || "/api-desk";
  return new EventSource(`${base}/chat/threads/${threadId}/stream`, {
    withCredentials: true,
  });
}
