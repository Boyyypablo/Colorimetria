import { notFound, redirect } from "next/navigation";
import { StudioHeader } from "@/components/studio/StudioHeader";
import { AnalysisResultView } from "@/components/analysis/AnalysisResultView";
import { AnalysisLockedGate } from "@/components/analysis/AnalysisLockedGate";
import { auth } from "@/lib/auth";
import { buildAnalysisResultViewProps } from "@/lib/analysis/result-view-data";
import { prisma } from "@/lib/db/prisma";
import { resolveAnalysisAccess } from "@/lib/payments/access";
import { publicPaymentsConfig } from "@/lib/payments/config";

type Params = { params: Promise<{ id: string }> };

const statusLabelUser: Record<string, string> = {
  PENDING: "Processando",
  READY: "Pronto",
  NEEDS_REVIEW: "Em revisão",
  APPROVED: "Aprovado",
};

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  PENDING: { color: "#b8a040", bg: "#fdf8e8" },
  READY: { color: "var(--lp-sage)", bg: "#eff4f1" },
  NEEDS_REVIEW: { color: "var(--lp-terracotta)", bg: "#fdf0eb" },
  APPROVED: { color: "var(--lp-sage)", bg: "#eff4f1" },
  LOCKED: { color: "var(--lp-terracotta)", bg: "#fdf0eb" },
};

export default async function AnalysisPage({ params }: Params) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const analysis = await prisma.analysis.findUnique({
    where: { id },
    include: {
      season: true,
      overrideSeason: true,
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { reviewer: { select: { name: true } } },
      },
      feedbackEvents: {
        orderBy: { createdAt: "asc" },
        select: { target: true, kind: true },
      },
    },
  });

  if (!analysis) notFound();

  const isOwner = analysis.userId === session.user.id;
  const isStaff =
    session.user.role === "CONSULTANT" || session.user.role === "ADMIN";

  // Equipe valida em página separada — não na mesma do resultado da usuária.
  if (isStaff && !isOwner) {
    redirect(`/consultant/reviews/${id}`);
  }
  if (!isOwner) redirect("/dashboard");

  const access = await resolveAnalysisAccess({
    analysisId: analysis.id,
    userId: analysis.userId,
    photoQuality: analysis.photoQuality,
  });

  if (access.state !== "unlocked") {
    const paymentsCfg = publicPaymentsConfig();
    const quality = analysis.photoQuality as {
      failedTips?: string[];
    } | null;
    const lockedLabel =
      access.state === "needs_retake"
        ? "Ajustar foto"
        : "Aguardando liberação";

    return (
      <main className="studio">
        <StudioHeader
          backHref="/dashboard"
          backLabel="Minhas cartelas"
          title="Sua leitura"
          rightSlot={
            <div
              className="studio-header__status"
              style={{ background: STATUS_STYLE.LOCKED.bg }}
            >
              <span
                className="studio-header__status-dot"
                style={{ background: STATUS_STYLE.LOCKED.color }}
              />
              <span
                className="studio-header__status-label"
                style={{ color: STATUS_STYLE.LOCKED.color }}
              >
                {lockedLabel}
              </span>
            </div>
          }
        />
        <AnalysisLockedGate
          analysisId={analysis.id}
          photoUrl={`/api/uploads/${analysis.imagePath}`}
          mode={access.state}
          failedTips={quality?.failedTips || []}
          priceLabel={paymentsCfg.analysisPriceLabel}
        />
      </main>
    );
  }

  const viewProps = buildAnalysisResultViewProps({
    analysis,
    isOwner: true,
    mode: "user",
  });

  const statusStyle = STATUS_STYLE[analysis.status] ?? STATUS_STYLE.PENDING;

  return (
    <main className="studio">
      <StudioHeader
        backHref="/dashboard"
        backLabel="Minhas cartelas"
        title="Sua leitura"
        rightSlot={
          <div className="studio-header__status" style={{ background: statusStyle.bg }}>
            <span
              className="studio-header__status-dot"
              style={{ background: statusStyle.color }}
            />
            <span
              className="studio-header__status-label"
              style={{ color: statusStyle.color }}
            >
              {statusLabelUser[analysis.status]}
            </span>
          </div>
        }
      />
      {!access.paymentsOn ? (
        <div className="shell pt-4">
          <p className="pay-beta-note">
            Acesso beta gratuito · durante os testes, a liberação da cartela e
            da revisão está aberta sem cobrança.
          </p>
        </div>
      ) : null}
      <AnalysisResultView {...viewProps} />
    </main>
  );
}
