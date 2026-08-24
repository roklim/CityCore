import { redirect } from "next/navigation";
import { AdminShell } from "../../components/admin-shell";
import { AdminSubmitButton } from "../../components/admin-submit-button";
import { adminRoleLabel } from "../../lib/admin-labels";
import { getWebSession } from "../../lib/web-session";
import { logoutAction } from "../admin/actions";
import { AccessSelector } from "./access-selector";

export const metadata = {
  title: "Scelta accesso operatori",
  robots: { index: false, follow: false },
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
      eyebrow="Accesso operativo"
      title="Scegli l'area da gestire"
      description="Il tuo account può operare in più ambiti. Scegli il ruolo e il contesto con cui vuoi continuare."
      navigationItems={[
        { href: "/", label: "Home pubblica", meta: "Scegli una città" },
        {
          href: session.auth.redirectTo || "/admin",
          label: "Area corrente",
          meta: adminRoleLabel(session.auth.activeAccess.role),
        },
        {
          href: "/select-access",
          label: "Cambia accesso",
          meta: "Scegli ruolo e ambito",
          current: true,
        },
      ]}
      statusLabel={adminRoleLabel(session.auth.activeAccess.role)}
      asideTitle="Sessione corrente"
      asideText="La scelta determina quali città o attività puoi consultare e gestire in questa sessione."
      headerActions={
        <form action={logoutAction} className="operator-session-form">
          <AdminSubmitButton className="ghost-button" pendingLabel="Uscita…">
            Esci
          </AdminSubmitButton>
        </form>
      }
    >
      <section className="section-header">
        <p className="section-label">Accessi disponibili</p>
        <h2>{session.auth.user.name ?? session.auth.user.email}</h2>
        <p>
          Hai {session.auth.accesses.length} accessi attivi. Quello attualmente in uso è già
          selezionato.
        </p>
      </section>

      <AccessSelector
        accesses={session.auth.accesses}
        currentAccessId={session.auth.activeAccess.id}
      />
    </AdminShell>
  );
}
