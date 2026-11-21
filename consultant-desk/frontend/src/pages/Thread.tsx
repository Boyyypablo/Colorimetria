import { useCallback, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { ConversationList } from "../components/desk/ConversationList";
import { DeskShell } from "../components/desk/DeskShell";
import { ThreadPane } from "../components/desk/ThreadPane";
import { TransferDialog } from "../components/desk/TransferDialog";
import { parseDeskFilter, type DeskFilterId } from "../lib/desk-format";
import { useInboxData } from "../lib/use-inbox-data";
import { useIsDesktopDesk } from "../lib/use-media-query";

function filterToQuery(filter: DeskFilterId): string {
  return filter === "active" ? "" : `?filter=${encodeURIComponent(filter)}`;
}

export function ThreadPage() {
  const { threadId = "" } = useParams();
  const isDesktop = useIsDesktopDesk();
  const [params, setParams] = useSearchParams();
  const filter = parseDeskFilter(params.get("filter"));
  const filterQuery = filterToQuery(filter);
  const inbox = useInboxData(filter);
  const [transferFor, setTransferFor] = useState<string | null>(null);

  const setFilter = useCallback(
    (id: DeskFilterId) => {
      const next = new URLSearchParams(params);
      if (id === "active") next.delete("filter");
      else next.set("filter", id);
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  const { refresh } = inbox;
  const onMeta = useCallback(() => {
    void refresh();
  }, [refresh]);

  const list = (
    <ConversationList
      filter={filter}
      onFilterChange={setFilter}
      filterQuery={filterQuery}
      threads={inbox.threads}
      activeThreadId={threadId}
      unreadCount={inbox.unreadCount}
      note={inbox.note}
      error={inbox.error}
      busyId={inbox.busyId}
      onArchive={(id, archived) => void inbox.toggleArchive(id, archived)}
      onTransfer={setTransferFor}
    />
  );

  const pane = threadId ? (
    <ThreadPane
      threadId={threadId}
      filterQuery={filterQuery}
      showBackLink={!isDesktop}
      peers={inbox.peers}
      onThreadMetaChange={onMeta}
    />
  ) : null;

  return (
    <>
      {isDesktop ? (
        <DeskShell sidebar={list} pane={pane} />
      ) : (
        <DeskShell sidebar={list} pane={pane} mobilePaneOnly />
      )}

      {transferFor ? (
        <TransferDialog
          peers={inbox.peers}
          onClose={() => setTransferFor(null)}
          onConfirm={async (to, note) => {
            await inbox.transfer(transferFor, to, note);
          }}
        />
      ) : null}
    </>
  );
}
