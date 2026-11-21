import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  archiveThread,
  listPeerConsultants,
  listThreads,
  transferThread,
  unarchiveThread,
  type DeskPeer,
  type ThreadSummary,
} from "./chat-client";
import type { DeskFilterId } from "./desk-format";
import { playSoftChime } from "./notify-chime";

export function useInboxData(filter: DeskFilterId) {
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [peers, setPeers] = useState<DeskPeer[]>([]);
  const [note, setNote] = useState("Carregando…");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const inboxReady = useRef(false);
  const prevUnread = useRef(0);

  const refresh = useCallback(async () => {
    try {
      const [inbox, peerList] = await Promise.all([
        listThreads(filter),
        listPeerConsultants().catch(() => ({ consultants: [] as DeskPeer[] })),
      ]);
      const unread = inbox.threads.reduce(
        (sum, thread) => sum + thread.unreadForConsultant,
        0,
      );
      if (inboxReady.current && unread > prevUnread.current) playSoftChime();
      inboxReady.current = true;
      prevUnread.current = unread;
      startTransition(() => {
        setThreads(inbox.threads);
        setPeers(peerList.consultants);
        setNote(
          inbox.threads.length === 0
            ? filter === "archived"
              ? "Nenhuma conversa arquivada."
              : "Nenhuma conversa neste filtro."
            : "",
        );
        setError("");
      });
    } catch {
      setNote("");
      setError(
        "Backend offline. Confirme npm run dev em consultant-desk/backend.",
      );
    }
  }, [filter]);

  useEffect(() => {
    inboxReady.current = false;
    void refresh();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 6000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const unreadCount = useMemo(
    () => threads.filter((t) => t.unreadForConsultant > 0).length,
    [threads],
  );

  async function toggleArchive(threadId: string, archived: boolean) {
    setBusyId(`arch-${threadId}`);
    try {
      if (archived) await unarchiveThread(threadId);
      else await archiveThread(threadId);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao arquivar.");
    } finally {
      setBusyId(null);
    }
  }

  async function transfer(
    threadId: string,
    toConsultantId: string,
    noteText?: string,
  ) {
    setBusyId(`xfer-${threadId}`);
    try {
      await transferThread(threadId, toConsultantId, noteText);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao encaminhar.");
      throw e;
    } finally {
      setBusyId(null);
    }
  }

  return {
    threads,
    peers,
    note,
    busyId,
    error,
    setError,
    unreadCount,
    refresh,
    toggleArchive,
    transfer,
  };
}
