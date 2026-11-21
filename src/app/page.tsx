import { LandingHome } from "@/components/landing/LandingHome";
import { LandingSignOut } from "@/components/landing/LandingSignOut";
import { auth } from "@/lib/auth";
import { publicPaymentsConfig } from "@/lib/payments/config";

export default async function HomePage() {
  const session = await auth();
  const loggedIn = Boolean(session?.user);
  const paymentsConfig = publicPaymentsConfig();

  return (
    <main>
      <LandingHome
        loggedIn={loggedIn}
        paymentsConfig={paymentsConfig}
        signOutSlot={loggedIn ? <LandingSignOut /> : undefined}
      />
    </main>
  );
}
