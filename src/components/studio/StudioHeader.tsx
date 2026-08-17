import Link from "next/link";
import type { ReactNode } from "react";
import { auth, signOut } from "@/lib/auth";

type Props = {
  /** Se ausente, não renderiza o link de voltar. */
  backHref?: string;
  backLabel?: string;
  title?: string;
  /** Conteúdo extra à esquerda do usuário — ex.: pill de status. */
  rightSlot?: ReactNode;
};

/** Cabeçalho sticky do estúdio (nova análise / resultado), estilo Figma. */
export async function StudioHeader({
  backHref,
  backLabel = "Início",
  title,
  rightSlot,
}: Props) {
  const session = await auth();
  const displayName = session?.user?.name || session?.user?.email || "";

  return (
    <header className="studio-header">
      <div className="studio-header__left">
        {backHref && (
          <Link href={backHref} className="studio-header__back">
            ← {backLabel}
          </Link>
        )}
        <span
          className={`studio-header__title ${backHref ? "" : "studio-header__title--alone"}`}
        >
          {title || "Glowing"}
        </span>
      </div>

      <div className="studio-header__right">
        {rightSlot}
        {session?.user && (
          <>
            <div className="studio-header__avatar" aria-hidden>
              {displayName.charAt(0).toUpperCase() || "?"}
            </div>
            <span className="studio-header__name">{displayName}</span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button type="submit" className="studio-header__signout">
                Sair
              </button>
            </form>
          </>
        )}
      </div>
    </header>
  );
}
