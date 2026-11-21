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

  const [analyses, orphanPayments] = await Promise.all([
    prisma.analysis.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: { season: true, overrideSeason: true },
    }),
    prisma.paymentOrder.findMany({
      where: {
        userId: session.user.id,
        sku: "ANALYSIS",
        status: "PAID",
        analysisId: null,
      },
      orderBy: { paidAt: "desc" },
      take: 5,
    }),
  ]);

  return (
    <main className="dash-leituras">
      <div className="dash-leituras__top">
        <AppHeader />
      </div>
      <section className="shell dash-leituras__shell">
        <div className="dash-leituras__head">
          <div>
            <p className="dash-leituras__eyebrow">Espaço pessoal</p>
            <h1 className="font-script dash-leituras__title">Minhas cartelas</h1>
            <p className="dash-leituras__hello">
              Olá, {session.user.name || session.user.email}
            </p>
          </div>
          {analyses.length > 0 ? (
            <Link href="/analyze" className="btn btn-primary dash-leituras__cta">
              Nova cartela
            </Link>
          ) : null}
        </div>

        {orphanPayments.length > 0 ? (
          <div className="dash-leituras__orphan" role="status">
            <p className="dash-leituras__orphan-title">
              Você tem{" "}
              {orphanPayments.length === 1
                ? "1 análise paga"
                : `${orphanPayments.length} análises pagas`}{" "}
              aguardando foto
            </p>
            <p className="dash-leituras__orphan-text">
              O pagamento já foi confirmado. Envie a foto para consumir o
              crédito — não é preciso pagar de novo.
            </p>
            <ul className="dash-leituras__orphan-list">
              {orphanPayments.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/analyze?orderId=${o.id}`}
                    className="btn btn-primary"
                  >
                    Continuar análise
                    {o.paidAt
                      ? ` · paga em ${new Date(o.paidAt).toLocaleDateString("pt-BR")}`
                      : ""}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {analyses.length === 0 ? (
          <div className="dash-leituras__empty">
            <p className="dash-leituras__empty-kicker">Primeira cartela</p>
            <h2 className="dash-leituras__empty-title">
              Ainda não há cartelas por aqui.
            </h2>
            <p className="dash-leituras__empty-text">
              Envie uma foto com boa luz natural e receba sua cartela de cores
              com plano personalizado.
            </p>
            <Link href="/analyze" className="btn btn-primary dash-leituras__cta">
              Enviar minha foto
            </Link>
          </div>
        ) : (
          <ul className="dash-leituras__list">
            {analyses.map((a) => {
              const season = a.overrideSeason || a.season;
              return (
                <li key={a.id}>
                  <Link
                    href={`/analyses/${a.id}`}
                    className="dash-leituras__card"
                  >
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
