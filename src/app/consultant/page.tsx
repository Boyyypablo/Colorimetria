import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

const statusLabel: Record<string, string> = {
  PENDING: "Processando",
  READY: "Pronto (sem revisão)",
  NEEDS_REVIEW: "Em revisão",
  APPROVED: "Validado pela equipe",
};

export default async function ConsultantPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "CONSULTANT" && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const queue = await prisma.analysis.findMany({
    where: { status: { in: ["NEEDS_REVIEW", "READY"] } },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    include: {
      user: { select: { name: true, email: true } },
      season: true,
      overrideSeason: true,
    },
    take: 50,
  });

  return (
    <main>
      <AppHeader />
      <section className="shell space-y-6 py-8">
        <div>
          <h1 className="font-display text-3xl">Fila de validação</h1>
          <p className="mt-1 text-[var(--muted)]">
            Análises geradas pelo sistema. Priorize as que estão em revisão;
            valide a leitura, ajuste a estação se preciso e aprove o relatório.
          </p>
        </div>

        {queue.length === 0 ? (
          <div className="card text-[var(--muted)]">Fila vazia no momento.</div>
        ) : (
          <ul className="grid gap-3">
            {queue.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/consultant/reviews/${item.id}`}
                  className="card flex flex-wrap items-center justify-between gap-3 hover:border-[var(--accent)]"
                >
                  <div>
                    <p className="font-medium">
                      {item.user.name || item.user.email} ·{" "}
                      {item.overrideSeason?.namePt ||
                        item.season?.namePt ||
                        "Sem estação"}
                    </p>
                    <p className="text-sm text-[var(--muted)]">
                      {statusLabel[item.status] || item.status} · confiança{" "}
                      {item.confidence != null
                        ? `${Math.round(item.confidence * 100)}%`
                        : "—"}{" "}
                      · {new Date(item.createdAt).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <span className="badge">Validar</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
