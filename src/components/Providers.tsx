"use client";

import { SessionProvider } from "next-auth/react";
import { SparklePageFrame } from "@/components/decor/SparklePageFrame";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SparklePageFrame>{children}</SparklePageFrame>
    </SessionProvider>
  );
}
