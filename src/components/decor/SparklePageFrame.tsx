"use client";

import { usePathname } from "next/navigation";
import { SparkleDecor } from "@/components/decor/SparkleDecor";

/** Sparkles em todas as rotas, exceto a página inicial (`/`). */
export function SparklePageFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hide = pathname === "/";

  if (hide) return <>{children}</>;

  return (
    <div className="sparkle-stage sparkle-stage--app">
      {children}
      {/* depois do conteúdo + fixed: fica visível sobre fundos opacos */}
      <SparkleDecor tone="cream" />
    </div>
  );
}
