import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { auth } from "@/lib/auth";
import { paymentsEnabled } from "@/lib/payments/config";
import { listUserPaymentHistory } from "@/lib/payments/orders";
import { PaymentHistorySection } from "@/components/payments/PaymentHistorySection";
import { ContaForm } from "./ContaForm";

export default async function ContaPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orders = await listUserPaymentHistory(session.user.id);

  return (
    <main>
      <AppHeader />
      <section className="shell space-y-6 py-8">
        <div className="card mx-auto w-full max-w-lg space-y-5">
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
              Sua conta
            </p>
            <h1 className="font-display text-3xl">Meu perfil</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              A consultora vê nome, idade, cidade e o que você busca — nunca a
              senha.
            </p>
          </div>
          <ContaForm />
        </div>

        <PaymentHistorySection
          orders={orders}
          paymentsOn={paymentsEnabled()}
        />
      </section>
    </main>
  );
}
