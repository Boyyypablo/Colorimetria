import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { GlowingLogo } from "@/components/GlowingLogo";

export async function AppHeader() {
  const session = await auth();
  const isStaff =
    session?.user?.role === "CONSULTANT" || session?.user?.role === "ADMIN";

  return (
    <header className="shell flex items-center justify-between gap-4 py-4">
      <Link href="/" className="shrink-0">
        <GlowingLogo size="sm" bg="light" />
      </Link>
      <nav className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-sm">
        {session ? (
          <>
            <Link href="/dashboard" className="opacity-80 hover:opacity-100">
              Minhas cartelas
            </Link>
            <Link href="/conta" className="opacity-80 hover:opacity-100">
              Meu perfil
            </Link>
            <Link href="/analyze" className="opacity-80 hover:opacity-100">
              Nova cartela
            </Link>
            {isStaff && (
              <Link href="/consultant" className="opacity-80 hover:opacity-100">
                Desk
              </Link>
            )}
            {session.user.role === "ADMIN" && (
              <Link href="/admin/ml" className="opacity-80 hover:opacity-100">
                ML
              </Link>
            )}
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button type="submit" className="btn btn-ghost text-sm">
                Sair
              </button>
            </form>
          </>
        ) : (
          <>
            <Link href="/login" className="btn btn-ghost text-sm">
              Entrar
            </Link>
            <Link href="/register" className="btn btn-primary text-sm">
              Criar conta
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
