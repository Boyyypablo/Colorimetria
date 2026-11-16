import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

const statusLabel: Record<string, string> = {
  PENDING: "Em preparação",
  READY: "Pronta",
  NEEDS_REVIEW: "Em revisão",
  APPROVED: "Validada pela consultora",
};

const contextLabel: Record<string, string> = {
  casual: "Casual",
  trabalho: "Trabalho",
  noite: "Noite",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const analyses = await prisma.analysis.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { season: true, overrideSeason: true },
  });

  return (
    <main className="dash-leituras">
      <AppHeader />
      <section className="shell dash-leituras__shell">
        <div className="dash-leituras__head">
          <div>
            <p className="dash-leituras__eyebrow">Espaço pessoal</p>
            <h1 className="font-script dash-leituras__title">Minhas leituras</h1>
            <p className="dash-leituras__hello">
              Olá, {session.user.name || session.user.email}
            </p>
          </div>
          <Link href="/analyze" className="btn btn-primary dash-leituras__cta">
            Nova leitura
          </Link>
        </div>

        {analyses.length === 0 ? (
          <div className="dash-leituras__empty">
            Ainda não há leituras por aqui.{" "}
            <Link href="/analyze" className="underline">
              Envie sua primeira foto
            </Link>
            .
          </div>
        ) : (
          <ul className="dash-leituras__list">
            {analyses.map((a) => {
              const season = a.overrideSeason || a.season;
              return (
                <li key={a.id}>
                  <Link href={`/analyses/${a.id}`} className="dash-leituras__card">
                    <div>
                      <p className="dash-leituras__card-title font-script">
                        {season?.namePt || "Em preparação"}
                      </p>
                      <p className="dash-leituras__card-meta">
                        {new Date(a.createdAt).toLocaleString("pt-BR")} ·{" "}
                        {statusLabel[a.status] || a.status}
                        {a.consultantApproved
                          ? " · Validada pela consultora"
                          : ""}
                        {a.status === "PENDING"
                          ? " · em geral leva poucos minutos"
                          : ""}
                      </p>
                    </div>
                    <span className="dash-leituras__badge">
                      {contextLabel[a.context] || a.context}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
