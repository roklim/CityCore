import { redirect } from "next/navigation";
import { AdminShell } from "../../components/admin-shell";
import { AdminSubmitButton } from "../../components/admin-submit-button";
import { adminRoleLabel } from "../../lib/admin-labels";
import { getWebSession } from "../../lib/web-session";
import { logoutAction } from "../admin/actions";
import { AccessSelector } from "./access-selector";

export const metadata = {
  title: "Scelta accesso operatori",
};

export default async function SelectAccessPage() {
  const session = await getWebSession();

  if (!session) {
    redirect("/admin/login");
  }

  if (session.auth.accesses.length <= 1) {
    redirect(session.auth.redirectTo || "/admin");
  }

  return (
    <AdminShell
      brandHref={session.auth.redirectTo || "/admin"}
      breadcrumbs={[
        { href: session.auth.redirectTo || "/admin", label: "Dashboard" },
        { label: "Cambia accesso" },
      ]}
      eyebrow="Area operatori"
      title="Scegli la superficie da aprire"
      description="Il tuo account dispone di più scope operativi. Seleziona il permesso con cui proseguire."
      navigationItems={[
        { href: "/", label: "Home pubblica", meta: "Scegli una città" },
        {
          href: session.auth.redirectTo || "/admin",
          label: "Scope corrente",
          meta: adminRoleLabel(session.auth.activeAccess.role),
        },
        {
          href: "/select-access",
          label: "Cambia accesso",
          meta: "Scegli ruolo e attività",
          current: true,
        },
      ]}
      statusLabel="Area operatori"
      asideTitle="Sessione corrente"
      asideText="Scegli un accesso reale: la piattaforma aprirà la destinazione coerente con ruolo e ambito operativo."
      headerActions={
        <form action={logoutAction} className="operator-session-form">
          <AdminSubmitButton className="ghost-button" pendingLabel="Uscita…">
            Esci
          </AdminSubmitButton>
        </form>
      }
    >
      <section className="section-header">
        <p className="section-label">Multi-accesso</p>
        <h2>{session.auth.user.name ?? session.auth.user.email}</h2>
        <p>
          Sono disponibili {session.auth.accesses.length} accessi attivi. Seleziona quello da usare
          per questa sessione.
        </p>
      </section>

      <AccessSelector accesses={session.auth.accesses} />
    </AdminShell>
  );
}
