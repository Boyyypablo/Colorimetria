import { notFound, redirect } from "next/navigation";
import { StudioHeader } from "@/components/studio/StudioHeader";
import { AnalysisResultView } from "@/components/analysis/AnalysisResultView";
import { auth } from "@/lib/auth";
import { buildAnalysisResultViewProps } from "@/lib/analysis/result-view-data";
import { prisma } from "@/lib/db/prisma";

type Params = { params: Promise<{ id: string }> };

const statusLabelStaff: Record<string, string> = {
  PENDING: "Processando",
  READY: "Pronto (sem revisão)",
  NEEDS_REVIEW: "Em revisão",
  APPROVED: "Validado pela equipe",
};

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  PENDING: { color: "#b8a040", bg: "#fdf8e8" },
  READY: { color: "var(--lp-sage)", bg: "#eff4f1" },
  NEEDS_REVIEW: { color: "var(--lp-terracotta)", bg: "#fdf0eb" },
  APPROVED: { color: "var(--lp-sage)", bg: "#eff4f1" },
};

export default async function ConsultantReviewPage({ params }: Params) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "CONSULTANT" && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const { id } = await params;
  const analysis = await prisma.analysis.findUnique({
    where: { id },
    include: {
      season: true,
      overrideSeason: true,
      user: { select: { name: true, email: true } },
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

  const seasons = await prisma.seasonPalette.findMany({
    select: { id: true, namePt: true },
    orderBy: { namePt: "asc" },
  });

  const viewProps = buildAnalysisResultViewProps({
    analysis,
    isOwner: false,
    mode: "staff",
    seasons,
  });

  const statusStyle = STATUS_STYLE[analysis.status] ?? STATUS_STYLE.PENDING;
  const clientName = analysis.user.name || analysis.user.email;

  return (
    <main className="studio">
      <StudioHeader
        backHref="/consultant"
        backLabel="Fila de validação"
        title={`Validar · ${clientName}`}
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
              {statusLabelStaff[analysis.status]}
            </span>
          </div>
        }
      />
      <AnalysisResultView {...viewProps} />
    </main>
  );
}
