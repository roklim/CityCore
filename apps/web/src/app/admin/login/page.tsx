import { redirect } from "next/navigation";
import { AdminShell } from "../../../components/admin-shell";
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
          Se non esiste ancora un <code>global_admin</code>, usa il bootstrap una sola volta.
          Altrimenti entra con le credenziali già presenti nella piattaforma.
        </p>
      </section>

      <AdminLoginForms />
    </AdminShell>
  );
}
