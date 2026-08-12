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
      eyebrow="Area operatori"
      title="Accedi all'area operatori"
      description="Questa superficie è riservata agli operatori autorizzati della piattaforma CityCore."
      navigationItems={[
        {
          href: "/",
          label: "Home pubblica",
          meta: "Scegli una città",
        },
        {
          href: "/admin/login",
          label: "Accesso operatori",
          meta: "Login sicuro",
          current: true,
        },
      ]}
      statusLabel="Area operatori"
      asideTitle="Scope attivo"
      asideText="L'accesso usa sessioni web reali, permessi espliciti e destinazioni coerenti con ruolo e ambito operativo."
    >
      <section className="section-header">
        <p className="section-label">Accesso</p>
        <h2>Entra nella console collegata alla piattaforma attiva</h2>
        <p>
          Usa le credenziali ricevute dall&apos;amministratore. La creazione del primo account viene
          mostrata solo quando la piattaforma ne ha realmente bisogno.
        </p>
      </section>

      <AdminLoginForms bootstrapStatus={bootstrapStatus} />
    </AdminShell>
  );
}
