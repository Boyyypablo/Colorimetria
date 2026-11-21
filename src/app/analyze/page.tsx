import { Suspense } from "react";
import { redirect } from "next/navigation";
import { StudioHeader } from "@/components/studio/StudioHeader";
import { AnalyzeForm } from "@/components/AnalyzeForm";
import { auth } from "@/lib/auth";

export default async function AnalyzePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <main className="studio">
      <StudioHeader
        backHref="/dashboard"
        backLabel="Minhas cartelas"
        title="Nova cartela"
      />
      <Suspense fallback={<p className="af-submit__hint">Carregando formulário…</p>}>
        <AnalyzeForm />
      </Suspense>
    </main>
  );
}
