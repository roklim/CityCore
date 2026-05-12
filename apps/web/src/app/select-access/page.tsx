import { redirect } from "next/navigation";
import { AdminShell } from "../../components/admin-shell";
import { getWebSession } from "../../lib/v2-session";
import { AccessSelector } from "./access-selector";

export const metadata = {
  title: "Select Access",
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
      activeSection="global_admin"
      eyebrow="Access selection"
      title="Scegli quale superficie aprire"
      description="Un solo account puo avere piu scope. La decisione non viene piu hardcodata nel frontend: il token V2 attiva un access grant esplicito."
      routePath="/select-access"
      statusLabel="Access"
      asideTitle="Sessione corrente"
      asideText="Questa schermata evita scorciatoie implicite: l’utente sceglie un grant reale e il backend decide il redirect finale coerente con ruolo e scope."
    >
      <section className="section-header">
        <p className="section-label">Multi-accesso</p>
        <h2>{session.auth.user.name ?? session.auth.user.email}</h2>
        <p>
          Sono disponibili {session.auth.accesses.length} accessi attivi. Seleziona il grant da
          usare per questa sessione.
        </p>
      </section>

      <AccessSelector accesses={session.auth.accesses} sessionToken={session.token} />
    </AdminShell>
  );
}
