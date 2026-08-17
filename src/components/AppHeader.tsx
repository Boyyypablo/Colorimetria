import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { GlowingLogo } from "@/components/GlowingLogo";

export async function AppHeader() {
  const session = await auth();
  const isStaff =
    session?.user?.role === "CONSULTANT" || session?.user?.role === "ADMIN";

  return (
    <header className="shell flex items-center justify-between py-5">
      <Link href="/" className="shrink-0">
        <GlowingLogo size="sm" bg="light" />
      </Link>
      <nav className="flex items-center gap-3 text-sm">
        {session ? (
          <>
            <Link href="/dashboard" className="opacity-80 hover:opacity-100">
              Minhas análises
            </Link>
            <Link href="/analyze" className="opacity-80 hover:opacity-100">
              Nova análise
            </Link>
            {isStaff && (
              <Link href="/consultant" className="opacity-80 hover:opacity-100">
                Consultora
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
