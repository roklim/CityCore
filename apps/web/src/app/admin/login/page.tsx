import { redirect } from "next/navigation";
import { AdminShell } from "../../../components/admin-shell";
import { fetchPlatformApi } from "../../../lib/platform-api";
import { getWebSession } from "../../../lib/web-session";
import { AdminLoginForms } from "./auth-forms";

export const metadata = {
  title: "Accesso area operatori",
};

export default async function AdminLoginPage() {
  const session = await getWebSession();

  if (session) {
    redirect(session.auth.redirectTo || "/admin");
  }

  const bootstrapStatus = await fetchPlatformApi<{
    status: "ok";
    required: boolean;
    available: boolean;
    secretRequired?: boolean;
  }>("/api/v2/auth/bootstrap-status").catch(() => null);

  return (
    <AdminShell
      eyebrow="Accesso riservato"
      title="Accedi a CityCore"
      description="Entra con le credenziali ricevute per aprire le città e le attività che puoi gestire."
      navigationItems={[
        {
          href: "/",
          label: "Home pubblica",
          meta: "Scegli una città",
        },
        {
          href: "/admin/login",
          label: "Accesso operatori",
          meta: "Inserisci le credenziali",
          current: true,
        },
      ]}
      statusLabel="Area operatori"
      asideTitle="Dopo l'accesso"
      asideText="CityCore ti porterà automaticamente nell'area corretta per il tuo ruolo. Se hai più accessi, potrai scegliere quale usare."
    >
      <AdminLoginForms bootstrapStatus={bootstrapStatus} />
    </AdminShell>
  );
}
