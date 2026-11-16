export type ChatRole = "client" | "consultant" | "system";

export type ChatAttachment = {
  id: string;
  kind: "image" | "document";
  name: string;
  mime: string;
  size: number;
  /** Data URL ou URL relativa. */
  url: string;
};

export type ChatMessage = {
  id: string;
  threadId: string;
  role: ChatRole;
  body: string;
  createdAt: string;
  attachments?: ChatAttachment[];
  externalLinks?: string[];
};

export type ChatThread = {
  id: string;
  analysisId: string;
  reviewId: string;
  clientLabel: string;
  status: "open" | "waiting" | "closed";
  lastMessageAt: string | null;
  unreadForConsultant: number;
  assignedConsultantId: string | null;
  assignedConsultantName: string | null;
  archivedAt: string | null;
};

export type ThreadListFilter = "active" | "unread" | "answered" | "archived" | "all";

export type PendingReview = {
  id: string;
  analysisId: string;
  threadId: string;
  clientLabel: string;
  seasonName: string | null;
  status: "pending" | "report_sent" | "closed";
  autoReport: {
    summary: string;
    seasonName: string | null;
    tips: string[];
  };
  createdAt: string;
  reportSentAt: string | null;
  assignedConsultantId: string | null;
};
