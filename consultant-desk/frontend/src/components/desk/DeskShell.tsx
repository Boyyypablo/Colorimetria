import type { ReactNode } from "react";

type DeskShellProps = {
  sidebar: ReactNode;
  pane: ReactNode;
  /** Mobile: show only pane (hide sidebar). */
  mobilePaneOnly?: boolean;
};

export function DeskShell({ sidebar, pane, mobilePaneOnly }: DeskShellProps) {
  return (
    <div
      className={
        mobilePaneOnly
          ? "desk-workspace desk-workspace--pane-only"
          : "desk-workspace"
      }
    >
      <aside className="desk-sidebar" aria-label="Conversas">
        {sidebar}
      </aside>
      <main className="desk-pane" aria-label="Conversa">
        {pane}
      </main>
    </div>
  );
}
